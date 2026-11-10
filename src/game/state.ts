import type * as THREE from 'three'
import type { CrackedEgg, Frag } from '../egg/crack'
import { ymd, toCount } from './days'

export interface CounterEgg { group: THREE.Object3D; egg?: CrackedEgg }
export interface Center extends CrackedEgg {
  ready: boolean // 가운데에 도착했는지
  done: number // 다 깐 시각(0이면 아직)
  from: THREE.Vector3; fromQ: THREE.Quaternion; toQ: THREE.Quaternion | null; t0: number
  aim: THREE.Quaternion | null; aimFrom: THREE.Quaternion | null; aimT0: number // 자동 돌리기
}
export interface Grab { frag: Frag; x: number; y: number; t: number; lx: number; ly: number; lt: number; n: number }

export const S = {
  held: null as THREE.Mesh | null,
  center: null as Center | null,
  grab: null as Grab | null,
  spin: null as { x: number; y: number } | null,
  hist: [] as { y: number; t: number }[], // 들고 있는 계란 높이 기록(내리치는 속도)
  counterEggs: [] as CounterEgg[],
  plated: [] as THREE.Mesh[],
}

const K = 'egg-peel:'
const dayKey = () => `${K}day:${ymd(new Date())}` // YYYY-MM-DD(내 시간대)
const num = (k: string) => { try { return toCount(localStorage.getItem(k)) } catch { return 0 } }
/** 그날(YYYY-MM-DD) 깐 개수 */
export const dayCount = (day: string) => num(`${K}day:${day}`)

export const stats = { total: num(K + 'total'), today: num(dayKey()), order: 8, ono: 1, prog: 0 }

export function countPeeled() {
  const dk = dayKey()
  stats.today = num(dk) + 1
  stats.total++
  stats.prog++
  try { localStorage.setItem(K + 'total', String(stats.total)); localStorage.setItem(dk, String(stats.today)) } catch { /* 저장 공간이 막혀도 놀이는 계속 */ }
}

export const store = {
  get: (k: string) => { try { return localStorage.getItem(K + k) } catch { return null } },
  set: (k: string, v: string) => { try { localStorage.setItem(K + k, v) } catch { /* 무시 */ } },
}
