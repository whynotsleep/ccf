import * as THREE from 'three'
import * as CANNON from 'cannon-es'

let bulletCount = 0
export class Bullet {
  uid:number
  object3D:THREE.Object3D
  rigidBody:CANNON.Body
  speed:number = 200
  constructor (position:THREE.Vector3) {
    this.uid = ++bulletCount
    const geometry = new THREE.CylinderGeometry( 1, 1, 1, 6, 1 )
    const material = new THREE.MeshBasicMaterial( {color: 0xffff00} )
    this.object3D = new THREE.Mesh( geometry, material )
    const size = new THREE.Vector3(0.02, 0.02, 0.08)
    this.object3D.scale.set(size.x, size.y, size.z)
    this.object3D.position.copy(position)
    const halfExtents = new CANNON.Vec3(size.x, size.y, size.z)
    const offset = new CANNON.Vec3(size.x, size.y, size.z)
    const boxShape = new CANNON.Box(halfExtents)
    this.rigidBody = new CANNON.Body({
      mass: 0.2,
      position: position as unknown as CANNON.Vec3,
      shape: boxShape
    })
  }

  fire (normal:THREE.Vector3) {
    this.rigidBody.applyForce(new CANNON.Vec3(normal.x * this.speed, normal.y * this.speed, normal.z * this.speed))
  }

  update(delta:number) {
    this.object3D.position.copy(this.rigidBody.position as unknown as THREE.Vector3)
    this.object3D.quaternion.copy(this.rigidBody.quaternion as unknown as THREE.Quaternion)
  }
}

export class BulletManger {

  scene: THREE.Scene
  world: CANNON.World
  bullets:Array<Bullet> = []
  constructor (scene:THREE.Scene, world:CANNON.World) {
    this.scene = scene
    this.world = world
  }

  create (position:THREE.Vector3) {
    const bullet = new Bullet(position)
    this.scene.add(bullet.object3D)
    this.world.addBody(bullet.rigidBody)
    return bullet
  }

  fire (bullet:Bullet, target:THREE.Vector3) {
    this.bullets.push(bullet)
    bullet.fire(target)
  }

  update (delta:number) {
    this.bullets.forEach(bullet => bullet.update(delta))
  }
}