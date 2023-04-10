import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { threeToCannon, ShapeType } from 'three-to-cannon'
import { Control } from './utils/control'
import { Bullet, BulletManger } from './bullet'
import {dev} from './config'
const loader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath( '/three/examples/jsm/libs/draco/' )





const control = Control.getInstance()

class PlayerControl {
  scene: THREE.Scene
  world: CANNON.World
  camera: THREE.Camera
  horizontal:number = 0
  vertical:number = 0
  up:number = 0
  speed:number = 5
  vector3:THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  quaternion:THREE.Quaternion = new THREE.Quaternion(0, 0, 0)
  immersing:boolean = false
  animations:THREE.AnimationClip[] = []

  
  constructor (scene: THREE.Scene, world: CANNON.World, camera: THREE.Camera) {
    this.scene = scene
    this.world = world
    this.camera = camera
    this.initializeEvents()
  }

  initializeEvents () {
    control.addEventListener('keydown', this.keydown.bind(this))
    control.addEventListener('keyup', this.keyup.bind(this))
    control.addEventListener('pointerdown', this.pointerdown.bind(this))
    control.addEventListener('pointerup', this.pointerup.bind(this))
    control.addEventListener('pointermove', this.pointermove.bind(this))
  }

  keydown (event:KeyboardEvent) {
    console.log(event.key)
    if (event.key === 'Escape') {
      this.immersing = false
    }
    if(event.key === 'w') {
      this.vertical = 1
    } else if(event.key === 's') {
      this.vertical = -0.3
    } 
    if (event.key === 'a') {
      this.horizontal = 1
    } else if (event.key === 'd') {
      this.horizontal = -1
    }
    this.vector3.set(this.speed * this.horizontal * 0.5, 0, this.speed * this.vertical)
  }

  keyup (event:KeyboardEvent) {
    if(event.key === 'w' || event.key === 's') {
      this.vertical = 0
    }
    if(event.key === 'a' || event.key === 'd') {
      this.horizontal = 0
    }
    this.vector3.set(this.speed * this.horizontal * 0.5, 0, this.speed * this.vertical)
  }

  pointerdown (event:PointerEvent) {
    if(!this.immersing) {
      this.immersing = true
    }
    this.fire()
  }

  pointerup (event:PointerEvent) {

  }

  pointermove (event:PointerEvent) {
    if (!this.immersing) return
    const x = event.movementX / event.clientX * Math.PI
    const y = event.movementY / event.clientY * Math.PI
    const euler = new THREE.Euler(x, y, 0)

    this.quaternion.setFromEuler(euler)
  }

  fire () {
    const bullet = new Bullet(new THREE.Vector3(10, 3, 10))
    this.scene.add(bullet.object3D)
  }

  dispatch (name:string, params:any, callback:Function) {
    callback(name, params)
  }

  update (callback:(vector3:THREE.Vector3, quaternion:THREE.Quaternion) => void) {
    callback(this.vector3, this.quaternion)
  }
}

var last = 0


const AnimationsEffect = {
  Firing: 3, // 射击
  FiringWalk: 4, // 步行射击
  Idle: 1, // 站立
  Shot: 100, // 死亡
  Walking: 2, // 步行
}

class AnimationControl {
  object3D?:THREE.Object3D
  animationGroup = new THREE.AnimationObjectGroup() //创建动画对象组
  animationClips:THREE.AnimationClip[] = []
  mixer?:THREE.AnimationMixer
  actions:{[key:string]: THREE.AnimationAction} = {}
  currentAction?:THREE.AnimationAction
  constructor (object3D?:THREE.Object3D, animationClips?:THREE.AnimationClip[], animationsEffect?:{[key:string]: number}) {
    this.initialize(object3D, animationClips, animationsEffect)
  }

  setAnimationClips (animationClips?:THREE.AnimationClip[]) {
    if (!this.mixer || !animationClips) return
    const mixer = this.mixer
    this.animationClips = animationClips
    this.animationClips.forEach(clip => {      
      console.log(clip.uuid, this)
      this.actions[clip.name] = mixer.clipAction( clip )
    })
  }

  setAnimationsEffect (animationsEffect?:{[key:string]: number}) {
    if (!animationsEffect) return
    Object.keys(this.actions).forEach(actionName => {
      this.actions[actionName].setEffectiveWeight(animationsEffect[actionName] || 1)
    })
  }

