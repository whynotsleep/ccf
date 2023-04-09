export class Control {
  public static instance:Control
  events:{[key:string]:Array<Function>} = {}
  private _disppose?: Function

  constructor () {
    this.initialize()
  }

  public static getInstance () {
    if (!Control.instance) {
      Control.instance = new Control()
    }
    return Control.instance
  }

  initialize () {
    if(this._disppose) {
      this._disppose()
    }
    const keydown = (event:KeyboardEvent) => {
      this.keydown(event)
    }
    const keyup = (event:KeyboardEvent) => {
      this.keyup(event)
    }
    const pointerdown = (event:PointerEvent) => {
      this.pointerdown(event)
    }
    const pointerup = (event:PointerEvent) => {
      this.pointerup(event)
    }
    const pointermove = (event:PointerEvent) => {
      this.pointermove(event)
    }
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    window.addEventListener('pointerdown', pointerdown)
    window.addEventListener('pointerup', pointerup)
    window.addEventListener('pointermove', pointermove)
    this._disppose = function () {
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      window.removeEventListener('pointerdown', pointerdown)
      window.removeEventListener('pointerup', pointerup)
      window.removeEventListener('pointermove', pointermove)
    }
  }

  keydown (event:KeyboardEvent) {
    const events = this.events['keydown']
    if(!events) return
    events.forEach(fn => {
      fn(event)
    })
  }

  keyup (event:KeyboardEvent) {
    const events = this.events['keyup']
    if(!events) return
    events.forEach(fn => {
      fn(event)
    })
  }

  pointerdown (event:PointerEvent) {
    const events = this.events['pointerdown']
    if(!events) return
    events.forEach(fn => {
      fn(event)
    })
  }

  pointerup (event:PointerEvent) {
    const events = this.events['pointerup']
    if(!events) return
    events.forEach(fn => {
      fn(event)
    })
  }

  pointermove (event:PointerEvent) {
    const events = this.events['pointermove']
    if(!events) return
    events.forEach(fn => {
      fn(event)
    })
  }

  addEventListener (name:string, callback:Function) {
    if(!this.events[name]) {
      this.events[name] = []
    }
    this.events[name].push(callback)
  }

  removeEventListener (name:string, callback:Function) {
    if (!this.events[name]) return
    const index = this.events[name].indexOf(callback)
    if(index !== -1) {
      this.events[name].splice(index, 1)
    }
  }

  dispose () {
    this._disppose && this._disppose()
    this.events = {}
  }
}
