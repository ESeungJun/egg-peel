import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { eggGeo, eggPoint, lowest } from '../src/egg/shape.ts'
import { fracture, weld } from '../src/egg/fracture.ts'
import { ER, EH } from '../src/core/dims.ts'

const deg = (r: number) => r * 180 / Math.PI

test('꼭지·허리의 자리와 법선', () => {
  const p = new THREE.Vector3(), n = new THREE.Vector3()
  eggPoint(0, -1, 0, p, n)
  assert.deepEqual(p.toArray().map((v) => +v.toFixed(6)), [0, -EH, 0])
  assert.ok(n.distanceTo(new THREE.Vector3(0, -1, 0)) < 1e-9)
  eggPoint(0, 1, 0, p, n)
  assert.ok(n.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-9)
  eggPoint(1, 0, 0, p, n)
  assert.ok(Math.abs(p.x - ER) < 1e-9 && n.x > 0.99)
})

test('법선이 겉면에 수직이다(가까운 두 점을 이은 선과 직각)', () => {
  const p = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Vector3(), m = new THREE.Vector3()
  for (let i = 0; i < 200; i++) {
    const u = new THREE.Vector3(Math.sin(i * 1.7), Math.cos(i * 0.9), Math.sin(i * 2.3 + 1)).normalize()
    const t = new THREE.Vector3(0.3, 0.5, -0.4).cross(u).normalize()
    eggPoint(u.x, u.y, u.z, p, n)
    const v = u.clone().addScaledVector(t, 1e-4).normalize()
    eggPoint(v.x, v.y, v.z, q, m)
    assert.ok(Math.abs(q.sub(p).normalize().dot(n)) < 2e-3)
  }
})

test('같은 자리의 정점은 법선이 같다(이음매 0도), 삼각형 크기가 고르다', () => {
  const g = eggGeo(20), pos = g.attributes.position.array as Float32Array, nor = g.attributes.normal.array as Float32Array
  const { vid, verts } = weld(pos)
  const first = new Int32Array(verts).fill(-1), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  let seam = 0
  for (let i = 0; i < vid.length; i++) {
    const f = first[vid[i]]
    if (f < 0) { first[vid[i]] = i; continue }
    seam = Math.max(seam, deg(a.fromArray(nor, i * 3).angleTo(b.fromArray(nor, f * 3))))
  }
  assert.ok(seam < 0.01, `이음매 법선 차 ${seam}`)
  assert.equal(pos.length / 9, 8820)
  let lo = 1e9, hi = 0
  for (let t = 0; t < pos.length; t += 9) { const ar = new THREE.Triangle(a.fromArray(pos, t), b.fromArray(pos, t + 3), c.fromArray(pos, t + 6)).getArea(); lo = Math.min(lo, ar); hi = Math.max(hi, ar) }
  assert.ok(hi / lo < 4, `삼각형 넓이 최대/최소 ${hi / lo}`) // 회전체일 때는 365배였다
})

test('가장 아래 점: 똑바로 서면 반높이, 눕히면 반지름쯤', () => {
  assert.ok(Math.abs(lowest(new THREE.Quaternion()) - EH) < 1e-4)
  const side = lowest(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2))
  assert.ok(side > ER * 0.99 && side < ER * 1.1)
})

// 시드 고정 난수(mulberry32)
function rng(seed: number) { return () => { let t = (seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const base = weld(eggGeo(20).attributes.position.array as Float32Array)

test('조각 나누기: 모든 삼각형이 한 조각에만 들어가고, 세기만큼 조각이 는다', () => {
  for (const [s, lo, hi] of [[0, 8, 14], [0.5, 12, 22], [1, 16, 30]] as const) {
    const { pieces, impact } = fracture(base, s, new THREE.Vector3(0, -1, 0), rng(7))
    const seen = new Uint8Array(8820)
    for (const p of pieces) for (const t of p.tris) { assert.equal(seen[t], 0); seen[t] = 1 }
    assert.equal(seen.reduce((x, y) => x + y, 0), 8820)
    assert.ok(pieces.length >= lo && pieces.length <= hi, `세기 ${s}: 조각 ${pieces.length}개`)
    assert.ok(pieces.every((p) => p.tris.length > 0))
    assert.ok(Math.abs(impact.y + EH) < 1e-4) // 아래로 내리치면 부딪힌 곳은 아래 꼭지
  }
})

test('조각 나누기: 이웃은 서로를 가리키고, 어느 조각에서든 이웃을 따라 모든 조각에 닿는다', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const down = new THREE.Vector3(Math.sin(seed), Math.cos(seed * 2), Math.sin(seed * 3)).normalize()
    const { pieces } = fracture(base, (seed % 5) / 4, down, rng(seed))
    pieces.forEach((p, i) => { assert.ok(!p.nb.has(i)); for (const o of p.nb) assert.ok(pieces[o].nb.has(i)) })
    const reach = new Set([0]), q = [0]
    while (q.length) for (const o of pieces[q.pop()!].nb) if (!reach.has(o)) { reach.add(o); q.push(o) }
    assert.equal(reach.size, pieces.length) // 닿지 않는 조각이 있으면 끝까지 깔 수 없다
    assert.equal(Math.min(...pieces.map((p) => p.dist)), 0) // 부딪힌 곳의 조각이 있다
  }
})

test('같은 난수면 같은 결과', () => {
  const a = fracture(base, 0.6, new THREE.Vector3(0, -1, 0), rng(3)), b = fracture(base, 0.6, new THREE.Vector3(0, -1, 0), rng(3))
  assert.deepEqual(a.pieces.map((p) => p.tris.length), b.pieces.map((p) => p.tris.length))
})
