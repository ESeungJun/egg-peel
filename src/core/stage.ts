import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { TOP } from './dims'
import { heldCeiling } from './geom'

// 시안 C(밝은 낮 주방) 색. 광량은 접시·병·껍질이 여기 적은 색에 가깝게 보이도록 맞춘 값이다
// (예전 값 exposure 0.92 · env 0.6 · hemi 0.9 · keyI 2.1 + ACES 는 접시 #9fd8bf 가 화면에서 #d2e4dc 로 날아갔다)
export const THEME = {
  bg: '#e9f3ef', exposure: 1, env: 0.3,
  grout: '#cfe3da', tileA: '#f4fbf8', tileB: '#e3f1ea',
  wood: '#b9875a', jars: ['#34c38f', '#ffb547', '#ffffff', '#ff7a6b'], pot: '#c7ccd1', tvFrame: '#24262a',
  tray: '#e7d2ad', bowl: '#ffffff', shell: '#d9a072', shellIn: '#f3ece0', white: '#fffdf8',
  sky: '#ffffff', ground: '#b9c7c0', hemi: 0.45, key: '#fff6e8', keyI: 2, tvLight: '#9fd4ff', tvLightI: 0.3,
}

export { TOP, ER, EH } from './dims'
export const PLATE = new THREE.Vector3(0.62, TOP, -0.12)
// 카메라와 까는 자리는 화면 비율에 따라 바뀐다(값만 바꾸고 객체는 그대로 둔다)
export const CAM = new THREE.Vector3()
export const LOOK = new THREE.Vector3()
export const CENTER = new THREE.Vector3() // 까는 자리
export const LAYOUT = { cs: 3.1, fov: 50, portrait: false, band: false, ceil: 1.7 } // cs: 까는 자리에서 키우는 배율, ceil: 들고 있는 계란의 위쪽 한계
// 가로 화면: 작업대 정면. 가로/세로 0.8~1.2 사이(태블릿 등)는 LAND 와 PORT 를 비율대로 섞는다.
// PORT 는 그 섞기의 끝점으로만 쓴다(0.8 미만은 늘 TV 띠가 생겨 BAND 를 쓴다)
const LAND = { cam: [0, 1.4, 1.0], look: [0, 1.2, -0.5], center: [0, 1.1, 0.25], cs: 3.1, fov: 50 }
const PORT = { cam: [0, 1.62, 1.95], look: [0, 1.12, -0.3], center: [0, 1.3, 1.3], cs: 3.6, fov: 75 }
// 세로 폰 + 위쪽 TV 띠: 벽 TV를 비출 필요가 없으니 시선을 작업대로 내린다
const BAND = { cam: [0, 1.62, 1.3], look: [0, 0.92, -0.3], center: [0, 1.26, 0.78], cs: 3.4, fov: 66 }
/** 세로 폰(TV 띠)에서 작업대 소품을 가운데로 모으는 배율(world/room.ts spreadRoom) */
export const BAND_SPREAD = 0.62

export const COARSE = matchMedia('(pointer: coarse)').matches
export const REDUCE_MOTION = matchMedia('(prefers-reduced-motion: reduce)')

export const renderer = new THREE.WebGLRenderer({ antialias: true })
// 폰은 유튜브 재생과 같이 돌아가므로 픽셀 배율을 1.5까지로 (배터리·발열)
const pixelRatio = () => Math.min(COARSE ? 1.5 : 2, devicePixelRatio)
renderer.setPixelRatio(pixelRatio())
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = true
// 그림자 맵은 움직이는 것이 있을 때만 다시 그린다(main.ts tick). 가만히 있을 때 그리기 호출이 절반으로 준다
renderer.shadowMap.autoUpdate = false
/** 다음 프레임에 그림자 맵을 다시 그리게 한다 */
export const shadowDirty = () => { renderer.shadowMap.needsUpdate = true }
shadowDirty()
/**
 * 처음 몇 프레임은 그림자를 계속 다시 그린다. three.js 는 첫 그림자 패스를 조명 수 0으로 컴파일하고
 * 두 번째 패스에서 조명 수가 든 깊이 셰이더를 다시 만든다. 이걸 첫 터치가 아니라 로딩 때 끝내려는 것이다
 */
