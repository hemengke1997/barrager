export const BARRAGERCLASS = '__barrager-item-style'
export const LAYERCLASS = '__barrager-layer-container'

export const initCSS = (): void => {
  let style = document.createElement('style')
  const animateClass = 'BARRAGER_ANIMATE'
  style.classList.add(animateClass)

  const Container = /*css*/ `
  .${BARRAGERCLASS} {
		cursor: pointer;
		position: absolute;
		left: 0;
		overflow: hidden;
		display: inline-block;
		word-break: keep-all;
		white-space: nowrap;
    will-change: transform;
	}`

  const Layer = /*css*/ `
	.${LAYERCLASS} {
		position: absolute;
		right: 9999px;
		visibility: hidden;
	}`

  style.innerHTML = Container + Layer
  document.head.appendChild(style)
}

export const getRandom = (min: number, max: number): number => parseInt(String(Math.random() * (max - min + 1))) + min

export const getContainer = (): HTMLElement => {
  const bc = document.createElement('div')
  bc.id = String(Date.now())
  bc.classList.add(BARRAGERCLASS)
  return bc
}

export function eventEntrust(target: HTMLElement, event: keyof HTMLElementEventMap, className: string, cb: (e: HTMLElement) => void) {
  target.addEventListener(event, (e) => {
    let el = e.target as HTMLElement
    while (!el.className.includes(className)) {
      if (el === target) {
        el = null
        break
      }

      el = el.parentNode as HTMLElement
    }
    if (el) {
      cb(el)
    }
  })
}
