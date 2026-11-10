import * as THREE from 'three'
import { scene, TOP, EH, shadowDirty } from '../core/stage'
import { shellMat } from '../core/materials'
import { eggG } from './shape'

export const pile: THREE.Mesh[] = []
export const PILE = { x: -0.62 }

export function makeEgg() {
  const m = new THREE.Mesh(eggG, shellMat)
  m.castShadow = m.receiveShadow = true
  return m
}

/** 계란판 위에 피라미드로 쌓은 더미 */
export function buildPile() {
  for (const m of pile) scene.remove(m)
  pile.length = 0
  const layers = [[6, 4], [5, 3], [4, 2], [3, 1], [2, 1]]
  layers.forEach(([nx, nz], l) => {
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      const m = makeEgg()
      m.position.set(PILE.x + (i - (nx - 1) / 2) * 0.052, TOP + 0.025 + EH + l * 0.046, -0.28 + (k - (nz - 1) / 2) * 0.054 + (l % 2) * 0.01)
      m.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 6, (Math.random() - 0.5) * 0.5)
      if (l > 0) m.rotation.z += (i - (nx - 1) / 2) * 0.25
      scene.add(m)
      pile.push(m)
    }
  })
  shadowDirty()
}

/** 더미 자리를 옮긴다(세로 폰 배치). 남은 계란도 같이 옮긴다 */
export function movePile(x: number) {
  const dx = x - PILE.x
  PILE.x = x
  for (const m of pile) m.position.x += dx
}