  initialize (object3D?:THREE.Object3D, animationClips?:THREE.AnimationClip[], animationsEffect?:{[key:string]: number}) {
    if(object3D) {
      this.object3D = object3D  
      this.mixer = new THREE.AnimationMixer( this.object3D )
    }
    this.setAnimationClips(animationClips)
    this.setAnimationsEffect(animationsEffect)
  }

  play (animationName:string) {
    if (!this.mixer || !animationName) return
    // 播放一个特定的动画
    // const clip = THREE.AnimationClip.findByName( this.animationClips, animationName )
    // const action = this.mixer.clipAction( clip )
    // action.play()
    const action = this.actions[animationName]
    console.log(this.currentAction, action)
    if (this.currentAction) {
      this.currentAction.crossFadeTo(action, 1, false)
    } else {
      action.fadeIn(1)
    }
    this.currentAction = action
  }

  update (delta:number) {
    this.mixer && this.mixer.update( delta )
  }
}

export class Player {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.Camera
  world: CANNON.World
  object3D!:THREE.Object3D
  rigidBody!: CANNON.Body
  loaded:boolean = false
  bulletManger:BulletManger
  horizontal:number = 0
  vertical:number = 0
  up:number = 0
  speed:number = 5
  vector3:THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  quaternion:THREE.Quaternion = new THREE.Quaternion(0, 0, 0)
  immersing:boolean = false
  // 射线
  raycaster = new THREE.Raycaster()
  animationGroup = new THREE.AnimationObjectGroup() //创建动画对象组
  animationClips:THREE.AnimationClip[] = []
  mixer?:THREE.AnimationMixer
  blod:number = 100 // 血量
  animationControl:AnimationControl = new AnimationControl()
  hotKeys:{[key:string]: boolean} = {}
  firing: boolean = false

