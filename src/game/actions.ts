import * as THREE from 'three'
import { scene, camera, CAM, CENTER, TOP, EH, ER, PLATE, THEME, LAYOUT, toScreen, REDUCE_MOTION, shadowDirty } from '../core/stage'
import { HOLD_Z } from '../core/dims'
import { mat } from '../core/materials'
import { eggG, lowest } from '../egg/shape'
import { crackedEgg, faceCamera, canGrab, exposeAround, disposeEgg, spreadCracks, type CrackedEgg, type Frag } from '../egg/crack'
import { S, stats, countPeeled } from './state'
import { FX, fling, crumbs, squish, drop } from '../fx/effects'
import { crackSound, peelSound, plateSound, dumpSound, ripSound } from '../audio/sound'
import { plateMesh, bowl, BOWL, BOWL_MAX, addShell, bowlCount, clearShells } from '../world/room'
import { say, hint, popText, updateHud, quiet } from '../ui/hud'

const peeledMat = mat(THEME.white, { roughness: 0.22 })

/** 더미나 작업대에서 계란을 집는다. 쥐는 각도를 매번 바꿔 부딪히는 곳이 달라지게 한다 */
export function pickUp(m: THREE.Mesh, at: THREE.Vector3 | null) {
  S.held = m
  S.hist = []
  m.rotation.set((Math.random() - 0.5) * 2.4, m.rotation.y, (Math.random() - 0.5) * 2.4)
  m.userData.rest = TOP + lowest(m.quaternion)
  if (at) m.position.set(at.x, Math.min(LAYOUT.ceil, Math.max(m.userData.rest + 0.06, at.y)), HOLD_Z)
  hint('위로 들었다가 작업대에 탁! 내리치세요')
}

/** 내리침. s = 세기(0~1) */
export function slam(s: number, sx: number, sy: number) {
  const m = S.held!
  S.held = null
  const down = new THREE.Vector3(0, -1, 0).applyQuaternion(m.quaternion.clone().invert())
  const egg = crackedEgg(s, down)
  spreadCracks(egg)
  egg.group.position.set(m.position.x, m.userData.rest, HOLD_Z)
  egg.group.quaternion.copy(m.quaternion)
  scene.remove(m)
  scene.add(egg.group)
  S.counterEggs.push({ group: egg.group, egg })
  crackSound(s)
  navigator.vibrate?.(20 + s * 30)
  FX.hitstop = performance.now() + 85
  FX.shake = REDUCE_MOTION.matches || quiet.on ? 0 : 0.006 + s * 0.012
  squish(egg.group)
  crumbs(egg.group.position, 5 + Math.round(s * 6))
  popText(sx, sy, s > 0.6 ? '쩍!' : '탁!')
  if (S.center) { hint('금 간 계란은 지금 계란을 다 까고 누르면 와요'); return }
  // 가운데가 비어 있으면 금이 간 걸 잠깐 보여 준 뒤 저절로 가운데로 가져온다(다시 누르는 단계를 없앤다)
  hint('쩍! 금 간 계란이 앞으로 와요')
  setTimeout(() => {
    const i = S.counterEggs.findIndex((ce) => ce.egg === egg)
    if (i < 0 || S.center) return
    S.counterEggs.splice(i, 1)
    bringToCenter(egg)
  }, 520)
}

/** 천천히 내려놓으면 금이 안 간 채로 작업대에 놓인다 */
export function setDown() {
  const m = S.held!
  S.held = null
  drop(m)
  S.counterEggs.push({ group: m })
  hint('조금 더 세게 내리쳐야 금이 가요')
}

export function bringToCenter(egg: CrackedEgg) {
  S.center = {
    ...egg, ready: false, done: 0,
    from: egg.group.position.clone(), fromQ: egg.group.quaternion.clone(), toQ: faceCamera(egg.impact), t0: performance.now(),
    aim: null, aimFrom: null, aimT0: 0,
  }
  hint('금 간 조각을 문질러 까세요 · 빈 곳을 끌면 돌아가요')
}

/** 조각 떼기. 끄는 방향(dx, dy) 쪽 이웃이 막처럼 같이 딸려 온다 */
export function peel(f: Frag, speed: number, dx: number, dy: number, sx: number, sy: number) {
  const c = S.center!
  const list = [f]
  const fs = toScreen(f), dl = Math.hypot(dx, dy) || 1
  const cand = [...f.userData.nb]
    .filter((o) => !o.userData.gone)
    .map((o) => { const os = toScreen(o); return { o, k: ((os.x - fs.x) * dx + (os.y - fs.y) * dy) / dl } })
    .filter((x) => x.k > 0)
    .sort((a, b) => b.k - a.k)
  for (const x of cand.slice(0, speed > 0.6 ? 3 : 2)) if (Math.random() < (x.o.userData.lift ? 0.85 : 0.6)) list.push(x.o)
  for (const o of list) o.userData.gone = true
  for (const o of list) exposeAround(o)

  const cpos = c.group.getWorldPosition(new THREE.Vector3())
  for (const o of list) {
    scene.attach(o)
    const out = o.getWorldPosition(new THREE.Vector3()).sub(cpos).normalize()
    // 끄는 쪽으로 튀어 나갔다가 껍질 그릇에 담긴다
    fling(o, new THREE.Vector3(dx * 0.0016, -dy * 0.0016, 0).add(out.multiplyScalar(0.35)).add(new THREE.Vector3(0, 0.25, 0)), 1.6, BOWL, shellLanded)
  }
  peelSound()
  navigator.vibrate?.(8)
  crumbs(f.getWorldPosition(new THREE.Vector3()), 2)
  if (Math.random() < 0.45) popText(sx, sy, ['파삭', '쓱', '톡', '바삭'][Math.floor(Math.random() * 4)])
  if (c.frags.every((o) => o.userData.gone)) finish()
}

