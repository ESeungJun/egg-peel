import './style.css'
import * as THREE from 'three'
import { renderer, scene, camera, resizeStage, CAM, LOOK, CENTER, LAYOUT, PLATE, TOP } from './core/stage'
import { buildRoom, buildLights, updateRoom } from './world/room'
import { buildPile, pile } from './egg/pile'
import { crackedEgg, faceCamera, exposeAround } from './egg/crack'
import { S } from './game/state'
import { landOnPlate } from './game/actions'
import { initInput } from './game/input'
import { FX, updateFx } from './fx/effects'
import { setAmbience, ambOn } from './audio/sound'
import { store } from './game/state'
import { hint, updateHud } from './ui/hud'
import { initTv, placeTv } from './ui/tv'

const ease = (t: number) => 1 - (1 - t) ** 3
const timer = new THREE.Timer()
const toPlate = new THREE.Vector3(PLATE.x, TOP + 0.06, PLATE.z)

function tick(time: number) {
  timer.update(time)
  const dt = Math.min(0.04, timer.getDelta()), now = performance.now(), frozen = now < FX.hitstop
  const c = S.center
  if (!frozen) {
    if (c) {
      if (!c.ready) {
        // 작업대 → 까는 자리로 날아오며 금 간 곳이 화면을 보게 돈다
        const t = Math.min(1, (now - c.t0) / 420), k = ease(t)
        c.group.position.lerpVectors(c.from, CENTER, k)
        c.group.scale.setScalar(1 + (LAYOUT.cs - 1) * k)
        if (c.toQ) c.group.quaternion.slerpQuaternions(c.fromQ, c.toQ, k)
        if (t >= 1) c.ready = true
      } else if (c.done) {
        const t = Math.min(1, (now - c.done) / 650), k = t * t
        c.group.position.lerpVectors(CENTER, toPlate, k)
        c.group.scale.setScalar(LAYOUT.cs + (1 - LAYOUT.cs) * k)
        if (t >= 1) landOnPlate()
      } else if (c.aim && c.aimFrom && !S.spin && !S.grab) {
        const t = Math.min(1, (now - c.aimT0) / 350)
        c.group.quaternion.slerpQuaternions(c.aimFrom, c.aim, ease(t))
        if (t >= 1) c.aim = null
      } else if (!S.spin && !S.grab) {
        c.group.position.y = CENTER.y + Math.sin(now / 600) * 0.004 // 살짝 숨 쉬듯
      }
      // 아직 안 떨어지는 조각을 누르면 살짝 떨린다
      if (S.center) for (const f of S.center.frags) {
        const u = f.userData
        if (!u.wig || u.gone) continue
        const t = (now - u.wig) / 260
        if (t >= 1) { f.position.copy(u.base); u.wig = 0 } else f.position.copy(u.base).multiplyScalar(1 + Math.sin(t * 40) * (1 - t) * 0.012)
      }
    }
    updateFx(dt)
    updateRoom(dt, now)
  }
  camera.position.copy(CAM)
  if (FX.shake > 0.0004) {
    camera.position.x += (Math.random() - 0.5) * FX.shake
    camera.position.y += (Math.random() - 0.5) * FX.shake
    if (!frozen) FX.shake *= Math.exp(-dt * 9) // 프레임 수와 상관없이 0.3초쯤에 잦아든다
  }
  camera.lookAt(LOOK)
  renderer.render(scene, camera)
}

function resize() {
  resizeStage()
  placeTv()
  // 화면을 돌리면 까던 계란도 새 자리로
  const c = S.center
  if (c && c.ready && !c.done) { c.group.position.copy(CENTER); c.group.scale.setScalar(LAYOUT.cs) }
}

buildRoom()
buildLights()
buildPile()
resize()
updateHud()
initTv()
initInput()

// 처음 화면: 반쯤 깐 계란을 하나 올려 둔다
{
  const egg = crackedEgg(0.6, new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize())
  egg.group.position.copy(CENTER)
  egg.group.scale.setScalar(LAYOUT.cs)
  egg.group.quaternion.copy(faceCamera(egg.impact))
  scene.add(egg.group)
  const off = egg.frags.filter((f) => f.userData.state === 'cracked')
  for (const f of [...off]) for (const o of f.userData.nb) if (Math.random() < 0.4 && !off.includes(o)) off.push(o)
  for (const f of off) { f.userData.gone = true; f.visible = false; f.geometry.dispose() }
  for (const f of off) exposeAround(f)
  S.center = { ...egg, ready: true, done: 0, from: CENTER.clone(), fromQ: egg.group.quaternion.clone(), toQ: null, t0: 0, aim: null, aimFrom: null, aimT0: 0 }
}
hint('금 간 조각을 잡고 문질러 까세요 · 다 까면 더미에서 새 계란을 집어 탁!')

// 주방 소리: 지난번에 켰으면 첫 터치 때 다시 켠다(브라우저가 소리 자동 재생을 막아서)
const snd = document.getElementById('snd') as HTMLButtonElement
const label = () => { snd.textContent = ambOn() ? '주방 소리 끄기' : '주방 소리 켜기' }
snd.onclick = () => { setAmbience(!ambOn()); store.set('amb', ambOn() ? '1' : '0'); label() }
if (store.get('amb') === '1') addEventListener('pointerdown', () => { if (!ambOn()) { setAmbience(true); label() } }, { once: true })

addEventListener('resize', resize)
renderer.setAnimationLoop(tick)
if (import.meta.env.DEV) Object.assign(window, { __egg: { S, camera, scene, pile, THREE } })
