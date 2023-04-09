import * as THREE from 'three'
const textureLoader = new THREE.TextureLoader()
// const rocksColorTexture = textureLoader.load( '/desert/Rocks014_2K_Color.jpg' )
// const rocksDisplacementTexture = textureLoader.load( '/desert/Rocks014_2K_Displacement.jpg' )
// const rocksNormalGLTexture = textureLoader.load( '/desert/Rocks014_2K_NormalGL.jpg' )
// const rocksRoughnessTexture = textureLoader.load( '/desert/Rocks014_2K_Roughness.jpg' )
// rocksColorTexture.repeat.set(50, 50)
// rocksColorTexture.wrapS = THREE.RepeatWrapping // 水平重复，纹理将简单地重复到无穷大
// rocksColorTexture.wrapT = THREE.MirroredRepeatWrapping // 垂直镜像重复，纹理将重复到无穷大，在每次重复时将进行镜像
// export const rocksMaterial = new THREE.MeshStandardMaterial({
// 	side: THREE.DoubleSide, // 正反面都贴图
// 	map: rocksColorTexture, // 颜色贴图
// 	normalMap: rocksDisplacementTexture, // 法线贴图的纹理
// 	displacementMap: rocksNormalGLTexture, // 位移贴图
// 	roughnessMap: rocksRoughnessTexture // 该纹理的绿色通道用于改变材质的粗糙度
// })


const forestColorTexture = textureLoader.load( '/texture/forest_floor/forest_floor_diff_2k.jpg' )
const forestDisplacementTexture = textureLoader.load( '/texture/forest_floor/forest_floor_disp_2k.png' )
forestColorTexture.repeat.set(300, 300) // 决定纹理在表面的重复次数
forestColorTexture.wrapS = THREE.RepeatWrapping // 水平重复，纹理将简单地重复到无穷大
forestColorTexture.wrapT = THREE.MirroredRepeatWrapping // 垂直镜像重复，纹理将重复到无穷大，在每次重复时将进行镜像
export const forestMaterial = new THREE.MeshStandardMaterial({
	side: THREE.DoubleSide, // 正反面都贴图
	map: forestColorTexture,
	normalMap: forestDisplacementTexture,
})
