import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
const loader = new GLTFLoader()
let bulletCount = 0
export class Bullet {
  uid:number
  scene:THREE.Scene
  model:THREE.Object3D
  rigidBody:CANNON.Body
  speed:number = 2000
  isSleep = false
  private collideEvent?:Function
  constructor (scene:THREE.Scene, model:THREE.Object3D, position:THREE.Vector3) {
    this.uid = ++bulletCount
    this.scene = scene
    this.model = model
    const scale = this.model.scale
    const halfExtents = new CANNON.Vec3(scale.x, scale.y, scale.z)
    const offset = new CANNON.Vec3(scale.x, scale.y, scale.z)
    const boxShape = new CANNON.Box(halfExtents)
    this.rigidBody = new CANNON.Body({
      mass: 0.2,
      position: position as unknown as CANNON.Vec3,
      shape: boxShape
    })
    this.rigidBody.addEventListener('collide', (event:CANNON.EventTarget) => {
      if(!this.collideEvent) return
      if(this.isSleep)return
      this.collideEvent(this, event)
    })
    this.reset(position)
  }

  // 重置状态
  reset (position:THREE.Vector3) {
    this.uid = ++bulletCount
    this.rigidBody.position.copy(position as unknown as CANNON.Vec3)
    this.rigidBody.wakeUp()
    this.model.position.copy(position)
    this.model.rotation.set(0, 0, 0)
    this.model.visible = true
    this.isSleep = false
    return this
  }

  // 击发
  fire (normal:THREE.Vector3) {
    this.rigidBody.applyForce(new CANNON.Vec3(normal.x * this.speed, normal.y * this.speed, normal.z * this.speed))
    return this
  }

  // 睡眠
  sleep() {
    this.isSleep = true
    this.model.visible = false
    this.rigidBody.sleep()
    return this
  }

  // 碰撞监听
  collide (callback:Function) {
    this.collideEvent = callback
    return this
  }

  // 帧循环
  update(delta:number) {
    if (this.isSleep) return
    this.model.position.copy(this.rigidBody.position as unknown as THREE.Vector3)
    this.model.quaternion.copy(this.rigidBody.quaternion as unknown as THREE.Quaternion)
  }
}

export class BulletManger {
  scene: THREE.Scene
  world: CANNON.World
  bullets:Array<Bullet> = []
  destoryCache:Array<Bullet> = [] // 待销毁的子弹
  sleepBullets:Array<Bullet> = []
  loaded:boolean = false
  model?:THREE.Object3D
  constructor (scene:THREE.Scene, world:CANNON.World) {
    this.scene = scene
    this.world = world
    this.load()
  }

  load () {
    this.loaded = true
    loader.load('/model/bullet.glb', gltf => {
      this.model = gltf.scene.children[0]
      
      console.log('子弹', gltf)
      // gltf.scene.traverse((child) => {
      //   if (child instanceof THREE.Mesh && child.type === 'SkinnedMesh') {
      //     child.castShadow = true
      //   }
      // })
      // const halfExtents = new CANNON.Vec3(0.3, 0.8, 0.2)
      // const boxShape = new CANNON.Box(halfExtents)
      // this.rigidBody.addShape(boxShape, new CANNON.Vec3(0, 0.8, 0))
      // // this.rigidBody.fixedRotation = true
      // this.world.addBody(this.rigidBody)
      // this.object3D = gltf.scene
      // this.object3D.name = 'player'
      // this.animationControl.initialize(this.object3D, gltf.animations)
      // this.scene.add(this.object3D)
      this.loaded = true
    }, undefined, function (error) {
      console.error(error)
    })
  }

  // 回收子弹
  recycle (bullet:Bullet) {
    const index = this.bullets.indexOf(bullet)
    if(index !== -1) {
      this.bullets.splice(index, 1)
    }
    if(!this.sleepBullets.includes(bullet)) {
      this.sleepBullets.push(bullet)
    }
    if(!bullet.isSleep) {
      
      bullet.sleep()
      this.destoryCache.push(bullet)  
    }
  }

  // 复用子弹
  reuse ():Bullet|undefined {
    if (this.sleepBullets.length > 0) {
      return this.sleepBullets.shift()
    }
  }

  create (position:THREE.Vector3) {
    if(!this.model) return
    let bullet = this.reuse()
    if (bullet) {
      bullet.reset(position)
    } else {
      bullet = new Bullet(this.scene, this.model.children[0].clone(), position)
    }
    this.scene.add(bullet.model)
    this.world.addBody(bullet.rigidBody)
    return bullet
  }

  // 如果在world.step前删除了刚体，会打乱cannon的碰撞检测，导致碰撞检测报错
  destroy () {
    while (this.destoryCache.length > 0) {
      const bullet = this.destoryCache.shift() as unknown as Bullet
      this.scene.remove(bullet.model)
      this.world.removeBody(bullet.rigidBody)    
    }
  }

  fire (bullet:Bullet, target:THREE.Vector3, collide?:Function) {
    this.bullets.push(bullet)
    bullet.fire(target).collide((bullet:Bullet, event:CANNON.EventTarget) => {
      if(bullet.isSleep || this.sleepBullets.includes(bullet))return
      this.recycle(bullet as unknown as Bullet)
      collide && collide(bullet, event)
      return true
    })
  }

  update (delta:number) {
    this.destroy()
    this.bullets.forEach(bullet => bullet.update(delta))
  }
}