import { name } from '../package.json'
import { BARRAGERCLASS, eventEntrust, getContainer, initCSS, LAYERCLASS } from './helper'
import { ResizeObserver } from 'resize-observer'
import debounce from 'debounce'
import { nanoid } from 'nanoid'

const GAP = '16px'

/**
 * 初始化弹幕容器元素
 */
type ElType = string | HTMLElement

/**
 * 弹幕容器
 */
type ContainerType = HTMLElement

type TrackStatus = 'running' | 'idle'

type BarragerType = {
  DOMString: string
  container: HTMLElement
  options: BarragerOptions
  trackIndex: number
  id: string
  status: 'hide' | 'show'
}

/**
 * 弹幕配置
 */
export type BarragerOptions = {
  trackHeight?: number
  tractArray?: { speed: number }[]
  pauseOnHover?: boolean
  pauseOnClick?: boolean
  onStart?: () => void
  onEnd?: () => void
  duration?: string
  speed?: number
}

function log(msg: string) {
  return `[${name}]: ${msg}`
}

// 基础配置
const defaultOptions: BarragerOptions = {
  trackHeight: 50,
  pauseOnHover: false,
  pauseOnClick: false,
  onStart: null,
  onEnd: null,
  duration: '10s',
  tractArray: [{ speed: 100 }],
  speed: 100,
}

export class Barrager {
  el: ElType
  /**
   * 弹幕容器
   */
  container: ContainerType
  containerRect: DOMRect
  /**
   * 弹幕配置
   */
  options: BarragerOptions
  /**
   * 弹幕轨道
   */
  tracks: TrackStatus[]
  /**
   * 弹幕临时容器层
   */
  private layer: HTMLElement = null
  /**
   * 弹幕存储器
   */
  barragerArray: BarragerType[][]
  /**
   * 全部暂停
   */
  isAllPaused: boolean
  /**
   * 用户输入的弹幕
   */
  userBarragers: {
    DOMString: string
    options: BarragerOptions
  }[] = []
  /**
   * 暂停队列
   */
  pauseArray: HTMLElement[] = []

  constructor(el: ElType, options: BarragerOptions = {}) {
    this.el = el
    if (typeof el === 'string') {
      this.el = el.startsWith('.') ? el : `.${el}`
    }

    this.options = {
      ...defaultOptions,
      ...options,
    }

    this.initContainer()
    this.initOptions()
    this.initLayer()
    this.addExtraEvent()
    this.bindResize()
  }

  initContainer() {
    if (typeof this.el === 'string') {
      this.container = document.querySelector(this.el)
      if (!this.container) {
        throw new Error(log(`${this.el} not exist`))
      }
    } else if (this.el instanceof HTMLElement) {
      this.container = this.el
    } else {
      throw new Error(log(`must pass element (the first argument)`))
    }
  }

  setContainerRect() {
    this.containerRect = this.container.getBoundingClientRect()
  }

  initOptions() {
    const { trackHeight } = this.options
    this.setContainerRect()
    const trackCount = trackHeight ? Math.floor(this.containerRect.height / trackHeight) : this.containerRect.height
    this.tracks = new Array<TrackStatus>(trackCount).fill('idle')
    this.barragerArray = new Array(trackCount).fill([])

    const { position } = getComputedStyle(this.container)
    if (position === 'static') {
      this.container.style.position = 'relative'
      this.container.style.overflow = 'hidden'
    }
    initCSS()
  }

  private initLayer() {
    this.layer = document.createElement('div')
    this.layer.classList.add(LAYERCLASS)
    document.body.appendChild(this.layer)
  }

  private bindResize() {
    const obCallback: ResizeObserverCallback = (entries) => {
      this.containerRect = entries[0].target.getBoundingClientRect()
    }

    const ro = new ResizeObserver(debounce(obCallback, 200))
    ro.observe(this.container)
  }

