import * as THREE from 'three'
import { scene, TOP, EH, THEME, shadowDirty } from '../core/stage'
import { mat, shellMat } from '../core/materials'
import { eggG } from './shape'

/** 더미의 한 자리. off 는 채워질 때 위에서 떨어지는 중인 높이(0이면 제자리) */
interface Slot { p: THREE.Vector3; q: THREE.Quaternion; on: boolean; off: number; v: number }

export const PILE = { x: -0.62 }
const slots: Slot[] = []
const live: Slot[] = [] // 그려지는 순서(인스턴스 번호)와 같다
// 닫힌 도형이라 앞면만 그린다. 52개를 한 번에 그린다(그리기 호출 52 -> 1, 그림자 패스도 같다)
const pileMat = mat(THEME.shell, { roughness: 0.55 })
const mesh = new THREE.InstancedMesh(eggG, pileMat, 52)
mesh.castShadow = mesh.receiveShadow = true
mesh.frustumCulled = false
mesh.count = 0
scene.add(mesh)
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1)

function place(i: number) {
  const s = live[i]
  mesh.setMatrixAt(i, _m.compose(_p.copy(s.p).setY(s.p.y + s.off), s.q, _one))
  mesh.instanceMatrix.needsUpdate = true
}
function sync() {
  mesh.boundingSphere = null // 광선 검사가 옛 범위로 걸러 내지 않게 다시 계산시킨다
  mesh.count = live.length; for (let i = 0; i < live.length; i++) place(i); shadowDirty()
}

export function makeEgg() {
  const m = new THREE.Mesh(eggG, shellMat)
  m.castShadow = m.receiveShadow = true
  return m
}
export const pileCount = () => live.length
/** 가장 위에 있는 계란 자리(개발용 측정에서 쓴다) */
export const pileTop = () => live.reduce((a, b) => (b.p.y > a.p.y ? b : a)).p.clone()

/** 계란판 위에 피라미드로 쌓은 더미 */
export function buildPile() {
  slots.length = live.length = 0
  const layers = [[6, 4], [5, 3], [4, 2], [3, 1], [2, 1]], e = new THREE.Euler()
  layers.forEach(([nx, nz], l) => {
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      e.set((Math.random() - 0.5) * 0.5, Math.random() * 6, (Math.random() - 0.5) * 0.5 + (l > 0 ? (i - (nx - 1) / 2) * 0.25 : 0))
      const s: Slot = { p: new THREE.Vector3(PILE.x + (i - (nx - 1) / 2) * 0.052, TOP + 0.025 + EH + l * 0.046, -0.28 + (k - (nz - 1) / 2) * 0.054 + (l % 2) * 0.01), q: new THREE.Quaternion().setFromEuler(e), on: true, off: 0, v: 0 }
      slots.push(s); live.push(s)
    }
  })
  sync()
}

/** 빈 자리만 위에서 떨어뜨려 채운다. 남아 있던 계란은 그대로 둔다 */
export function refillPile() {
  let n = 0
  for (const s of slots) if (!s.on) { s.on = true; s.off = 0.22 + n++ * 0.012; s.v = 0; live.push(s) }
  sync()
}

/** 채워지는 계란을 떨어뜨린다. 움직인 것이 있으면 true */
export function updatePile(dt: number) {
  let moved = false
  for (let i = 0; i < live.length; i++) {
    const s = live[i]
    if (!s.off) continue
    s.v += 3 * dt
    s.off = Math.max(0, s.off - s.v * dt)
    place(i)
    moved = true
  }
  return moved
}

/** 더미 자리를 옮긴다(세로 폰 배치). 남은 계란도 같이 옮긴다 */
export function movePile(x: number) {
  const dx = x - PILE.x
  PILE.x = x
  for (const s of slots) s.p.x += dx
  sync()
}

/**
 * 광선에 맞은 계란, 없으면 화면에서 (x, y)에 가장 가까운(r px 안) 계란을 더미에서 빼서 낱개 메시로 돌려준다.
 * toScreen 은 월드 좌표를 화면 픽셀로 바꾸는 함수.
 */
export function takeFromPile(ray: THREE.Raycaster, near: (p: THREE.Vector3) => number, r: number): THREE.Mesh | null {
  let i = ray.intersectObject(mesh, false)[0]?.instanceId ?? -1
  if (i < 0) { let bd = r; live.forEach((s, k) => { const d = near(s.p); if (d < bd) { bd = d; i = k } }) }
  if (i < 0) return null
  const s = live[i], m = makeEgg()
  m.position.copy(s.p).setY(s.p.y + s.off)
  m.quaternion.copy(s.q)
  scene.add(m)
  s.on = false; s.off = 0
  live[i] = live[live.length - 1]; live.pop() // 마지막 것을 빈 번호로 옮긴다
  sync()
  return m
}
