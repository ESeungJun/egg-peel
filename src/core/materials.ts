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
// 껍질 안쪽 면은 흰 막 색으로. 재질은 하나 그대로라 셰이더 프로그램 수는 늘지 않는다
const inner = new THREE.Color(THEME.shellIn)
shellMat.onBeforeCompile = (sh) => {
  sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n\tif ( ! gl_FrontFacing ) diffuseColor.rgb = vec3( ${inner.r.toFixed(4)}, ${inner.g.toFixed(4)}, ${inner.b.toFixed(4)} );`)
}
export const whiteMat = mat(THEME.white, { roughness: 0.22 })
