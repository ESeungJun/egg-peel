import './style.css'
import * as THREE from 'three'
import { renderer, scene, camera, resizeStage, shadowDirty, WARM, CAM, LOOK, CENTER, LAYOUT, PLATE, TOP, BAND_SPREAD } from './core/stage'
import { buildRoom, buildLights, updateRoom, tvMeshes, tvLight, spreadRoom } from './world/room'
import { buildPile, movePile, updatePile, pileTop } from './egg/pile'
import { crackedEgg, faceCamera, exposeAround } from './egg/crack'
import { S } from './game/state'
import { landOnPlate } from './game/actions'
import { initInput } from './game/input'
import { FX, updateFx, fxBusy } from './fx/effects'
import { setAmbience, ambOn } from './audio/sound'
import { store } from './game/state'
import { hint, updateHud, quiet } from './ui/hud'
import { initTv, placeTv, tvBand } from './ui/tv'
import { initCalendar } from './ui/calendar'

const ease = (t: number) => 1 - (1 - t) ** 3
const timer = new THREE.Timer()
let tvShaken = false
const toPlate = new THREE.Vector3(PLATE.x, TOP + 0.06, PLATE.z)


function tick(time: number) {
  timer.update(time)
  const dt = Math.min(0.04, timer.getDelta()), now = performance.now(), frozen = now < FX.hitstop
  const c = S.center
  // 그림자를 내는 것이 움직이는 프레임에만 그림자 맵을 다시 그린다. 숨 쉬는 움직임(±4mm)은 뺀다
  let moving = !!S.held || !!S.spin || !!S.grab || fxBusy() || (!!c && (!c.ready || !!c.done || !!c.aim))
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
        moving = true
        const t = (now - u.wig) / 260
        if (t >= 1) { f.position.copy(u.base); u.wig = 0 } else f.position.copy(u.base).multiplyScalar(1 + Math.sin(t * 40) * (1 - t) * 0.012)
      }
    }
    updateFx(dt)
    if (updatePile(dt)) moving = true
    updateRoom(dt, now)
  }
  camera.position.copy(CAM)
  const shook = FX.shake > 0.0004
  if (shook) {
    camera.position.x += (Math.random() - 0.5) * FX.shake
    camera.position.y += (Math.random() - 0.5) * FX.shake
    if (!frozen) FX.shake *= Math.exp(-dt * 9) // 프레임 수와 상관없이 0.3초쯤에 잦아든다
  }
  camera.lookAt(LOOK)
  // 벽 TV 는 캔버스 위 HTML 이라 카메라만 흔들면 틀과 어긋난다. 흔들리는 동안은 흔들린 시점으로 다시 맞춘다
  const shaking = shook && !LAYOUT.band
  if (shaking || tvShaken) { camera.updateMatrixWorld(); placeTv(); tvShaken = shaking }
  if (moving || fxBusy() || WARM.n-- > 0) shadowDirty()
  renderer.render(scene, camera)
}

function resize() {
  const top = tvBand()
  resizeStage(top)
  // 세로 폰은 TV가 위쪽 띠로 나가므로 벽 TV 모형과 그 불빛을 끈다
  for (const m of tvMeshes) m.visible = !top
  tvLight.visible = !top
  if (!top) placeTv()
  const k = top ? BAND_SPREAD : 1, oldPlate = PLATE.x
  spreadRoom(k)
  movePile(-0.62 * k)
  for (const p of S.plated) p.position.x += PLATE.x - oldPlate
  toPlate.x = PLATE.x
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
initCalendar()

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
hint('금 간 조각을 잡고 문질러 까세요')

// 주방 소리: 지난번에 켰으면 첫 터치 때 다시 켠다(브라우저가 소리 자동 재생을 막아서)
const snd = document.getElementById('snd') as HTMLButtonElement
const label = () => { snd.textContent = ambOn() ? '주방 소리 끄기' : '주방 소리 켜기'; snd.setAttribute('aria-pressed', String(ambOn())) }
snd.onclick = () => { setAmbience(!ambOn()); store.set('amb', ambOn() ? '1' : '0'); label() }
if (store.get('amb') === '1') addEventListener('pointerdown', () => { if (!ambOn()) { setAmbience(true); label() } }, { once: true })

// 조용히: 글자·토스트·흔들림 끄기
const qb = document.getElementById('quiet') as HTMLButtonElement
const qlabel = () => { qb.textContent = quiet.on ? '조용히 끄기' : '조용히'; qb.setAttribute('aria-pressed', String(quiet.on)) }
qb.onclick = () => { quiet.on = !quiet.on; store.set('quiet', quiet.on ? '1' : '0'); if (quiet.on) FX.shake = 0; qlabel() }
qlabel()

addEventListener('resize', resize)
renderer.setAnimationLoop(tick)
// 탭이 숨으면 3D를 아예 멈춘다(브라우저마다 rAF를 멈추는 정도가 달라서 직접 끈다)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) renderer.setAnimationLoop(null)
  else { timer.reset(); renderer.setAnimationLoop(tick) }
})
if (import.meta.env.DEV) Object.assign(window, { __egg: { S, camera, scene, pileTop, THREE, renderer, CAM, LOOK, CENTER } })
