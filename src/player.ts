import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { threeToCannon, ShapeType } from 'three-to-cannon'
import { Control } from './utils/control'
import { Bullet, BulletManger } from './bullet'
import { dev, clock } from './config'
import { debug } from './debug'
import animationConfig from './animation.json'
const loader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/three/examples/jsm/libs/draco/')





const control = Control.getInstance()

interface AnimatorOption {
  name: string
  clip: THREE.AnimationClip
  loop: THREE.AnimationActionLoopStyles
  weight: number
  action: THREE.AnimationAction
  desc: string
}

interface Animators {
  [key: string]: Animator
}

interface ActiveAnimation {
  name: string
  action: THREE.AnimationAction
}

class Animator {
  name: string
  clip: THREE.AnimationClip
  loop: THREE.AnimationActionLoopStyles
  action: THREE.AnimationAction
  desc: string

  constructor(option: AnimatorOption) {
    this.name = option.name
    this.clip = option.clip
    this.loop = option.loop === 0 ? THREE.LoopRepeat : THREE.LoopOnce
    this.action = option.action
    this.action.loop = this.loop
    this.action.weight = option.weight
    this.action.enabled = true
    this.desc = option.desc
  }

  play() {
    this.action.play()
    return this
  }

  stop() {
    this.action.stop()
    return this
  }

  fadeIn(durationInSeconds: number) {
    this.action.fadeIn(durationInSeconds)
    return this
  }

  fadeOut(durationInSeconds: number) {
    this.action.fadeIn(durationInSeconds)
    return this
  }

  to(animator: Animator) {
    animator.action.enabled = true
    animator.action.setEffectiveTimeScale(1)
    animator.action.setEffectiveWeight(1)
    animator.action.time = 0
    // console.log('播放动画：', animator, '   结束动画：', this)
    this.action.crossFadeTo(animator.action, 0.5, true)
  }

  setEnabled(status: boolean) {
    this.action.enabled = status
    return this
  }

  isRunning() {
    return this.action.isRunning()
  }

  // 设置权重
  setEffectiveWeight(weight: number) {
    this.action.setEffectiveWeight(weight)
    return this
  }

  reset() {
    return this.action.reset()
  }
}


class AnimationControl {
  model!: THREE.Object3D
  mixer!: THREE.AnimationMixer
  animators: Animators = {}
  active!: Animator
  keys: { [key: string]: number } = {} // 按键
  isJumping = false // 跳
  isRunning = false // 跑步
  isCrouch = false // 下蹲
  isFring = false // 射击
  isReload = false // 换弹夹
  isDying = false // 死亡
  constructor() {

  }

  initialize(model: THREE.Object3D, animationClips: THREE.AnimationClip[]) {
    this.model = model
    this.mixer = new THREE.AnimationMixer(this.model)
    const animationsConfig = (animationConfig as any).animations
    const clips = animationClips.reduce((total: any, clip) => {
      total[clip.name] = clip
      return total
    }, {})
    Object.keys(animationsConfig).forEach(name => {
      const { loop, weight, desc } = animationsConfig[name]
      const clip = clips[name]
      const animator = new Animator({
        name,
        clip,
        loop,
        weight,
        desc: desc || '',
        action: this.mixer.clipAction(clip)
      })
      animator.play()
      this.animators[name] = animator
    })
    this.active = this.animators.HoldIdle
    return this
  }

  play(name: string) {
    if (!this.mixer || !name) return
    const endAction = this.active
    if (endAction && endAction.name === name && this.animators[name].loop === THREE.LoopRepeat) return

    if (endAction && endAction.name === name) {
      if (endAction.loop === THREE.LoopRepeat) return
      if (endAction.isRunning()) return
    }

    const startAction = this.animators[name]
    if (!startAction) return
    this.active = startAction
    // console.log(endAction.name, ' -- to -- ', endAction.name)
    // if (endAction && endAction.name === name) {
    //   endAction
    //   endAction.to(startAction)
    // }
    if (!endAction) {
      return startAction.fadeIn(0.5)
    }
    endAction.to(startAction)
  }

  beginAction() {
    const name = this.detection()
    // console.log('检测：', this.keys.w, name)
    this.play(name)
  }

