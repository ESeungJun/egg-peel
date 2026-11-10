import * as THREE from 'three'
import { CAM, CENTER } from '../core/stage'
import { shellMat, whiteMat } from '../core/materials'
import { eggGeo } from './shape'
import { fracture, weld } from './fracture'

// 흰자와 껍질 바탕은 한 번만 만든다. 껍질은 삼각형 8,820개(가장 긴 변 약 1.5mm)
const WHITE_G = eggGeo(12)
const SHELL_G = eggGeo(20)
const BASE = weld(SHELL_G.attributes.position.array as Float32Array)
const SHELL_N = SHELL_G.attributes.normal.array as Float32Array

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
  const white = new THREE.Mesh(WHITE_G, whiteMat)
  white.scale.setScalar(0.975)
  white.castShadow = true
  group.add(white)

  const { impact, pieces } = fracture(BASE, strength, down)
  const arr = BASE.pos
  const frags = pieces.map((pc) => {
    const list = pc.tris
    const P = new Float32Array(list.length * 9), N = new Float32Array(list.length * 9), cen = new THREE.Vector3()
    list.forEach((t, j) => {
      P.set(arr.subarray(t * 9, t * 9 + 9), j * 9); N.set(SHELL_N.subarray(t * 9, t * 9 + 9), j * 9)
      for (let v = 0; v < 9; v += 3) { cen.x += arr[t * 9 + v]; cen.y += arr[t * 9 + v + 1]; cen.z += arr[t * 9 + v + 2] }
    })
    cen.divideScalar(list.length * 3)
    for (let j = 0; j < P.length; j += 3) { P[j] -= cen.x; P[j + 1] -= cen.y; P[j + 2] -= cen.z }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(P, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3))
    const f = new THREE.Mesh(g, shellMat) as unknown as Frag
    f.castShadow = true
    f.userData = { local: cen.clone(), base: cen.clone(), nb: new Set(), dist: pc.dist, state: 'intact', lift: 0, gone: false, wig: 0 }
    group.add(f)
    return f
  })
  pieces.forEach((pc, i) => { for (const o of pc.nb) frags[i].userData.nb.add(frags[o]) })

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
  for (const f of e.frags) if (!f.userData.gone) f.geometry.dispose() // 떨어진 조각은 날아가는 쪽에서 해제
}
