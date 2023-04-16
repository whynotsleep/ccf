import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as CANNON from 'cannon-es'
import { threeToCannon, ShapeType } from 'three-to-cannon'
import CannonDebugger from 'cannon-es-debugger'
import { Ticker } from './utils/ticker'
import { WorldMap } from './map'
import { Player } from './player'
import {dev} from './config'
window.THREE = THREE
// 改变three朝向
// THREE.Object3D.DEFAULT_UP.set(0, 0, 1)
// THREE.Object3D.DEFAULT_MATRIX_AUTO_UPDATE = true 

const renderer = new THREE.WebGLRenderer()
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000)
const world = new CANNON.World()
const cannonDebugger = CannonDebugger(scene, world)
world.gravity.set(0, -9.82, 0) // m/s²
// world.allowSleep = true
camera.position.set(0, 20, 10)
// camera.rotateX(-Math.PI / 2)
renderer.setSize(window.innerWidth, window.innerHeight)
// 开启物理正确的照明
renderer.physicallyCorrectLights = true
// 设置canvas的像素比为当前设备的屏幕像素比，避免高分屏下模糊
renderer.setPixelRatio(window.devicePixelRatio)
scene.background = new THREE.Color(0xeeeeee)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
const cannonDefaultMaterial = new CANNON.Material()
const cannonDefaultCantactMaterial = new CANNON.ContactMaterial(
	cannonDefaultMaterial,
	cannonDefaultMaterial,
	{
		friction: 0.5,
		restitution: 0.7,
	}
)
// 将两个默认材质添加到物理世界world中
world.addContactMaterial(cannonDefaultCantactMaterial)

// THREE.DefaultLoadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
// 	console.log('开始加载文件: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.')
// }
// THREE.DefaultLoadingManager.onLoad = function () {
// 	console.log('加载完成!')
// }
// THREE.DefaultLoadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
// 	console.log('加载文件: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.')
// }
// THREE.DefaultLoadingManager.onError = function (url) {
// 	console.log('文件加载失败： ' + url)
// }


const sceneMap = new WorldMap(renderer, scene, world, camera).initialize()
const player = new Player(renderer, scene, world, camera).initialize()


// 辅助线
const size = 500
const divisions = 500
const gridHelper = new THREE.GridHelper(size, divisions)
gridHelper.name = 'gridHelper'
gridHelper.layers.set(1)
scene.add(gridHelper)


const ticker = new Ticker(renderer, scene, camera)
const fixedTimeStep = 1.0 / 60.0 // seconds
const maxSubSteps = 3
ticker.add(function (delta: number) {
	if (dev) {
		controls.update()
	}
	world.step(fixedTimeStep, delta, maxSubSteps)
	cannonDebugger.update()
})
ticker.add(player.update, player)
ticker.start()



// 射线
const raycaster = new THREE.Raycaster()



// function onPointerMove(event: any) {
// 	const pointer = new THREE.Vector2()
// 	// 将鼠标位置归一化为设备坐标。x 和 y 方向的取值范围是 (-1 to +1)
// 	pointer.x = (event.clientX / window.innerWidth) * 2 - 1
// 	pointer.y = - (event.clientY / window.innerHeight) * 2 + 1
// 	// 通过摄像机和鼠标位置更新射线
// 	raycaster.setFromCamera(pointer, camera)

// 	// 计算物体和射线的焦点
// 	const intersects = raycaster.intersectObjects(scene.children)
// 	for (let i = 0 i <intersects.length i++ ) {
// 		if (intersects[i].object.name === 'tile') {
// 			targetPos = intersects[i].point
// 		}
// 	}

// }

// window.addEventListener('pointermove', onPointerMove)



