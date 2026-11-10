import * as THREE from 'three'
import { renderer, scene, camera, CAM, LOOK, VIEW, LAYOUT, toScreen, toScreenAt, shadowDirty } from '../core/stage'
import { HOLD_Z } from '../core/dims'
import { canGrab, type Frag } from '../egg/crack'
import { takeFromPile, pileCount, refillPile } from '../egg/pile'
import { S } from './state'
import { pickUp, slam, setDown, bringToCenter, peel, nearGrabbable, aimFrontier, emptyBowl, longPeel, REST_UPRIGHT } from './actions'
import { bowl, bowlCount } from '../world/room'
import { audio, nopeSound } from '../audio/sound'
import { hint } from '../ui/hud'

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmp = new THREE.Vector3()
const holdPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -HOLD_Z) // 들고 있는 계란이 움직이는 면
function aim(e: PointerEvent) {
  // 화면 흔들림이 섞이지 않은 원래 시점으로 광선을 쏜다(흔들리는 중에 눌러도 빗나가지 않게)
  camera.position.copy(CAM)
  camera.lookAt(LOOK)
  camera.updateMatrixWorld()
  scene.updateMatrixWorld() // 방금 생긴 계란처럼 아직 한 번도 안 그려진 물체도 제자리에서 맞도록
  ndc.set(e.clientX / VIEW.w * 2 - 1, -((e.clientY - VIEW.top) / VIEW.h) * 2 + 1)
  ray.setFromCamera(ndc, camera)
}
let refill = 0
const LONG_PEEL = 6 // 한 번에 이만큼 이어서 떼면 '쭈욱'
const isFrag = (o: THREE.Object3D): o is Frag => !!(o as Frag).userData?.local

/** 화면에서 (x, y)에 가장 가까운 것(r px 안). 없으면 undefined */
function nearest<T>(list: T[], obj: (t: T) => THREE.Object3D, x: number, y: number, r: number): T | undefined {
  let best: T | undefined, bd = r
  for (const t of list) { const p = toScreen(obj(t)), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = t } }
  return best
}

function onDown(e: PointerEvent) {
  if (e.button > 0) return
  const a = audio()
  if (a.state === 'suspended') void a.resume()
  el.setPointerCapture(e.pointerId)
  aim(e)
  const now = performance.now(), c = S.center
  if (c && c.ready && !c.done) {
    // 흰자도 같이 검사해서 맨 앞에 맞은 것만 본다(뒤쪽 조각은 흰자에 가려진다)
    const hit = ray.intersectObjects([c.white, ...c.frags.filter((f) => !f.userData.gone)], false)[0]
    let target: THREE.Object3D | null = hit?.object ?? null
    if (target && !(isFrag(target) && canGrab(target))) target = nearGrabbable(e.clientX, e.clientY, e.pointerType === 'touch' ? 48 : 36) ?? target
    if (target && isFrag(target)) {
      if (canGrab(target)) { S.grab = { frag: target, x: e.clientX, y: e.clientY, t: now, lx: e.clientX, ly: e.clientY, lt: now, n: 0 }; c.aim = null; return }
      target.userData.wig = now
      nopeSound()
      hint('아직 단단히 붙어 있어요 · 금 간 곳이나 깐 곳 옆부터 떼요')
    }
    if (hit) { S.spin = { x: e.clientX, y: e.clientY }; c.aim = null; return }
  }
  // 작업대 위 계란: 정확히 맞지 않아도 손가락 근처(r px)면 잡는다. 폰에서는 계란이 지름 10px 남짓이라
  // 껍질이 든 그릇을 정확히 눌렀으면 근처 계란을 대신 집지 않는다(정확히 맞은 계란은 그대로 집힌다)
  const onBowl = bowlCount() > 0 && ray.intersectObject(bowl, false).length > 0
  const r = onBowl ? 0 : e.pointerType === 'mouse' ? 24 : 44
  const usable = S.counterEggs.filter((ce) => !ce.egg || !S.center)
  const ce = usable.find((x) => ray.intersectObject(x.group, true).length) ?? nearest(usable, (x) => x.group, e.clientX, e.clientY, r)
  if (ce) {
    S.counterEggs.splice(S.counterEggs.indexOf(ce), 1)
    if (ce.egg) bringToCenter(ce.egg)
    else pickUp(ce.group as THREE.Mesh, ray.ray.intersectPlane(holdPlane, tmp))
    return
  }
  const pm = takeFromPile(ray, (p) => { const q = toScreenAt(p); return Math.hypot(q.x - e.clientX, q.y - e.clientY) }, r)
  if (pm) {
    pickUp(pm, ray.ray.intersectPlane(holdPlane, tmp))
    // 얼마 안 남으면 빈 자리를 채운다. 연달아 집어도 한 번만 예약한다
    if (pileCount() < 10 && !refill) refill = window.setTimeout(() => { refill = 0; refillPile() }, 500)
    return
  }
  if (onBowl) { emptyBowl(); return }
  if (c && c.ready) { S.spin = { x: e.clientX, y: e.clientY }; c.aim = null }
}

