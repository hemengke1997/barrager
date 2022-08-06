import { Barrager } from 'barrager'

const danmuList = [
  '好你个潮种',
  '这个老哥的评论说的很对啊，这都能被违规隐藏？是戳痛到某些人了吗。',
  'rip....',
  'resepct',
  '😂❤️😍😒👌☺️☺️😊😭😩😩😔😏😁👍🏿😁😏😏😔💕😭😘😊❤️😍',
  '对了对了我对了',
  '噎死老底儿！',
  '是你让你哥认真的',
  'emoji',
  '说的很对啊，很对啊',
  '你是傻鸟吗你是',
  '😂❤️😍😒👌☺️☺️😊😭😩😩😔😏😁👍🏿😁😏😏😔💕😭😘😊❤️😍',
]

const getRandom = (min, max) => parseInt(Math.random() * (max - min + 1)) + min

const danmuTest = {
  screen: null,
  handler: null,
  dom: {
    closeTime: document.querySelector('.close-time'),
    openTime: document.querySelector('.open-time'),
    sendDanmu: document.querySelector('#sendDanmu'),
    dInput: document.querySelector('#d-input'),
    pauseAll: document.querySelector('#pauseAll'),
    continueAll: document.querySelector('#continueAll'),
  },
  init() {
    this.eventInit()
    this.screen = new Barrager('.screen', {
      trackHeight: 35,
      speed: undefined,
      pauseOnClick: true,
      pauseOnHover: true,
    })
    // this.sendDanmu()
  },
  sendDanmu() {
    this.sendAction()
  },
  sendAction() {
    this.handler = setInterval(() => {
      const index = getRandom(0, 10)
      const str = danmuList[index]
      const dom = `<span>${str}</span>`
      this.screen.push(dom)
    }, 1000)
  },
  // 暂停
  pause() {
    this.screen.pause()
  },
  // 继续
  continue() {
    this.screen.resume()
  },
  closeTime() {
    this.handler && clearInterval(this.handler)
  },
  eventInit() {
    this.dom.closeTime.addEventListener('click', () => {
      this.closeTime()
    })
    this.dom.openTime.addEventListener('click', () => {
      this.sendDanmu()
    })

    this.dom.sendDanmu.addEventListener('click', () => {
      const value = this.dom.dInput.value
      const escapeHTML = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/\'/g, '&#39;').replace(/\//g, '&#x2F;')
      if (value) {
        const danmu = `<span class="danmu-item" style="color: red;">${escapeHTML}</span>`
        this.screen.push(
          danmu,
          {
            onStart: (id, danmu) => {},
            onEnd: (id, danmu) => {},
          },
          true
        )
      } else {
        alert('请输入要发送的弹幕')
      }
    })

    this.dom.pauseAll.addEventListener('click', () => {
      this.pause()
    })

    this.dom.continueAll.addEventListener('click', () => {
      this.continue()
    })
  },
}

danmuTest.init()
