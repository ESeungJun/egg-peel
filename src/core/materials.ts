import * as THREE from 'three'
import { THEME } from './stage'

export function mat(color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o })
}

export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, rx = 1, ry = 1) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  draw(c.getContext('2d')!, w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  t.anisotropy = 8
  return t
}

export const shellMat = mat(THEME.shell, { roughness: 0.55, side: THREE.DoubleSide })
export const whiteMat = mat(THEME.white, { roughness: 0.22 })