  constructor (renderer: THREE.WebGLRenderer, scene: THREE.Scene, world: CANNON.World, camera: THREE.Camera) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.world = world
    this.rigidBody = new CANNON.Body({
      mass: 60,
      position: new CANNON.Vec3(10, 1, 10)
    })
    this.bulletManger = new BulletManger(scene, world)
  }

  initialize () {
    this.load()
    this.createSightBead()
    this.initializeEvents()
    return this
  }

  initializeEvents () {
    control.addEventListener('keydown', this.keydown.bind(this))
    control.addEventListener('keyup', this.keyup.bind(this))
    control.addEventListener('pointerdown', this.pointerdown.bind(this))
    control.addEventListener('pointerup', this.pointerup.bind(this))
    control.addEventListener('pointermove', this.pointermove.bind(this))
  }

  keydown (event:KeyboardEvent) {
    console.log(event.key)
    this.hotKeys[event.key] = true
    if (event.key === 'Escape') {
      this.immersing = false
    }
    if(event.key === 'w') {
      this.vertical = 1
      this.speed = 1
      this.animationControl.play('Walking')
    } else if(event.key === 's') {
      this.vertical = -1
      this.speed = 0.3
    } 
    if (event.key === 'a') {
      this.horizontal = 1
      this.speed = 0.5
    } else if (event.key === 'd') {
      this.horizontal = -1
      this.speed = 0.5
    }
    this.vector3.set(this.speed * this.horizontal, 0, this.speed * this.vertical)
    this.animations()
  }

  keyup (event:KeyboardEvent) {
    this.hotKeys[event.key] = false
    if(event.key === 'w' || event.key === 's') {
      this.vertical = 0
      this.speed = 0
    }
    if(event.key === 'a' || event.key === 'd') {
      this.horizontal = 0
      this.speed = 0
    }
    this.vector3.set(this.speed * this.horizontal * 0.5, 0, this.speed * this.vertical)
  }

  pointerdown (event:PointerEvent) {
    if(!this.immersing) {
      this.immersing = true
    }
    const pointer = new THREE.Vector2()
    // 将鼠标位置归一化为设备坐标。x 和 y 方向的取值范围是 (-1 to +1)
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1
    // 通过摄像机和鼠标位置更新射线
    this.raycaster.setFromCamera(pointer, this.camera)

    // 计算物体和射线的焦点
    const intersects = this.raycaster.intersectObjects(this.scene.children)
    if (intersects[0]) {
      console.log(intersects[0])
      this.fire(intersects[0].point)
    }
    // for (let i = 0; i <intersects.length; i++ ) {
    //   if (intersects[i].object.name === 'tile') {
    //     targetPos = intersects[i].point
    //   }
    // }
    
  }

  pointerup (event:PointerEvent) {

  }

  pointermove (event:PointerEvent) {
    if (!this.immersing) return
    const x = event.movementX / event.clientX * Math.PI
    const y = event.movementY / event.clientY * Math.PI
    const euler = new THREE.Euler(x, y, 0)

    this.quaternion.setFromEuler(euler)
  }

  createSightBead () {
    const map = new THREE.TextureLoader().load( '/images/sightBead.png' )
    const material = new THREE.SpriteMaterial( { 
      map: map,
      sizeAttenuation: false
    } )
    
    const sprite = new THREE.Sprite( material )
    sprite.scale.set(0.2, 0.2, 1)
    this.scene.add( sprite )
  }

  fire (target:THREE.Vector3) {
    this.rigidBody.position
    this.object3D.up
    const pos = this.object3D.position.clone().setY(2)
    // this.object3D.lookAt(target)

    // const target = this.object3D.position.normalize()
    // target
    const bullet = this.bulletManger.create(pos)
    const quan = bullet.object3D.quaternion.clone()

    // bullet.object3D.lookAt(target)
    const mx = bullet.object3D.matrix.clone()
    mx.lookAt(bullet.object3D.position,  target, bullet.object3D.up)
    const q = new THREE.Quaternion().setFromRotationMatrix(mx)
    bullet.rigidBody.quaternion.copy(q as unknown as CANNON.Quaternion)

    this.bulletManger.fire(bullet, new THREE.Vector3(0, 0, 1))
    this.hotKeys.firing = true
  }


  addScene (scene:THREE.Scene) {
    this.scene = scene
  }

  update (delta:number) {
    if (!this.object3D || !this.rigidBody) return
    if (!dev) {
      const cameraPosition = this.object3D.localToWorld(new THREE.Vector3(0, 3, -2))
      this.camera.position.copy(cameraPosition)
      this.camera.lookAt(this.object3D.position.clone().setY(1.8))
    }

    const vector3 = new CANNON.Vec3(this.vector3.x * delta, this.vector3.y * delta, this.vector3.z * delta)
    this.rigidBody.position = this.rigidBody.position.vadd(vector3)
    this.object3D.position.copy(this.rigidBody.position as unknown as THREE.Vector3)
    this.object3D.quaternion.copy(this.rigidBody.quaternion as unknown as THREE.Quaternion)
    this.bulletManger.update(delta)
    this.animationControl.update( delta )
    // this.animations()
  }

  animations () {
    if (this.hotKeys.w && this.hotKeys.firing) {
      this.hotKeys.firing = false
      this.animationControl.play('FiringWalk')
    }
    if (this.hotKeys.w) {
      this.animationControl.play('Walking')
    }
    if (this.blod <= 0) {
      this.animationControl.play('Shot')
    }
    this.animationControl.play('Idle')
  }

  load() {
    loader.setDRACOLoader(dracoLoader)
    loader.load('/model/swat-guy2.glb', gltf => {
      console.log(gltf.animations)
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.type === 'SkinnedMesh') {
          child.castShadow = true
        }
      })
      const halfExtents = new CANNON.Vec3(0.3, 0.8, 0.2)
      const boxShape = new CANNON.Box(halfExtents)
      this.rigidBody.addShape(boxShape, new CANNON.Vec3(0, 0.8, 0))
      // this.rigidBody.fixedRotation = true
      this.world.addBody(this.rigidBody)
      this.object3D = gltf.scene
      this.object3D.name = 'player'
      this.animationControl.initialize(this.object3D, gltf.animations, AnimationsEffect)
      // this.mixer = new THREE.AnimationMixer( this.object3D )
      // this.animationClips = gltf.animations
      this.scene.add(this.object3D)
      this.loaded = true
    }, undefined, function (error) {
      console.error(error)
    })
  }

  // play (animationName:string) {
  //   if (!this.mixer || !animationName) return
  //   // 播放一个特定的动画
  //   const clip = THREE.AnimationClip.findByName( this.animationClips, animationName )
  //   const action = this.mixer.clipAction( clip )
  //   action.reset().repetitions = 1
  //   action.play()
  // }
}