export const WARM = { n: 3 }
renderer.shadowMap.type = THREE.PCFShadowMap // 0.187부터 PCFSoft는 없어지고 PCF가 부드럽게 처리한다
renderer.toneMapping = THREE.NeutralToneMapping // 밝은 파스텔 장면에서 ACES 보다 채도를 덜 뺀다
renderer.toneMappingExposure = THEME.exposure
document.body.prepend(renderer.domElement)

export const scene = new THREE.Scene()
scene.background = new THREE.Color(THEME.bg)
/** 환경광(반사·간접광)을 만든다. 렌더 타깃에 담기므로 WebGL 컨텍스트가 복구되면 다시 만들어야 한다 */
function buildEnv() {
  const pm = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment(), old = scene.environment
  scene.environment = pm.fromScene(room, 0.04).texture
  room.dispose()
  pm.dispose()
  old?.dispose()
}
buildEnv()
scene.environmentIntensity = THEME.env
// 폰에서 다른 앱에 다녀오면 컨텍스트를 잃을 수 있다. three.js 가 나머지는 되살리지만 환경맵과 그림자 맵은 직접 다시 만든다
renderer.domElement.addEventListener('webglcontextrestored', () => { buildEnv(); shadowDirty(); WARM.n = 3 })

export const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 20)

/** 3D 화면이 차지하는 영역. 세로 폰에서는 위쪽에 TV 띠(top px)가 있고 그 아래만 그린다 */
export const VIEW = { top: 0, w: 1, h: 1 }

export function resizeStage(top = 0) {
  VIEW.top = top; VIEW.w = innerWidth; VIEW.h = Math.max(1, innerHeight - top)
  renderer.setPixelRatio(pixelRatio()) // 다른 모니터로 옮기거나 확대를 바꿨을 때
  renderer.setSize(VIEW.w, VIEW.h)
  renderer.domElement.style.top = top + 'px'
  camera.aspect = VIEW.w / VIEW.h
  const L = top > 0 ? BAND : camera.aspect < 1.2 ? mix(LAND, PORT, Math.min(1, (1.2 - camera.aspect) / 0.4)) : LAND
  CAM.fromArray(L.cam); LOOK.fromArray(L.look); CENTER.fromArray(L.center)
  LAYOUT.cs = L.cs; LAYOUT.fov = L.fov; LAYOUT.portrait = camera.aspect < 1
  LAYOUT.band = top > 0
  LAYOUT.ceil = heldCeiling(CAM, top > 0)
  camera.fov = L.fov
  camera.position.copy(CAM)
  camera.updateProjectionMatrix()
  camera.lookAt(LOOK)
  camera.updateMatrixWorld() // TV 자리 계산(project)이 바로 새 시점을 쓰도록
  shadowDirty()
}
type Layout = typeof LAND
function mix(a: Layout, b: Layout, t: number): Layout {
  const v = (x: number[], y: number[]) => x.map((n, i) => n + (y[i] - n) * t)
  return { cam: v(a.cam, b.cam), look: v(a.look, b.look), center: v(a.center, b.center), cs: a.cs + (b.cs - a.cs) * t, fov: a.fov + (b.fov - a.fov) * t }
}

/** 월드 좌표 → 화면 픽셀(clientX/Y 와 같은 기준) */
const _p = new THREE.Vector3()
export const toScreen = (o: THREE.Object3D) => toScreenAt(o.getWorldPosition(_p))
export function toScreenAt(p: THREE.Vector3) {
  _p.copy(p).project(camera)
  return { x: (_p.x + 1) / 2 * VIEW.w, y: (1 - _p.y) / 2 * VIEW.h + VIEW.top }
}
