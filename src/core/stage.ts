import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

// 시안 C(밝은 낮 주방) 색
export const THEME = {
  bg: '#e9f3ef', exposure: 0.92, env: 0.6,
  grout: '#cfe3da', tileA: '#f4fbf8', tileB: '#e3f1ea',
  wood: '#b9875a', jars: ['#34c38f', '#ffb547', '#ffffff', '#ff7a6b'], pot: '#c7ccd1', tvFrame: '#24262a',
  tray: '#e7d2ad', bowl: '#ffffff', shell: '#d9a072', white: '#fffdf8',
  sky: '#ffffff', ground: '#b9c7c0', hemi: 0.9, key: '#fff6e8', keyI: 2.1, tvLight: '#9fd4ff', tvLightI: 0.3,
}

export const TOP = 0.9 // 작업대 높이(m)
export const ER = 0.024 // 계란 반지름
export const EH = 0.031 // 계란 반높이
export const PLATE = new THREE.Vector3(0.62, TOP, -0.12)
// 카메라와 까는 자리는 화면 비율에 따라 바뀐다(값만 바꾸고 객체는 그대로 둔다)
export const CAM = new THREE.Vector3()
export const LOOK = new THREE.Vector3()
export const CENTER = new THREE.Vector3() // 까는 자리
export const LAYOUT = { cs: 3.1, fov: 50, portrait: false } // cs: 까는 자리에서 키우는 배율
// 가로 화면: 작업대 정면. 세로 화면(폰): 뒤로 물러나 더미·접시가 들어오게 하고, 까는 계란은 앞으로 당겨 크게
const LAND = { cam: [0, 1.4, 1.0], look: [0, 1.2, -0.5], center: [0, 1.1, 0.25], cs: 3.1, fov: 50 }
const PORT = { cam: [0, 1.62, 1.95], look: [0, 1.12, -0.3], center: [0, 1.3, 1.3], cs: 3.6, fov: 75 }
export const COARSE = matchMedia('(pointer: coarse)').matches

export const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(2, devicePixelRatio))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap // 0.187부터 PCFSoft는 없어지고 PCF가 부드럽게 처리한다
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = THEME.exposure
document.body.prepend(renderer.domElement)

export const scene = new THREE.Scene()
scene.background = new THREE.Color(THEME.bg)
const pm = new THREE.PMREMGenerator(renderer)
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = THEME.env
pm.dispose()

export const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 20)

export function resizeStage() {
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  const L = camera.aspect < 0.8 ? PORT : camera.aspect < 1.2 ? mix(LAND, PORT, (1.2 - camera.aspect) / 0.4) : LAND
  CAM.fromArray(L.cam); LOOK.fromArray(L.look); CENTER.fromArray(L.center)
  LAYOUT.cs = L.cs; LAYOUT.fov = L.fov; LAYOUT.portrait = camera.aspect < 1
  camera.fov = L.fov
  camera.position.copy(CAM)
  camera.updateProjectionMatrix()
  camera.lookAt(LOOK)
  camera.updateMatrixWorld() // TV 자리 계산(project)이 바로 새 시점을 쓰도록
}
type Layout = typeof LAND
function mix(a: Layout, b: Layout, t: number): Layout {
  const v = (x: number[], y: number[]) => x.map((n, i) => n + (y[i] - n) * t)
  return { cam: v(a.cam, b.cam), look: v(a.look, b.look), center: v(a.center, b.center), cs: a.cs + (b.cs - a.cs) * t, fov: a.fov + (b.fov - a.fov) * t }
}

/** 월드 좌표 → 화면 픽셀 */
const _p = new THREE.Vector3()
export function toScreen(o: THREE.Object3D) {
  o.getWorldPosition(_p).project(camera)
  return { x: (_p.x + 1) / 2 * innerWidth, y: (1 - _p.y) / 2 * innerHeight }
}
