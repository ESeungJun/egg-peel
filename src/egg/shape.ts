import * as THREE from 'three'
import { ER, EH } from '../core/stage'

/** 한쪽이 살짝 뾰족한 계란 회전체 */
export function eggGeo(radial = 32, rows = 24) {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= rows; i++) {
    const t = i / rows * Math.PI
    pts.push(new THREE.Vector2(Math.max(1e-4, Math.sin(t) * ER * (1 + 0.09 * Math.cos(t))), -Math.cos(t) * EH))
  }
  const g = new THREE.LatheGeometry(pts, radial)
  g.computeVertexNormals()
  return g
}

export const eggG = eggGeo(32, 24)

/** 이 회전일 때 계란 중심에서 가장 아래 점까지의 높이 */
export function lowest(q: THREE.Quaternion) {
  const down = new THREE.Vector3(0, -1, 0).applyQuaternion(q.clone().invert())
  const p = eggG.attributes.position, v = new THREE.Vector3()
  let best = 0
  for (let i = 0; i < p.count; i++) best = Math.max(best, v.fromBufferAttribute(p, i).dot(down))
  return best
}
