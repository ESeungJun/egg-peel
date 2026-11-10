import * as THREE from 'three'

/** 껍질 조각 하나. tris 는 삼각형 번호(정점 3개씩 묶은 순서), nb 는 모서리를 나눠 가진 이웃 조각 번호 */
export interface Piece { tris: number[]; dist: number; nb: Set<number> }
export interface ShellBase { pos: Float32Array; vid: Uint32Array; verts: number }

/** 같은 자리의 정점에 같은 번호를 붙인다(인덱스 없는 도형에서 모서리를 비교하려고) */
export function weld(pos: Float32Array): ShellBase {
  const ids = new Map<string, number>(), vid = new Uint32Array(pos.length / 3)
  for (let i = 0; i < vid.length; i++) {
    const k = `${Math.round(pos[i * 3] * 1e5)},${Math.round(pos[i * 3 + 1] * 1e5)},${Math.round(pos[i * 3 + 2] * 1e5)}`
    let id = ids.get(k)
    if (id === undefined) { id = ids.size; ids.set(k, id) }
    vid[i] = id
  }
  return { pos, vid, verts: ids.size }
}

/**
 * 껍질을 금 간 조각으로 나눈다. down 은 계란 기준 '아래'(바닥에 닿은 쪽).
 * 부딪힌 곳 근처는 씨앗이 촘촘해 조각이 잘고, 멀수록 크다. 세기(0~1)가 셀수록 조각이 많다.
 */
export function fracture(base: ShellBase, strength: number, down: THREE.Vector3, rnd: () => number = Math.random) {
  const { pos, vid, verts } = base, nv = pos.length / 3, nt = nv / 3
  const at = (i: number, v: THREE.Vector3) => v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
  const P0 = new THREE.Vector3(), impact = new THREE.Vector3()
  let best = -1e9
  for (let i = 0; i < nv; i++) { const d = at(i, P0).dot(down); if (d > best) { best = d; impact.copy(P0) } }

  // 금 씨앗: 부딪힌 곳 근처는 촘촘하게, 멀수록 듬성듬성
  const sigma = 0.012 + strength * 0.02, n = 14 + Math.round(strength * 16)
  const seeds = [impact.clone()]
  for (let tries = 0; seeds.length < n && tries < 4000; tries++) {
    const p = at(Math.floor(rnd() * nv), new THREE.Vector3()), d = p.distanceTo(impact)
    if (rnd() > 0.15 + 0.85 * Math.exp(-d / sigma)) continue
    const minD = 0.003 + d * 0.35
    if (seeds.every((s) => s.distanceTo(p) > minD)) seeds.push(p)
  }
  const wts = seeds.map(() => 0.8 + rnd() * 0.45)

  // 삼각형마다 가장 가까운 씨앗(가중)에 붙인다. 삼각형 크기가 고르므로 경계가 곧은 선에 가깝게 나온다
  const own = new Int32Array(nt), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  for (let t = 0; t < nt; t++) {
    at(t * 3, a); at(t * 3 + 1, b); at(t * 3 + 2, c)
    a.add(b).add(c).divideScalar(3)
    let bi = 0, bd = 1e9
    for (let i = 0; i < seeds.length; i++) { const d = seeds[i].distanceTo(a) / wts[i]; if (d < bd) { bd = d; bi = i } }
    own[t] = bi
  }

  // 삼각형이 하나도 없는 씨앗은 빼고 번호를 다시 매긴다
  const idx = new Int32Array(seeds.length).fill(-1), pieces: Piece[] = []
  for (let t = 0; t < nt; t++) {
    let k = idx[own[t]]
    if (k < 0) { k = idx[own[t]] = pieces.length; pieces.push({ tris: [], dist: seeds[own[t]].distanceTo(impact), nb: new Set() }) }
    pieces[k].tris.push(t)
    own[t] = k
  }
  // 같은 모서리를 가진 조각끼리 이웃
  const edge = new Map<number, number>()
  for (let t = 0; t < nt; t++) for (let e = 0; e < 3; e++) {
    const v1 = vid[t * 3 + e], v2 = vid[t * 3 + (e + 1) % 3]
    if (v1 === v2) continue
    const key = v1 < v2 ? v1 * verts + v2 : v2 * verts + v1, o = edge.get(key)
    if (o === undefined) edge.set(key, own[t])
    else if (o !== own[t]) { pieces[o].nb.add(own[t]); pieces[own[t]].nb.add(o) }
  }
  return { impact, pieces }
}
