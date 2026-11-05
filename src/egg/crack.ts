import * as THREE from 'three'
import { CAM, CENTER } from '../core/stage'
import { shellMat, whiteMat } from '../core/materials'
import { eggGeo } from './shape'

export type FragState = 'cracked' | 'hair' | 'intact'
export interface FragData {
  local: THREE.Vector3 // 계란 안에서 조각 중심
  base: THREE.Vector3 // 지금 놓인 자리(들뜬 정도 반영)
  nb: Set<Frag> // 모서리를 나눠 가진 이웃
  dist: number // 부딪힌 곳까지 거리
  state: FragState
  lift: 0 | 1 | 2 // 0 멀쩡(틈 없음) · 1 실금 · 2 벌어짐
  gone: boolean
  wig: number // 떨림 시작 시각(0이면 없음)
}
export type Frag = THREE.Mesh & { userData: FragData }
export interface CrackedEgg { group: THREE.Group; white: THREE.Mesh; frags: Frag[]; impact: THREE.Vector3 }

function hash(x: number, y: number, z: number) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s) }

const LIFT: Record<0 | 1 | 2, [number, number]> = { 0: [1, 1], 1: [1.002, 0.995], 2: [1.01, 0.955] }
export function setLift(f: Frag, lv: 0 | 1 | 2) {
  const u = f.userData
  u.lift = Math.max(u.lift, lv) as 0 | 1 | 2
  const [pk, sk] = LIFT[u.lift]
  u.base.copy(u.local).multiplyScalar(pk)
  f.position.copy(u.base)
  f.scale.setScalar(sk)
}

/** 벌어진 조각, 또는 이웃이 떨어져 나간 조각만 뗄 수 있다 */
export const canGrab = (f: Frag) => f.userData.state === 'cracked' || [...f.userData.nb].some((o) => o.userData.gone)
export function exposeAround(f: Frag) { for (const o of f.userData.nb) if (!o.userData.gone) setLift(o, 1) }

/**
 * 금 간 계란. down은 계란 기준 '아래' 방향(내리칠 때 바닥에 닿은 쪽).
 * 부딪힌 곳 근처는 잘게, 멀수록 크게 나누고, 세기(0~1)만큼 넓게 벌어진다.
 */
