import { name } from '../package.json'
import { BARRAGERCLASS, eventEntrust, getContainer, getRandom, initAnimate, LAYERCLASS } from './helper'

/**
 * 初始化弹幕容器元素
 */
type ElType = string | HTMLElement

/**
 * 弹幕容器
 */
type ContainerType = HTMLElement

type TrackStatus = 'running' | 'idle'

/**
 * 弹幕配置
 */
export type BarragerOptions = {
  trackHeight?: number
  tractArray?: any[]
  pauseOnHover?: boolean
  pauseOnClick?: boolean
  onStart?: any
  onEnd?: any
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
  tractArray: [{ speed: 150 }, { speed: 130 }],
  speed: 100,
}

export class Barrager {
  el: ElType
  /**
   * 弹幕容器
   */
  private container: ContainerType
  private containerRect: DOMRect
  /**
   * 弹幕配置
   */
  private options: BarragerOptions
  /**
   * 弹幕轨道
   */
  private tracks: TrackStatus[]
  /**
   * 弹幕临时容器层
   */
  private layer: HTMLElement = null
  /**
   * 弹幕存储器
   */
  barrager: HTMLElement[][]
  /**
   * 全部暂停
   */
  isAllPaused: boolean
  /**
   * 当前弹幕信息
   */
  barragerInfo: { width?: number; [k: string]: any }
  /**
   * 用户输入的弹幕
   */
  userBarragers: {
    dom: string
    options: BarragerOptions
  }[] = [] // 用户自己发送的的弹幕存储列表
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

  initOptions() {
    const { trackHeight } = this.options
    this.containerRect = this.container.getBoundingClientRect()
    const trackCount = trackHeight ? Math.floor(this.containerRect.height / trackHeight) : this.containerRect.height
    this.tracks = new Array<TrackStatus>(trackCount).fill('idle')
    this.barrager = new Array(trackCount).fill([])

    const { position } = getComputedStyle(this.container)
    if (position === 'static') {
      this.container.style.position = 'relative'
      this.container.style.overflow = 'hidden'
    }
    initAnimate()
  }

  private initLayer() {
    this.layer = document.createElement('div')
    this.layer.classList.add(LAYERCLASS)
    document.body.appendChild(this.layer)
  }

  push(barragerDOM: string, opts: BarragerOptions = {}, priority: 'high' | 'normal' = 'normal') {
    const options = {
      ...this.options,
      ...opts,
    }

    const idleTrackIndex = this.getIdleTrackIndex()

    if (idleTrackIndex === -1) {
      if (priority === 'high') {
        this.userBarragers.push({ dom: barragerDOM, options })
      }
    } else {
      const barragerContainer = this.getBarragerItem(barragerDOM, options, idleTrackIndex)
      if (this.barrager[idleTrackIndex].length) {
        this.barrager[idleTrackIndex].push(barragerContainer)
      } else {
        this.barrager[idleTrackIndex] = [barragerContainer]
      }
      this.render(barragerContainer, idleTrackIndex)
      this.addEvent(barragerContainer, idleTrackIndex, options)
      return barragerContainer.id
    }
    return null
  }

  private getBarragerItem(barragerDOM: string, options: BarragerOptions, idleTrackIndex: number) {
    const bc = getContainer()

    bc.innerHTML = barragerDOM

    this.layer.replaceChildren(bc)
    this.barragerInfo = { width: bc.offsetWidth }

    let duration = 0
    const speed = options.tractArray?.[idleTrackIndex]?.speed || options.speed
    if (speed) {
      duration = (this.containerRect.width + this.barragerInfo.width) / speed
    } else {
      duration = +options.duration.slice(0, -1)
    }
    bc.style.left = `${this.containerRect.width + bc.clientWidth}px`
    bc.style.transition = `transform ${duration}s linear 0s`

    const run = () => {
      bc.style.transform = `translateX(-${this.containerRect.width + 2 * bc.clientWidth}px) translateY(0px) translateZ(0px)`
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
      const random = getRandom(0, readyIdxs.length - 1)
      index = readyIdxs[random]
      this.tracks[index] = 'running'
      return index
    }
    for (let i = 0; i < this.barrager.length; i++) {
      const len = this.barrager[i].length
      if (len) {
        const b = this.barrager[i][len - 1]
        if (b && this.checkTrack(b)) {
          index = i
          break
        }
      }
    }
    return index
  }