  detection() {
    const { keys, isRunning, isCrouch, isFring, isReload, isDying, isJumping } = this
    if (isDying) return 'WalkingToDying'

    if (keys.w && isFring && isCrouch) return 'CrouchFireRifleSingle'
    if (keys.w && isFring) return 'WalkFiringRifleSingle'
    if (isFring) return 'IdelFiringSingle'


    if (keys.w && isRunning && isReload) return 'RunReload'
    if (keys.w && isCrouch && isReload) return 'CrouchReload'
    if (keys.w && isReload) return 'WalkReload'
    if (isReload) return 'IdelReloading'

    if (keys.w && isCrouch) return 'WalkCrouchingForward'
    if (keys.s && isCrouch) return 'CrouchWalkingBackwards'
    if (keys.a && isCrouch) return 'WalkCrouchingLeft'
    if (keys.d && isCrouch) return 'WalkCrouchingRight'


    if (keys.w && isRunning) return 'TowardRifleRun'
    if (keys.s && isRunning) return 'BackwardsRifleRun'
    if (keys.a && isRunning) return 'RunLeft'
    if (keys.d && isRunning) return 'RunRight'

    if (keys.w) return 'Walking'
    if (keys.s) return 'WalkingBackwards'
    if (keys.a) return 'WalkLeft'
    if (keys.d) return 'WalkRight'

    if (keys.w) return 'Walking'
    if (isJumping) return 'JumpDown'
    if (isCrouch) return 'CrouchIdle'
    return 'HoldIdle'
  }

  update(delta: number) {
    this.mixer && this.mixer.update(delta)
  }
}