  push(barragerDOM: string, opts: BarragerOptions = {}, priority: 'high' | 'normal' = 'normal') {
    const options = {
      ...this.options,
      ...opts,
    }

    const idleTrackIndex = this.getIdleTrackIndex()

    if (idleTrackIndex === -1) {
      if (priority === 'high') {
        this.userBarragers.push({ DOMString: barragerDOM, options })
      }
    } else {
      const barragerContainer = this.getBarragerItem(barragerDOM, options, idleTrackIndex)

      const id = nanoid()

      barragerContainer.dataset.id = id

      const currentBarrager = {
        container: barragerContainer,
        trackIndex: idleTrackIndex,
        DOMString: barragerDOM,
        options,
        id,
        status: 'hide',
      } as BarragerType

      this.listenTrackAvailable(currentBarrager, this.container)

      if (this.barragerArray[idleTrackIndex].length) {
        this.barragerArray[idleTrackIndex].push(currentBarrager)
      } else {
        this.barragerArray[idleTrackIndex] = [currentBarrager]
      }
      this.render(currentBarrager, idleTrackIndex)
      this.addEvent(currentBarrager, idleTrackIndex, options)
      return currentBarrager
    }
    return null
  }

  private listenTrackAvailable(barrager: BarragerType, container: HTMLElement) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const t = this.barragerArray[barrager.trackIndex]
          if (t[t.length - 1].id === barrager.id) {
            this.tracks[barrager.trackIndex] = 'idle'
          }
          barrager.status = 'show'
          io.disconnect()
        } else {
          barrager.status = 'hide'
        }
      },
      {
        root: container,
        threshold: 1,
        rootMargin: `0px -${GAP} 0px 0px`,
      }
    )

    io.observe(barrager.container)
  }

  computeDuration(options: BarragerOptions, idleTrackIndex: number, left: number) {
    let duration = 0
    const speed = options.tractArray?.[idleTrackIndex]?.speed || options.speed

    if (speed) {
      duration = left / speed
    } else {
      duration = +options.duration.slice(0, -1)
    }

    return duration
  }

  private getBarragerItem(barragerDOM: string, options: BarragerOptions, idleTrackIndex: number) {
    const bc = getContainer()

    bc.innerHTML = barragerDOM

    this.layer.replaceChildren(bc)

    const duration = this.computeDuration(options, idleTrackIndex, this.containerRect.width + bc.offsetWidth)

    bc.style.left = `${this.containerRect.width}px`
    bc.style.transition = `transform ${duration}s linear 0s`

    const run = () => {
      bc.style.transform = `translateX(-${this.containerRect.width + bc.offsetWidth}px) translateY(0px) translateZ(0px)`
    }

    if (requestAnimationFrame) {
      requestAnimationFrame(() => run())
    } else {
      setTimeout(() => run())
    }

    bc.dataset.duration = duration + ''

    bc.remove()
    return bc
  }

  private getIdleTrackIndex() {
    let readyIdxs = []
    let index = -1

    {
      this.tracks.forEach((status, index) => status === 'idle' && readyIdxs.push(index))
    }

    if (readyIdxs.length) {
      index = readyIdxs[0]
      this.tracks[index] = 'running'
      return index
    }

    // TODO: 当全部轨道运行时，实时弹幕如何处理？

    return index
  }

  // private isTrackAvailable(_barrager: BarragerType): boolean {
  //   return _barrager.status === 'show'
  // }

  // private checkTrack(_barrager: BarragerType): boolean {
  //   const { container, status } = _barrager
  //   const barragerRect = container.getBoundingClientRect()

  //   if (status === 'hide') {
  //     return false
  //   } else if (status === 'show') {
  //     return true
  //   }

  //   if (this.options.speed || this.options.tractArray?.length) {
  //     // if (barragerRect.right < this.containerRect.right) return true
  //   } else {
  //     const duration = +container.dataset.duration

  //     const v1 = (this.containerRect.width + barragerRect.width) / duration

  //     const s2 = this.containerRect.width + barragerRect.width
  //     const t2 = duration
  //     const v2 = s2 / t2

  //     if (v2 <= v1) {
  //       return true
  //     } else {
  //       const t1 = (barragerRect.right - this.containerRect.left) / v1
  //       const t2 = this.containerRect.width / v2
  //       if (t2 < t1) {
  //         return false
  //       }
  //     }
  //   }
  //   return true
  // }

  private render = (barrager: BarragerType, track: number) => {
    const { container } = barrager
    container.dataset.track = track + ''
    container.style.top = track * this.options.trackHeight + 'px'
    this.container.appendChild(container)

    if (this.userBarragers.length) {
      const obj = this.userBarragers.shift()
      this.push(obj.DOMString, obj.options, 'high')
    }
  }

  private addEvent(barrager: BarragerType, idleTrackIndex: number, options: BarragerOptions) {
    const { onStart, onEnd } = options

    const { container, id } = barrager

    container.addEventListener('transitionstart', () => {
      if (onStart) onStart.call(window, barrager, this)
    })

    container.addEventListener('transitionend', () => {
      if (onEnd) onEnd.call(window, barrager, this)
      this.barragerArray[idleTrackIndex] = this.barragerArray[idleTrackIndex].filter((v) => v.id !== id)

      // TODO: DOM reuse
      container.remove()
    })
  }

  public getBarragerList() {
    return this.barragerArray.reduce((acc, cur) => [...cur, ...acc], [])
  }
  private toggleTransformStatus = (el: HTMLElement, status: 'running' | 'paused') => {
    if (el) {
      const elRect = el.getBoundingClientRect()
      const w = this.containerRect.width
      const x = Math.abs(w - (elRect.left - this.containerRect.left))
      if (status === 'running') {
        const i = parseInt(el.dataset.track)
        const id = el.dataset.id
        const b = this.barragerArray[i].find((item) => item.id === id)
        const duration = this.computeDuration(b.options, i, Math.abs(this.containerRect.left - elRect.left) + elRect.width)
        el.dataset.duration = duration + ''
        el.style.transform = `translateX(-${this.containerRect.width + el.offsetWidth}px) translateY(0px) translateZ(0px)`
        el.style.transition = `transform ${duration}s linear 0s`
      } else {
        el.style.transition = `transform 0s linear 0s`
        el.style.transform = `translateX(-${x}px) translateY(0px) translateZ(0px)`
      }
      return
    }
    // if (this.pauseArray.length && status == 'paused') return
    // this.pauseArray = this.getBarragerList()
    // this.pauseArray.forEach((item) => {
    //   item.style.animationPlayState = status
    // })
    // this.pauseArray = []
  }

  // 暂停
  public pause(el = null) {
    this.toggleTransformStatus(el, 'paused')
    if (el === null) {
      this.isAllPaused = true
    }
  }
  public resume(el = null) {
    this.toggleTransformStatus(el, 'running')
    this.isAllPaused = false
  }

  private addExtraEvent() {
    if (this.options.pauseOnClick) {
      eventEntrust(this.container, 'click', BARRAGERCLASS, (el) => {
        let currStatus = el.style.animationPlayState
        if (currStatus == 'paused' && el.dataset.clicked) {
          el.dataset.clicked = ''
          this.toggleTransformStatus(el, 'running')
        } else {
          el.dataset.clicked = 'true'
          this.toggleTransformStatus(el, 'paused')
        }
      })
    }

    if (this.options.pauseOnHover) {
      eventEntrust(this.container, 'mouseover', BARRAGERCLASS, (el) => {
        this.toggleTransformStatus(el, 'paused')
      })

      eventEntrust(this.container, 'mouseout', BARRAGERCLASS, (el) => {
        this.toggleTransformStatus(el, 'running')
      })
    }
  }
}
