import * as THREE from 'three'
import { scene, TOP, EH } from '../core/stage'
import { shellMat } from '../core/materials'

interface Flying { m: THREE.Mesh; v: THREE.Vector3; w: THREE.Vector3; life: number }
interface Squash { g: THREE.Object3D; t: number; plate?: boolean }

const flying: Flying[] = []
const falling: { m: THREE.Object3D; v: number }[] = []
const squash: Squash[] = []
export const FX = { hitstop: 0, shake: 0 }
/** 날아가는 조각·떨어지는 계란·찌그러짐이 남아 있으면 true (렌더를 쉬어도 되는지 판단용) */
export const fxBusy = () => flying.length + falling.length + squash.length > 0

/** 장면에서 떨어져 나가 튕기다 사라지는 조각. 재질은 복제해서 따로 투명하게 만든다 */
export function fling(m: THREE.Mesh, v: THREE.Vector3, life = 1.6) {
  const mt = (m.material as THREE.Material).clone()
  mt.transparent = true
  m.material = mt
  flying.push({ m, v, w: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(14), life })
}

const crumbGeo = [0.004, 0.006, 0.008].map((r) => new THREE.TetrahedronGeometry(r))
export function crumbs(p: THREE.Vector3, n: number) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(crumbGeo[i % 3], shellMat)
    m.position.copy(p)
    scene.add(m)
    fling(m, new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 0.5), 0.9)
    m.userData.crumb = true
  }
}

export const drop = (m: THREE.Object3D) => falling.push({ m, v: 0 })
export const squish = (g: THREE.Object3D, plate = false) => squash.push({ g, t: 0, plate })

export function updateFx(dt: number) {
  for (const f of flying) {
    f.v.y -= 2.6 * dt
    f.m.position.addScaledVector(f.v, dt)
    f.m.rotation.x += f.w.x * dt; f.m.rotation.y += f.w.y * dt; f.m.rotation.z += f.w.z * dt
    if (f.m.position.y < TOP + 0.004) { f.m.position.y = TOP + 0.004; f.v.multiplyScalar(0.35); f.v.y = Math.abs(f.v.y) * 0.3; f.w.multiplyScalar(0.5) }
    f.life -= dt
    ;(f.m.material as THREE.Material).opacity = Math.min(1, f.life * 1.6)
  }
  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i]
    if (f.life > 0) continue
    scene.remove(f.m)
    ;(f.m.material as THREE.Material).dispose()
    if (!f.m.userData.crumb) f.m.geometry.dispose() // 부스러기 도형은 같이 쓰므로 남긴다
    flying.splice(i, 1)
  }
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i], r = f.m.userData.rest ?? TOP + EH
    f.v += 3 * dt
    f.m.position.y = Math.max(r, f.m.position.y - f.v * dt)
    if (f.m.position.y <= r) falling.splice(i, 1)
  }
  for (let i = squash.length - 1; i >= 0; i--) {
    const s = squash[i]
    s.t += dt
    const k = Math.min(1, s.t / 0.22), w = Math.sin(k * Math.PI) * (1 - k) * (s.plate ? 0.25 : 0.6)
    if (s.plate) s.g.scale.set(1 + w * 0.3, 1 - w, 1 + w * 0.3)
    else s.g.scale.set(1 + w * 0.3, 1 - w * 0.5, 1 + w * 0.3)
    if (k >= 1) { s.g.scale.setScalar(1); squash.splice(i, 1) }
  }
}
