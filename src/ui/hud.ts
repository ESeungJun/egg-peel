import { stats, store } from '../game/state'

const $ = (id: string) => document.getElementById(id)!
let toastT = 0
/** 조용히: 영상 보는 데 방해되는 글자·토스트·흔들림을 끈다(소리와 아래 안내는 남는다) */
export const quiet = { on: store.get('quiet') === '1' }
export function say(s: string) {
  if (quiet.on) return
  const t = $('toast')
  t.textContent = s
  t.classList.add('on')
  clearTimeout(toastT)
  toastT = window.setTimeout(() => t.classList.remove('on'), 1000)
}
export const hint = (s: string) => { $('hint').textContent = s }
export function popText(x: number, y: number, s: string) {
  if (quiet.on) return
  const d = document.createElement('div')
  d.className = 'pop'
  d.textContent = s
  d.style.left = x + 'px'
  d.style.top = y + 'px'
  document.body.appendChild(d)
  setTimeout(() => d.remove(), 700)
}
export function updateHud() {
  $('cnt').textContent = `깐 계란 ${stats.total}개`
  $('today').textContent = `오늘 ${stats.today}개`
  $('ono').textContent = String(stats.ono)
  $('otext').textContent = `계란 ${stats.order}개 (${stats.prog}/${stats.order})`
  $('obar').style.width = (stats.prog / stats.order * 100) + '%'
}
