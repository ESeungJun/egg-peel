import * as THREE from 'three'
import { camera, VIEW } from '../core/stage'
import { store } from '../game/state'

const tv = document.getElementById('tv')!
const form = document.getElementById('tvform') as HTMLFormElement
const input = document.getElementById('yt') as HTMLInputElement
const change = document.getElementById('tvchange') as HTMLButtonElement
const err = document.getElementById('yterr')!
const cancel = document.getElementById('ytcancel') as HTMLButtonElement

/** TV 화면 네 귀퉁이를 화면 좌표로 옮겨 HTML 플레이어를 그 위에 맞춘다 */
const corners = [[-0.45, 0.253], [0.45, 0.253], [-0.45, -0.253], [0.45, -0.253]].map(([x, y]) => new THREE.Vector3(x, 1.45 + y, -0.64))
/** 세로 폰(가로/세로 < 0.8)이면 TV를 화면 위쪽 띠로 뺀다. 띠 높이(px)를 돌려주고, 아니면 0 */
export function tvBand(): number {
  const band = innerWidth / innerHeight < 0.8
  tv.classList.toggle('band', band)
  document.body.classList.toggle('banded', band)
  if (!band) return 0
  tv.removeAttribute('style') // 벽 TV 자리에 맞추던 left/top/width/height 를 지우고 CSS 띠 크기를 쓴다
  const h = Math.round(tv.getBoundingClientRect().height)
  document.documentElement.style.setProperty('--band', h + 'px')
  return h
}

export function placeTv() {
  const c = corners.map((p) => p.clone().project(camera))
  const xs = c.map((p) => (p.x + 1) / 2 * VIEW.w), ys = c.map((p) => (1 - p.y) / 2 * VIEW.h + VIEW.top)
  Object.assign(tv.style, { left: Math.min(...xs) + 'px', top: Math.min(...ys) + 'px', width: (Math.max(...xs) - Math.min(...xs)) + 'px', height: (Math.max(...ys) - Math.min(...ys)) + 'px' })
}

/** 링크에서 영상 ID(11자)와 재생목록 ID만 뽑아 nocookie 임베드 주소를 직접 만든다 */
export function embedUrl(v: string, autoplay: boolean) {
  const m = v.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})(?![\w-])/)
  const list = v.match(/[?&]list=([\w-]{2,64})/)
  if (!m && !list) return null
  const q = new URLSearchParams()
  if (autoplay) q.set('autoplay', '1')
  if (list) q.set('list', list[1])
  q.set('rel', '0')
  const path = m ? m[1] : 'videoseries'
  return `https://www.youtube-nocookie.com/embed/${path}?${q}`
}

/** 링크 폼을 닫는다. 영상이 있으면 영상만 남긴다 */
function closeForm() {
  form.classList.remove('over')
  form.remove()
  cancel.hidden = true
  err.textContent = ''
  change.hidden = !tv.querySelector('iframe')
}

function mount(src: string) {
  const f = document.createElement('iframe')
  f.src = src
  f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
  f.referrerPolicy = 'strict-origin-when-cross-origin'
  f.title = 'TV'
  tv.replaceChildren(f)
  change.hidden = false
}

export function initTv() {
  form.onsubmit = (e) => {
    e.preventDefault()
    const v = input.value.trim(), src = embedUrl(v, true)
    // 틀린 링크도 지우지 않고 남겨서 고칠 수 있게 한다
    if (!src) { err.textContent = v ? '유튜브 영상이나 재생목록 주소가 아니에요. youtube.com/watch?v=… 나 youtu.be/… 주소를 붙여 넣어 주세요' : '유튜브 링크를 붙여 넣어 주세요'; input.focus(); return }
    store.set('yt', v)
    err.textContent = ''
    cancel.hidden = true
    form.classList.remove('over')
    mount(src)
  }
  input.oninput = () => { err.textContent = '' }
  // 링크 바꾸기: 보던 영상은 그대로 두고 그 위에 폼을 띄운다. 취소하면 영상으로 돌아간다
  change.onclick = () => {
    input.value = store.get('yt') ?? ''
    form.classList.add('over')
    tv.appendChild(form)
    cancel.hidden = false
    change.hidden = true
    input.focus()
    input.select()
  }
  cancel.onclick = closeForm
  form.onkeydown = (e) => { if (e.key === 'Escape' && !cancel.hidden) closeForm() }
  // 지난번 링크: 소리 있는 자동 재생은 브라우저가 막으니 재생 버튼만 띄워 둔다
  const last = store.get('yt'), src = last && embedUrl(last, false)
  if (src) mount(src)
}