function shellLanded() {
  addShell()
  if (bowlCount() >= BOWL_MAX) emptyBowl() // 가득 차면 저절로 털어 비운다
}

/** 껍질 그릇을 탁 털어 비운다 */
export function emptyBowl() {
  if (!bowlCount()) return
  clearShells()
  squish(bowl)
  crumbs(BOWL, 8)
  dumpSound()
  navigator.vibrate?.(25)
  const p = toScreen(bowl)
  popText(p.x, p.y, '탈탈')
}

/** 한 번 누른 채로 여러 조각을 이어서 벗겼을 때 */
export function longPeel(sx: number, sy: number) {
  popText(sx, sy, '쭈욱')
  ripSound()
  navigator.vibrate?.(15)
}

const CHEERS = ['다 깠다!', '깔끔!', '반질반질', '한 판 더요!', '접시 나갑니다']
function finish() {
  const c = S.center!
  say(CHEERS[Math.floor(Math.random() * CHEERS.length)])
  plateSound()
  c.done = performance.now()
  countPeeled()
  updateHud()
  if (stats.prog >= stats.order) orderDone()
}

/** 주문 완료: 쪽지에 도장 → 쪽지가 날아가고 새 쪽지 → 접시를 비운다 */
function orderDone() {
  const t = document.querySelector('.ticket')!
  const done = stats.ono
  stats.ono++
  stats.order = 5 + Math.floor(Math.random() * 10)
  stats.prog = 0
  setTimeout(() => { t.classList.add('done'); say(`주문 #${done} 완료!`); navigator.vibrate?.([30, 60, 30]) }, 700)
  setTimeout(() => t.classList.add('away'), 1700)
  setTimeout(() => {
    clearPlate()
    t.classList.remove('done', 'away')
    t.classList.add('fresh')
    updateHud()
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.remove('fresh')))
  }, 2200)
}

function clearPlate() { for (const p of S.plated) scene.remove(p); S.plated.length = 0; shadowDirty() }

/** 다 깐 계란을 접시에 차곡차곡(4-3-2-1 줄) 놓는다 */
export function landOnPlate() {
  const c = S.center!
  scene.remove(c.group)
  disposeEgg(c)
  const i = S.plated.length % 10, row = i < 4 ? 0 : i < 7 ? 1 : i < 9 ? 2 : 3, inRow = [4, 3, 2, 1][row], k = i - [0, 4, 7, 9][row]
  const m = new THREE.Mesh(eggG, peeledMat)
  m.castShadow = true
  m.rotation.set(Math.PI / 2, 0, Math.random() * 0.4 - 0.2)
  m.position.set(PLATE.x + (k - (inRow - 1) / 2) * 0.052, TOP + 0.018 + ER + row * 0.04, PLATE.z + (row % 2) * 0.01)
  scene.add(m)
  S.plated.push(m)
  squish(plateMesh, true)
  S.center = null
  hint('다음 계란! 더미에서 집어 탁!')
}

/** 손가락 근처(r px)의 뗄 수 있는 앞쪽 조각 */
export function nearGrabbable(x: number, y: number, r: number) {
  const c = S.center!, cp = c.group.getWorldPosition(new THREE.Vector3()), w = new THREE.Vector3(), toCam = new THREE.Vector3()
  let best: Frag | null = null, bd = r
  for (const f of c.frags) {
    if (f.userData.gone || !canGrab(f)) continue
    f.getWorldPosition(w)
    if (w.clone().sub(cp).normalize().dot(toCam.copy(camera.position).sub(w).normalize()) < 0.25) continue // 옆·뒤쪽은 제외
    const sp = toScreen(f), d = Math.hypot(sp.x - x, sp.y - y)
    if (d < bd) { bd = d; best = f }
  }
  return best
}

/** 다음에 깔 곳이 앞을 보게 하는 회전. 이미 앞에 있으면 null */
export function aimFrontier() {
  const c = S.center!
  const fr = c.frags.filter((f) => !f.userData.gone && canGrab(f))
  if (!fr.length) return null
  const toCam = CAM.clone().sub(CENTER).normalize(), g = c.group.quaternion
  let best: THREE.Vector3 | null = null, bd = -2
  for (const f of fr) { const w = f.userData.local.clone().normalize().applyQuaternion(g), d = w.dot(toCam); if (d > bd) { bd = d; best = w } }
  if (!best || bd > 0.55) return null
  return new THREE.Quaternion().setFromUnitVectors(best, toCam).multiply(g.clone())
}

export const REST_UPRIGHT = TOP + EH
