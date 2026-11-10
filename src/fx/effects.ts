import * as THREE from 'three'
import { scene, TOP, EH } from '../core/stage'
import { onCounter } from '../core/geom'
import { shellMat } from '../core/materials'

interface Flying {
  m: THREE.Mesh; v: THREE.Vector3; w: THREE.Vector3; life: number; age: number
  p: THREE.Vector3 // 목표 없이 날았을 때의 자리
  s0: number // 떨어져 나올 때 배율(까는 자리에서 키운 만큼)
  to: THREE.Vector3 | null // 날아가 담길 곳(껍질 그릇)
  done?: () => void
}
interface Squash { g: THREE.Object3D; t: number; plate?: boolean }

const flying: Flying[] = []
const falling: { m: THREE.Object3D; v: number }[] = []
const squash: Squash[] = []
export const FX = { hitstop: 0, shake: 0 }
/** 움직이는 효과가 남아 있는지(그림자를 다시 그릴지 정할 때 쓴다) */
export const fxBusy = () => flying.length + falling.length + squash.length > 0

const SHRINK = 0.25 // 떨어져 나온 조각이 실물 크기로 줄어드는 시간
const FADE = 0.3 // 사라지기 전 크기를 0으로 줄이는 시간
const TO_BOWL = 0.6 // 그릇까지 날아가는 시간
const smooth = (t: number) => t * t * (3 - 2 * t)

/**
 * 장면에서 떨어져 나가 튕기다 사라지는 조각. 재질은 그대로 쓰고(복제·투명 처리 없음) 크기를 줄여 사라지게 한다.
 * to 를 주면 처음엔 튀어 나가다가 그 자리로 빨려 들어가고, 닿으면 done 을 부른다.
 */
export function fling(m: THREE.Mesh, v: THREE.Vector3, life = 1.6, to: THREE.Vector3 | null = null, done?: () => void) {
  m.castShadow = false // 줄어드는 조각의 그림자가 남았다 한 번에 사라지지 않게
  flying.push({ m, v, w: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(14), life: to ? TO_BOWL : life, age: 0, p: m.position.clone(), s0: m.scale.x, to, done })
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
    f.age += dt; f.life -= dt
    f.v.y -= 2.6 * dt
    f.p.addScaledVector(f.v, dt)
    f.m.rotation.x += f.w.x * dt; f.m.rotation.y += f.w.y * dt; f.m.rotation.z += f.w.z * dt
    if (f.to) {
      const k = smooth(Math.min(1, f.age / TO_BOWL))
      f.m.position.lerpVectors(f.p, f.to, k)
      f.m.scale.setScalar(f.s0 + (1 - f.s0) * k)
      continue
    }
    // 작업대 위에서만 튕긴다. 작업대 밖(세로 폰의 까는 자리 앞쪽)이면 바닥으로 계속 떨어진다
    if (f.p.y < TOP + 0.004 && onCounter(f.p.x, f.p.z)) { f.p.y = TOP + 0.004; f.v.multiplyScalar(0.35); f.v.y = Math.abs(f.v.y) * 0.3; f.w.multiplyScalar(0.5) }
    f.m.position.copy(f.p)
    f.m.scale.setScalar((f.s0 + (1 - f.s0) * Math.min(1, f.age / SHRINK)) * Math.max(0, Math.min(1, f.life / FADE)))
  }
  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i]
    if (f.life > 0) continue
    scene.remove(f.m)
    if (!f.m.userData.crumb) f.m.geometry.dispose() // 부스러기 도형은 같이 쓰므로 남긴다
    flying.splice(i, 1)
    f.done?.()
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
