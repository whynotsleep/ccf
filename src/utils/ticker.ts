import * as THREE from 'three'
export class Ticker {
  clock = new THREE.Clock()
  queue: Array<Function> = []
  renderer!:THREE.WebGLRenderer
  scene!:THREE.Scene
  camera!:THREE.Camera
  constructor (renderer:THREE.WebGLRenderer, scene:THREE.Scene, camera:THREE.Camera) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
  }

  start () {
    this.update()
  }

  update () {
    const delta = this.clock.getDelta()
    requestAnimationFrame( this.update.bind(this) )
    this.queue.forEach(update => update(delta))
    this.renderer.render( this.scene, this.camera )
  }

  add (update:(delta:number) => void, target?:any) {
    if(!update) return
    this.queue.push(target ? update.bind(target) : update)
  }

  remove (target:any) {
    const index = this.queue.indexOf(target)
    if (index !== -1) {
      this.queue.splice(index, 1)
    }
  }
}