export class Player {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.Camera
  world: CANNON.World
  object3D!: THREE.Object3D
  rigidBody!: CANNON.Body
  loaded: boolean = false
  bulletManger: BulletManger
  horizontal: number = 0
  vertical: number = 0
  up: number = 0
  speed: number = 0
  vector3: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  nextPos: CANNON.Vec3 = new CANNON.Vec3() // 下一个位置的向量
  quaternion: THREE.Quaternion = new THREE.Quaternion(0, 0, 0)
  immersing: boolean = false
  // 射线
  raycaster = new THREE.Raycaster()
  cameraDirection = new THREE.Vector3() // 摄像机方向向量
  blod: number = 100 // 血量
  animationControl: AnimationControl = new AnimationControl()
  keys: { [key: string]: { start: number, duration: number } } = {}
  inAction: boolean = false // 行动中
  behaviorTimer: number = 0
  attackCD: number = 1 / 13  // 攻击间隔
  mouseVector = new THREE.Vector2() // 光标使用的空向量
  windowHalf = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) // 窗口大小的一半
  cameraOffset = new THREE.Vector3(0, 3, -3) // 摄像机的偏移量

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, world: CANNON.World, camera: THREE.Camera) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.world = world
    this.rigidBody = new CANNON.Body({
      mass: 60,
      position: new CANNON.Vec3(10, 1, 10)
    })
    this.rigidBody.fixedRotation = true // 锁定旋转轴
    this.bulletManger = new BulletManger(scene, world)
  }

  initialize() {
    this.load()
    this.initializeEvents()
    return this
  }

  initializeEvents() {
    control.addEventListener('keydown', this.keydown.bind(this))
    control.addEventListener('keyup', this.keyup.bind(this))
    control.addEventListener('pointerdown', this.pointerdown.bind(this))
    control.addEventListener('pointerup', this.pointerup.bind(this))
    control.addEventListener('pointermove', this.pointermove.bind(this))
  }

  resize() {
    this.windowHalf = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2)
  }

  // 清除行为
  clearBebavior() {
    this.inAction = false
    clearTimeout(this.behaviorTimer)
  }

  // 开始行为
  startBehavior(behavior: Function, duration: number) {
    this.clearBebavior()
    this.inAction = true
    this.behaviorTimer = setTimeout(() => {
      behavior()
      this.inAction = false
      this.animationControl.beginAction()
    }, duration)
  }

  // 跳
  jump() {
    this.animationControl.isJumping = true
    this.startBehavior(() => {
      this.animationControl.isJumping = false
    }, 1000)
  }

  // 开火
  fire() {
    if (this.inAction) return
    // const { duration = 0, start } = this.keys.leftClick || {}

    if (this.animationControl.isFring) return
    this.animationControl.isFring = true
    this.attack()
    this.startBehavior(() => {
      this.animationControl.isFring = false
    }, this.attackCD * 1000)

    // if (duration > this.attackCD) {
    //   this.keys.leftClick.duration =  duration - this.attackCD || 0.001
    // }

    // 触发射击
    // if (this.keys.mouseLeft.duration < this.attackCD) {
    //   this.attack()
    // }
    // this.animationControl.beginAction()
  }

  // 攻击
  attack() {
    this.camera.getWorldDirection(this.cameraDirection)
    this.raycaster.camera = this.camera
    this.raycaster.set(this.camera.position.clone(), this.cameraDirection)
    const origin = this.object3D.localToWorld(new THREE.Vector3(0, 1.25, 0.8))
    const intersects = this.raycaster.intersectObjects(this.scene.children)
    const targetModel = intersects.find((intersect: any) => intersect.object.layers.mask === 1)
    if (targetModel) {
      const point = targetModel.point
      const direction = new THREE.Vector3()
      direction.subVectors(point, origin).normalize()
      const bullet = this.bulletManger.create(origin.clone())
      bullet && this.bulletManger.fire(bullet, direction)
    }
  }

  // 换弹
  reloadBullet() {
    this.animationControl.isReload = true
    this.startBehavior(() => {
      this.animationControl.isReload = false
    }, 3000)
  }

  keyNextStep(keyCode: string) {
    if (!this.keys[keyCode]) {
      this.keys[keyCode] = {
        start: 0,
        duration: 0
      }
    }
    const key = this.keys[keyCode]
    const time = clock.getElapsedTime()
    if (!key.start) {
      key.start = time
      key.duration = 0.001
    } else {
      key.duration = time - key.start
    }
    return key
  }

  keydown(event: KeyboardEvent) {
    const keyCode = event.key === ' ' ? 'space' : event.key
    const key = this.keyNextStep(keyCode)
    this.animationControl.keys[keyCode] = key.duration

    if (event.key === 'Escape') {
      this.immersing = false
    }

    if (keyCode === 'space' && !this.animationControl.isJumping) {

      this.jump()
      this.up = 1
      // TODO 触发向上的跳的力
    }

    if (keyCode === 'r') {
      this.animationControl.isReload = false
      this.reloadBullet()
    }

    if (keyCode === 'z') {
      console.log('蹲下')
      this.animationControl.isCrouch = !this.animationControl.isCrouch
    }

    if (keyCode === 'w') {
      this.vertical = 1
    } else if (keyCode === 's') {
      this.vertical = -1
    }

    if (keyCode === 'a') {
      this.horizontal = 1
    } else if (keyCode === 'd') {
      this.horizontal = -1
    }

    this.vector3.set(this.horizontal, 0, this.vertical)
    this.animationControl.beginAction()
  }

  keyup(event: KeyboardEvent) {
    const keyCode = event.key === ' ' ? 'space' : event.key
    this.keys[keyCode].start = 0
    this.keys[keyCode].duration = 0
    this.animationControl.keys[keyCode] = 0
    if (event.key === 'w' || event.key === 's') {
      this.vertical = 0
    }
    if (event.key === 'a' || event.key === 'd') {
      this.horizontal = 0
    }
    this.vector3.set(this.speed * this.horizontal * 0.5, 0, this.speed * this.vertical)
    this.animationControl.beginAction()
  }

  pointerdown(event: PointerEvent) {
    if(dev) return
    if (!this.immersing) {
      this.immersing = true
    }
    const keyCode = {
      0: 'mouseLeft',
      1: 'mouseMiddle',
      2: 'mouseRight'
    }[event.button]
    if (!keyCode) return
    const key = this.keyNextStep(keyCode)
    if (keyCode === 'mouseLeft') {
      this.fire()
    }
    this.animationControl.beginAction()
  }

  pointerup(event: PointerEvent) {
    if(dev) return
    const keyCode = {
      0: 'mouseLeft',
      1: 'mouseMiddle',
      2: 'mouseRight'
    }[event.button]
    if (!keyCode) return

    this.keys[keyCode].start = 0
    this.keys[keyCode].duration = 0
    if (keyCode === 'mouseLeft') {
      // this.animationControl.isFring = false
    }
    this.animationControl.beginAction()
  }

  pointermove(event: PointerEvent) {
    if (!this.immersing) return
    this.mouseVector.x = (event.clientX - this.windowHalf.x) / this.windowHalf.x
    this.mouseVector.y = (event.clientY - this.windowHalf.y) / this.windowHalf.y / 5
    // 计算摄像机的朝向
    const angle = -this.mouseVector.x * Math.PI * 2
    let offsetY = this.cameraOffset.y + this.mouseVector.y
    offsetY = offsetY < 2.7 ? 2.7 : offsetY > 4 ? 4 : offsetY
    this.cameraOffset.setY(offsetY)
    // 计算人物的朝向
    const axios = new CANNON.Vec3(0, 1, 0)
    this.rigidBody.quaternion.setFromAxisAngle(axios, angle)
    return
  }

  createSightBead() {
    const map = new THREE.TextureLoader().load('/images/sightBead.png')
    const material = new THREE.SpriteMaterial({
      map: map,
      sizeAttenuation: false
    })

    const sprite = new THREE.Sprite(material)
    sprite.scale.set(0.2, 0.2, 1)
    this.scene.add(sprite)
  }

  addScene(scene: THREE.Scene) {
    this.scene = scene
  }

  update(delta: number) {
    if (!this.object3D || !this.rigidBody) return
    if (!dev) {
      
      const cameraPosition = this.object3D.localToWorld(this.cameraOffset.clone())
      this.camera.position.copy(cameraPosition)
      this.camera.lookAt(this.object3D.position.clone().setY(2.5))
    }

    // 人物移动
    const vector3 = new CANNON.Vec3(this.vector3.x * delta, this.vector3.y * delta, this.vector3.z * delta)
    const next = new CANNON.Vec3()
    this.rigidBody.pointToWorldFrame(vector3, next)
    this.rigidBody.position = next
    // 物理引擎的位置和四元数同步到渲染世界中
    this.object3D.position.copy(this.rigidBody.position as unknown as THREE.Vector3)
    this.object3D.quaternion.copy(this.rigidBody.quaternion as unknown as THREE.Quaternion)
    this.bulletManger.update(delta)
    this.animationControl.update(delta)
    // this.animationControl.beginAction()
  }

  load() {
    return Promise.all([this.loadPlayer(), this.loadGun()]).then((res:any) => {
      this.loaded = true
      const rightHandBone = this.object3D.getObjectByName('mixamorigRightHand')
      const m4a1 = res[1].scene.children[0]
      m4a1.rotation.set(0, -Math.PI / 2, 0)
      m4a1.position.set(6, 0, 10)
      m4a1.scale.set(2.2, 2.2, 2.2)
      m4a1.name = 'm4a1'
      rightHandBone?.add(m4a1)
      if(dev) {
        const gunGui = debug.gui.addFolder('枪')
        gunGui.add(m4a1.position, 'x')
        gunGui.add(m4a1.position, 'y')
        gunGui.add(m4a1.position, 'z')
        gunGui.add(m4a1.rotation, 'x')
        gunGui.add(m4a1.rotation, 'y')
        gunGui.add(m4a1.rotation, 'z')
        gunGui.add(m4a1.scale, 'x')
        gunGui.add(m4a1.scale, 'y')
        gunGui.add(m4a1.scale, 'z')        
      }
    }).catch(err => {
      console.error(err)
    })
  }

  loadPlayer () {
    return new Promise((resolve, reject) => {
      loader.setDRACOLoader(dracoLoader)
      loader.load('/model/shooter.glb', gltf => {
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
        this.animationControl.initialize(this.object3D, gltf.animations)
        this.scene.add(this.object3D)
        resolve(this.object3D)
      }, undefined, function (error) {
        console.error(error)
        reject(error)
      })
    })

  }

  loadGun () {
    return new Promise((resolve, reject) => {
      loader.load('/model/m4a1-2.glb', gltf => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.type === 'SkinnedMesh') {
            // console.log()
          }
        })
        resolve(gltf)
      }, undefined, function (error) {
        console.error(error)
        reject(error)
      })      
    })
  }
}