  private checkTrack(_barrager: HTMLElement): boolean {
    const barragerRect = _barrager.getBoundingClientRect()

    if (barragerRect.right > this.containerRect.right) {
      return false
    }

    const containerWidth = this.containerRect.width

    if (this.options.speed || this.options.tractArray.length) {
      if (barragerRect.right < this.containerRect.right) return true
    } else {
      const duration = +_barrager.dataset.duration

      const v1 = (containerWidth + barragerRect.width) / duration

      const s2 = containerWidth + this.barragerInfo.width
      const t2 = duration
      const v2 = s2 / t2

      if (v2 <= v1) {
        return true
      } else {
        const t1 = (barragerRect.right - this.containerRect.left) / v1
        const t2 = containerWidth / v2
        if (t2 < t1) {
          return false
        }
      }
    }
    return true
  }

  private render = (container: HTMLElement, track: number) => {
    // if (this.isAllPaused) return
    container.dataset.track = track + ''
    container.style.top = track * this.options.trackHeight + 'px'
    this.container.appendChild(container)

    if (this.userBarragers.length) {
      const obj = this.userBarragers.shift()
      this.push(obj.dom, obj.options, 'high')
    }
  }

  private addEvent(bc: HTMLElement, idleTrackIndex: number, options: BarragerOptions) {
    const { onStart, onEnd } = options

    bc.addEventListener('transitionstart', () => {
      if (onStart) onStart.call(window, bc.id, this)
    })

    bc.addEventListener('transitionend', () => {
      if (onEnd) onEnd.call(window, bc.id, this)
      this.barrager[idleTrackIndex] = this.barrager[idleTrackIndex].filter((v) => v.id !== bc.id)

      if (!this.barrager[idleTrackIndex].length) {
        this.tracks[idleTrackIndex] = 'idle'
      }
      bc.remove()
    })
  }

  public getBarragerList() {
    return this.barrager.reduce((acc, cur) => [...cur, ...acc], [])
  }
  private toggleAnimateStatus = (el: HTMLElement, status = 'paused') => {
    // if (el) {
    //   if (status === 'running') {
    //     el.style.animationPlayState = 'running'
    //     el.style.zIndex = '0'
    //     el.classList.remove('barrager-item-paused')
    //   } else {
    //     el.style.animationPlayState = 'paused'
    //     el.style.zIndex = '99999'
    //     el.classList.add('barrager-item-paused')
    //   }
    //   return
    // }
    // if (this.pauseArray.length && status == 'paused') return
    // this.pauseArray = this.getBarragerList()
    // this.pauseArray.forEach((item) => {
    //   item.style.animationPlayState = status
    // })
    // this.pauseArray = []
  }

  // 暂停
  public pause(el = null) {
    this.toggleAnimateStatus(el, 'paused')
    if (el === null) {
      this.isAllPaused = true
    }
  }
  public resume(el = null) {
    this.toggleAnimateStatus(el, 'running')
    this.isAllPaused = false
  }

  private addExtraEvent() {
    if (this.options.pauseOnClick) {
      eventEntrust(this.container, 'click', BARRAGERCLASS, (el) => {
        let currStatus = el.style.animationPlayState
        if (currStatus == 'paused' && el.dataset.clicked) {
          el.dataset.clicked = ''
          this.toggleAnimateStatus(el, 'running')
        } else {
          el.dataset.clicked = 'true'
          this.toggleAnimateStatus(el, 'paused')
        }
      })
    }

    if (this.options.pauseOnHover) {
      eventEntrust(this.container, 'mouseover', BARRAGERCLASS, (el) => {
        this.toggleAnimateStatus(el, 'paused')
      })

      eventEntrust(this.container, 'mouseout', BARRAGERCLASS, (el) => {
        this.toggleAnimateStatus(el, 'running')
      })
    }
  }
}
