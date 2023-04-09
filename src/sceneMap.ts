import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { threeToCannon, ShapeType } from 'three-to-cannon'
import { forestMaterial } from './texture'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Sky } from 'three/examples/jsm/objects/Sky'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
const loader = new GLTFLoader()

export class SceneMap {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.Camera
  world: CANNON.World
  rigidBody!: CANNON.Body
  width: number = 500
  height: number = 500
  loaded: boolean = false
  sky!: Sky
  sun: THREE.Vector3 = new THREE.Vector3()
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, world: CANNON.World, camera: THREE.Camera, width?: number, height?: number) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.world = world
    this.rigidBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(0, 0, 0)
    })
    this.width = width || this.width
    this.height = height || this.height
  }

  initialize() {
    // 平面
    const planeGeometry = new THREE.PlaneGeometry(this.width, this.height)
    const plane = new THREE.Mesh(planeGeometry, forestMaterial)
    plane.rotateX(Math.PI * 0.5)
    plane.name = 'floor'
    this.scene.add(plane)
    const result = threeToCannon(plane)
    if (result) {
      const { shape, offset, orientation } = result
      this.rigidBody.addShape(shape, offset, orientation)
    }
    this.rigidBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0) // 面向屏幕
    this.world.addBody(this.rigidBody)
    this.initializeSky()
    this.openLight()
    this.load()
  }

  load() {
    loader.load('/public/model/city-split.glb', gltf => {
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          const rigidBody = new CANNON.Body({
            mass: 0, // kg
            position: new CANNON.Vec3(0, 0, 0), // m
          })
          const result = threeToCannon(child, { type: ShapeType.BOX })
          if (result) {
            const { shape, offset, orientation } = result
            rigidBody.addShape(shape, offset, orientation)
          }
          rigidBody.quaternion.setFromEuler(Math.PI / 2, 0, 0)
          this.world.addBody(rigidBody)
        }
      })
      gltf.scene.name = 'builds'
      this.scene.add(gltf.scene)
      this.loaded = true
    }, undefined, function (error) {
      console.error(error)
    })
  }


  openLight() {
    const ambientLight = new THREE.AmbientLight(0xFFFFFF) // soft white light
    const HemispherLight = new THREE.HemisphereLight(0xffffbb, 0xeeeeee, 1)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(0, 100, 0)

    const pointLight = new THREE.PointLight(0xff0000, 1, 100)
    pointLight.position.set(50, 50, 50)
    this.scene.add(ambientLight)
    this.scene.add(directionalLight)
    this.scene.add(HemispherLight)
    // this.scene.add(pointLight)
  }

  initializeSky() {
    this.sky = new Sky()
    this.sky.scale.setScalar(450000)
    this.scene.add(this.sky)
    const effectController = {
      turbidity: 10,
      rayleigh: 3,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.7,
      elevation: 2,
      azimuth: 180,
      exposure: this.renderer.toneMappingExposure
    }

    const guiChanged = () => {

      const uniforms = this.sky.material.uniforms
      uniforms['turbidity'].value = effectController.turbidity
      uniforms['rayleigh'].value = effectController.rayleigh
      uniforms['mieCoefficient'].value = effectController.mieCoefficient
      uniforms['mieDirectionalG'].value = effectController.mieDirectionalG
      const phi = THREE.MathUtils.degToRad(90 - effectController.elevation)
      const theta = THREE.MathUtils.degToRad(effectController.azimuth)
      this.sun.setFromSphericalCoords(1, phi, theta)
      uniforms['sunPosition'].value.copy(this.sun)
      this.renderer.toneMappingExposure = effectController.exposure
      this.renderer.render(this.scene, this.camera)

    }

    const gui = new GUI()
    gui.add(effectController, 'turbidity', 0.0, 20.0, 0.1).onChange(guiChanged)
    gui.add(effectController, 'rayleigh', 0.0, 4, 0.001).onChange(guiChanged)
    gui.add(effectController, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(guiChanged)
    gui.add(effectController, 'mieDirectionalG', 0.0, 1, 0.001).onChange(guiChanged)
    gui.add(effectController, 'elevation', 0, 90, 0.1).onChange(guiChanged)
    gui.add(effectController, 'azimuth', - 180, 180, 0.1).onChange(guiChanged)
    gui.add(effectController, 'exposure', 0, 1, 0.0001).onChange(guiChanged)

    guiChanged()
    return this
  }
}

