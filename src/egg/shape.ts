import * as THREE from 'three'
import { ER, EH } from '../core/dims.ts'

/**
 * 단위 구 위의 점 u 를 계란 겉면의 점과 법선으로 옮긴다(한쪽이 살짝 뾰족한 회전체).
 * 윤곽은 r(t) = sin t · ER · (1 + 0.09 cos t), y(t) = -cos t · EH 이고 cos t = -u.y 다.
 * 법선은 윤곽을 미분해 직접 구한다: (EH·u.x, -r'(t), EH·u.z). 같은 자리는 늘 같은 법선이라 이음매가 없다.
 */
export function eggPoint(ux: number, uy: number, uz: number, pos: THREE.Vector3, nor: THREE.Vector3) {
  const c = -uy, k = ER * (1 + 0.09 * c)
  pos.set(ux * k, uy * EH, uz * k)
  nor.set(EH * ux, -ER * (c + 0.18 * c * c - 0.09), EH * uz).normalize()
}

/** 계란 도형. 정이십면체를 잘게 나눈 구를 윤곽에 맞춰 늘려서 삼각형 크기가 고르다(삼각형 20·(detail+1)²개) */
export function eggGeo(detail = 7) {
  const g = new THREE.IcosahedronGeometry(1, detail)
  const p = g.attributes.position, n = g.attributes.normal, P = new THREE.Vector3(), N = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    P.fromBufferAttribute(p, i).normalize()
    eggPoint(P.x, P.y, P.z, P, N)
    p.setXYZ(i, P.x, P.y, P.z); n.setXYZ(i, N.x, N.y, N.z)
  }
  g.deleteAttribute('uv')
  g.computeBoundingSphere()
  return g
}

/** 더미·접시의 통짜 계란 */
export const eggG = eggGeo(7)

/** 이 회전일 때 계란 중심에서 가장 아래 점까지의 높이 */
export function lowest(q: THREE.Quaternion) {
  const down = new THREE.Vector3(0, -1, 0).applyQuaternion(q.clone().invert())
  const p = eggG.attributes.position, v = new THREE.Vector3()
  let best = 0
  for (let i = 0; i < p.count; i++) best = Math.max(best, v.fromBufferAttribute(p, i).dot(down))
  return best
}