function onMove(e: PointerEvent) {
  aim(e)
  const now = performance.now()
  if (S.held) {
    if (!ray.ray.intersectPlane(holdPlane, tmp)) return
    const rest: number = S.held.userData.rest
    // 위쪽 한계: 벽 TV(HTML)에 가려지지 않는 높이까지만
    const y = Math.max(rest, Math.min(LAYOUT.ceil, tmp.y)), x = Math.max(-1.2, Math.min(1.2, tmp.x))
    S.held.position.set(x, y, HOLD_Z)
    S.hist.push({ y, t: now })
    while (S.hist.length > 2 && now - S.hist[0].t > 120) S.hist.shift()
    const h = S.hist, vy = h.length > 1 ? (h[h.length - 1].y - h[0].y) / ((h[h.length - 1].t - h[0].t) / 1000 || 1) : 0
    // 작업대 높이까지 빠르게 내려오면 탁! (기울어진 계란도 똑바로 선 높이를 기준으로 판정)
    if (Math.min(y, tmp.y) <= Math.max(rest, REST_UPRIGHT) + 0.004 && vy < -0.8) slam(Math.min(1, (-vy - 0.8) / 2.4), e.clientX, e.clientY)
    return
  }
  const g = S.grab, c = S.center
  if (g && c) {
    if (!g.n) {
      // 처음 잡은 조각: 조금만 끌어도 떨어진다
      const d = Math.hypot(e.clientX - g.x, e.clientY - g.y)
      if (d <= 8) return
      peel(g.frag, d / Math.max(1, now - g.t), e.clientX - g.x, e.clientY - g.y, e.clientX, e.clientY)
      g.n = 1
    } else if (c.ready && !c.done) {
      // 누른 채로 쓸면 손이 지나가는 조각도 줄줄이 떨어진다
      const sdx = e.clientX - g.lx, sdy = e.clientY - g.ly, sp = Math.hypot(sdx, sdy) / Math.max(1, now - g.lt)
      const h = ray.intersectObjects([c.white, ...c.frags.filter((f) => !f.userData.gone)], false)[0]
      if (h && isFrag(h.object) && canGrab(h.object)) { peel(h.object, sp, sdx || 1, sdy, e.clientX, e.clientY); if (++g.n === LONG_PEEL) longPeel(e.clientX, e.clientY) }
    }
    g.lx = e.clientX; g.ly = e.clientY; g.lt = now
    return
  }
  if (S.spin && c) {
    const dx = e.clientX - S.spin.x, dy = e.clientY - S.spin.y, len = Math.hypot(dx, dy)
    if (len > 0) c.group.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dy, dx, 0).normalize(), len * 0.012))
    S.spin.x = e.clientX; S.spin.y = e.clientY
  }
}

function onUp() {
  const c = S.center
  // 손을 떼면 다음에 깔 곳이 앞으로 오게 돌려 준다
  if (S.grab && c && !c.done) { c.aim = aimFrontier(); c.aimFrom = c.group.quaternion.clone(); c.aimT0 = performance.now() }
  if (S.held) setDown()
  S.grab = null
  S.spin = null
  shadowDirty() // 마지막 프레임 뒤에 돌린 만큼도 그림자에 반영
}

const el = renderer.domElement
export function initInput() {
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)
  el.addEventListener('contextmenu', (e) => e.preventDefault())
}