export function crackedEgg(strength: number, down = new THREE.Vector3(0, -1, 0)): CrackedEgg {
  const group = new THREE.Group()
  const white = new THREE.Mesh(eggGeo(48, 40), whiteMat)
  white.scale.setScalar(0.975)
  white.castShadow = true
  group.add(white)

  const sg = eggGeo(56, 44).toNonIndexed()
  const pos = sg.attributes.position, nor = sg.attributes.normal
  const P0 = new THREE.Vector3()
  const impact = new THREE.Vector3()
  let best = -1e9
  for (let i = 0; i < pos.count; i++) { const d = P0.fromBufferAttribute(pos, i).dot(down); if (d > best) { best = d; impact.copy(P0) } }

  // 금 씨앗: 부딪힌 곳 근처는 촘촘하게, 멀수록 듬성듬성
  const sigma = 0.012 + strength * 0.02, n = 14 + Math.round(strength * 16)
  const seeds = [impact.clone()]
  for (let tries = 0; seeds.length < n && tries < 4000; tries++) {
    const p = new THREE.Vector3().fromBufferAttribute(pos, Math.floor(Math.random() * pos.count)), d = p.distanceTo(impact)
    if (Math.random() > 0.15 + 0.85 * Math.exp(-d / sigma)) continue
    const minD = 0.003 + d * 0.35
    if (seeds.every((s) => s.distanceTo(p) > minD)) seeds.push(p)
  }
  const wts = seeds.map(() => 0.8 + Math.random() * 0.45), salt = Math.random() * 100

  // 삼각형마다 가장 가까운 씨앗(가중·흔들림)에 붙인다
  const tris: number[][] = seeds.map(() => [])
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Vector3()
  for (let t = 0; t < pos.count; t += 3) {
    a.fromBufferAttribute(pos, t); b.fromBufferAttribute(pos, t + 1); c.fromBufferAttribute(pos, t + 2)
    m.copy(a).add(b).add(c).divideScalar(3)
    let bi = 0, bd = 1e9
    for (let i = 0; i < seeds.length; i++) {
      const d = seeds[i].distanceTo(m) / wts[i] * (1 + (hash(m.x * 900 + salt, m.y * 900, i) - 0.5) * 0.45)
      if (d < bd) { bd = d; bi = i }
    }
    tris[bi].push(t)
  }

  const arr = pos.array as Float32Array, narr = nor.array as Float32Array
  const key = (i: number) => `${Math.round(arr[i * 3] * 1e5)},${Math.round(arr[i * 3 + 1] * 1e5)},${Math.round(arr[i * 3 + 2] * 1e5)}`
  const edgeOwner = new Map<string, Frag>()
  const frags: Frag[] = []
  tris.forEach((list, i) => {
    if (!list.length) return
    const P = new Float32Array(list.length * 9), N = new Float32Array(list.length * 9), cen = new THREE.Vector3()
    list.forEach((t, j) => {
      for (let v = 0; v < 3; v++) {
        for (let k = 0; k < 3; k++) { P[j * 9 + v * 3 + k] = arr[(t + v) * 3 + k]; N[j * 9 + v * 3 + k] = narr[(t + v) * 3 + k] }
        cen.x += arr[(t + v) * 3]; cen.y += arr[(t + v) * 3 + 1]; cen.z += arr[(t + v) * 3 + 2]
      }
    })
    cen.divideScalar(list.length * 3)
    for (let j = 0; j < P.length; j += 3) { P[j] -= cen.x; P[j + 1] -= cen.y; P[j + 2] -= cen.z }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(P, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3))
    const f = new THREE.Mesh(g, shellMat) as unknown as Frag
    f.castShadow = true
    f.userData = { local: cen.clone(), base: cen.clone(), nb: new Set(), dist: seeds[i].distanceTo(impact), state: 'intact', lift: 0, gone: false, wig: 0 }
    // 같은 모서리를 가진 조각끼리 이웃
    for (const t of list) for (let e = 0; e < 3; e++) {
      const k1 = key(t + e), k2 = key(t + (e + 1) % 3)
      if (k1 === k2) continue
      const ek = k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1, o = edgeOwner.get(ek)
      if (o && o !== f) { o.userData.nb.add(f); f.userData.nb.add(o) } else if (!o) edgeOwner.set(ek, f)
    }
    group.add(f)
    frags.push(f)
  })
  sg.dispose()

  // 부딪힌 곳 근처만 벌어지고, 그 바깥은 실금, 나머지는 멀쩡
  const crackR = 0.007 + strength * 0.017
  ;[...frags].sort((x, y) => x.userData.dist - y.userData.dist).forEach((f, i) => {
    const d = f.userData.dist
    f.userData.state = d < crackR || i < 2 ? 'cracked' : d < crackR * 1.6 ? 'hair' : 'intact'
    setLift(f, f.userData.state === 'cracked' ? 2 : f.userData.state === 'hair' ? 1 : 0)
  })
  return { group, white, frags, impact }
}

/** 금 간 곳이 카메라 쪽을 보게 하는 회전(그 축으로는 무작위로 돌림) */
export function faceCamera(impact: THREE.Vector3) {
  const toCam = CAM.clone().sub(CENTER).normalize(), axis = impact.clone().normalize()
  return new THREE.Quaternion().setFromUnitVectors(axis, toCam).multiply(new THREE.Quaternion().setFromAxisAngle(axis, Math.random() * 6))
}

export function disposeEgg(e: CrackedEgg) {
  e.white.geometry.dispose()
  for (const f of e.frags) if (!f.userData.gone) f.geometry.dispose() // 떨어진 조각은 날아가는 쪽에서 해제
}
