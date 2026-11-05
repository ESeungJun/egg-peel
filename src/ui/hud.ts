import { stats } from '../game/state'

const $ = (id: string) => document.getElementById(id)!
let toastT = 0
export function say(s: string) {
  const t = $('toast')
  t.textContent = s
  t.classList.add('on')
  clearTimeout(toastT)
  toastT = window.setTimeout(() => t.classList.remove('on'), 1000)
}
export const hint = (s: string) => { $('hint').textContent = s }
export function popText(x: number, y: number, s: string) {
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
