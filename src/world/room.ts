import * as THREE from 'three'
import { scene, THEME, TOP, PLATE, COARSE } from '../core/stage'
import { mat, canvasTex } from '../core/materials'

export const steam: THREE.Sprite[] = []
export const BOWL = new THREE.Vector3(0.32, TOP + 0.03, -0.2)
export let plateMesh: THREE.Mesh
export let tvLight: THREE.PointLight
/** 벽 TV(틀·화면). 세로 폰에서 TV를 위쪽 띠로 뺄 때 숨긴다 */
export const tvMeshes: THREE.Object3D[] = []
let tray: THREE.Mesh, bowl: THREE.Mesh, pot: THREE.Mesh, water: THREE.Mesh
let potX = -1.05

/** 밝은 낮 주방: 민트 타일 벽, 나무 작업대, 선반, 냄비, TV, 껍질 그릇, 접시 */
export function buildRoom() {
  const wallTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = THEME.grout; g.fillRect(0, 0, w, h)
    const tw = 128, th = 64
    for (let r = 0; r < 4; r++) for (let c = -1; c < 5; c++) {
      const x = c * tw + (r % 2) * tw / 2, gr = g.createLinearGradient(0, r * th, 0, r * th + th)
      gr.addColorStop(0, THEME.tileA); gr.addColorStop(1, THEME.tileB)
      g.fillStyle = gr; g.fillRect(x + 3, r * th + 3, tw - 6, th - 6)
    }
  }, 6, 6)
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), mat(0xffffff, { map: wallTex, roughness: 0.35 }))
  wall.position.set(0, 1.55, -0.7); wall.receiveShadow = true; scene.add(wall)

  const woodTex = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#d8b48a'; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 18; i++) { g.fillStyle = `hsla(30,45%,${55 + Math.random() * 15}%,.55)`; g.fillRect(0, i * 7 + Math.random() * 3, w, 2 + Math.random() * 3) }
    for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(90,60,30,.25)'; g.fillRect(x, 0, 2, h) }
  }, 4, 1)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 1.4), mat(0xffffff, { roughness: 0.55, map: woodTex }))
  counter.position.set(0, TOP - 0.45, 0); counter.receiveShadow = true; scene.add(counter)

  for (const sx of [-1, 1]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.025, 0.16), mat(THEME.wood))
    shelf.position.set(sx * 1.05, 1.42, -0.62); shelf.castShadow = shelf.receiveShadow = true; scene.add(shelf)
    for (let i = 0; i < 4; i++) {
      const h = 0.09 + Math.random() * 0.08
      const geo = i % 2 ? new THREE.CylinderGeometry(0.035, 0.035, h, 24) : new THREE.BoxGeometry(0.07, h, 0.07)
      const jar = new THREE.Mesh(geo, mat(THEME.jars[(i + (sx > 0 ? 2 : 0)) % THEME.jars.length], { roughness: 0.4 }))
      jar.position.set(sx * 1.05 - 0.22 + i * 0.145, 1.4325 + h / 2, -0.62); jar.castShadow = true; scene.add(jar)
    }
  }

  pot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.17, 40, 1, true), mat(THEME.pot, { metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }))
  pot.position.set(-1.05, TOP + 0.085, -0.45); pot.castShadow = true; scene.add(pot)
  water = new THREE.Mesh(new THREE.CircleGeometry(0.12, 32), mat(0xdfe8ee, { roughness: 0.1 }))
  water.rotation.x = -Math.PI / 2; water.position.set(-1.05, TOP + 0.15, -0.45); scene.add(water)
  const steamTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,255,.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64) })
  for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false })); s.userData.t = i / 6; scene.add(s); steam.push(s) }

  const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.58, 0.045), mat(THEME.tvFrame, { roughness: 0.35 }))
  tvFrame.position.set(0, 1.45, -0.665); tvFrame.castShadow = true; scene.add(tvFrame)
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.506), new THREE.MeshBasicMaterial({ color: 0x0b0d10 }))
  scr.position.set(0, 1.45, -0.641); scene.add(scr)
  tvMeshes.push(tvFrame, scr)

  tray = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.025, 0.26), mat(THEME.tray, { roughness: 0.9 }))
  tray.position.set(-0.62, TOP + 0.0125, -0.28); tray.receiveShadow = tray.castShadow = true; scene.add(tray)

  const bowlPts: THREE.Vector2[] = []
  for (let i = 0; i <= 12; i++) { const t = i / 12 * Math.PI / 2; bowlPts.push(new THREE.Vector2(Math.sin(t) * 0.12 + 0.001, -Math.cos(t) * 0.06 + 0.06)) }
  bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlPts, 40), mat(THEME.bowl, { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }))
  bowl.position.set(0.32, TOP, -0.2); bowl.castShadow = bowl.receiveShadow = true; scene.add(bowl)

  plateMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.018, 48), mat(0x9fd8bf, { roughness: 0.3 }))
  plateMesh.position.set(PLATE.x, TOP + 0.009, PLATE.z); plateMesh.receiveShadow = plateMesh.castShadow = true; scene.add(plateMesh)
}

export function buildLights() {
  scene.add(new THREE.HemisphereLight(THEME.sky, THEME.ground, THEME.hemi))
  const sun = new THREE.DirectionalLight(THEME.key, THEME.keyI)
  sun.position.set(0.9, 2.6, 1.5); sun.target.position.set(0, TOP, -0.2)
  sun.castShadow = true
  const sm = COARSE ? 1024 : 2048
  sun.shadow.mapSize.set(sm, sm); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.01
  Object.assign(sun.shadow.camera, { left: -1.4, right: 1.4, top: 1.2, bottom: -1.0, near: 0.5, far: 5 })
  sun.shadow.radius = 4
  scene.add(sun, sun.target)
  tvLight = new THREE.PointLight(THEME.tvLight, THEME.tvLightI, 1.6, 2)
  tvLight.position.set(0, 1.42, -0.45); scene.add(tvLight)
}

/** 냄비 김, TV 불빛 일렁임 */
export function updateRoom(dt: number, now: number) {
  for (const s of steam) {
    s.userData.t = (s.userData.t + dt * 0.28) % 1
    const t = s.userData.t
    s.position.set(potX + Math.sin(t * 9 + s.id) * 0.03, TOP + 0.18 + t * 0.4, -0.45)
    s.scale.setScalar(0.08 + t * 0.16)
    s.material.opacity = Math.sin(t * Math.PI) * 0.45
  }
  tvLight.intensity = THEME.tvLightI * (0.85 + Math.sin(now / 900) * 0.1 + Math.sin(now / 230) * 0.05)
}

/**
 * 세로 폰(TV 띠)에서는 화면 폭이 좁아 더미·접시가 가장자리에 작게 붙는다.
 * 작업대 소품을 가운데 쪽으로 모아(k < 1) 카메라를 더 당길 수 있게 한다. k = 1 이 원래 배치.
 */
export function spreadRoom(k: number) {
  PLATE.x = 0.62 * k
  plateMesh.position.x = PLATE.x
  tray.position.x = -0.62 * k
  potX = k < 1 ? -1.05 * k - 0.06 : -1.05
  pot.position.x = water.position.x = potX
  bowl.visible = k === 1 // 좁힌 배치에서는 접시와 겹치고, 쓰임도 없어 뺀다
}
