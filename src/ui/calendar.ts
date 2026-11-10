import { dayCount } from '../game/state'
import { lastDays } from '../game/days'

const sheet = document.getElementById('cal')!, btn = document.getElementById('today') as HTMLButtonElement

/** 최근 4주 동안 날마다 깐 개수를 계란 크기로 그린다 */
function draw() {
  const days = lastDays(new Date()), counts = days.map(dayCount), max = Math.max(1, ...counts)
  const grid = document.createElement('div')
  grid.className = 'grid'
  days.forEach((d, i) => {
    const cell = document.createElement('div'), egg = document.createElement('i'), n = counts[i], [, m, dd] = d.split('-')
    cell.className = 'day'
    cell.setAttribute('aria-label', `${Number(m)}월 ${Number(dd)}일 ${n}개`)
    if (n) { const s = 8 + Math.round(n / max * 16); egg.style.width = s * 0.8 + 'px'; egg.style.height = s + 'px' } else egg.className = 'none'
    const num = document.createElement('span')
    num.textContent = String(Number(dd))
    cell.append(egg, num)
    grid.append(cell)
  })
  const head = document.createElement('b')
  head.textContent = `최근 4주 · ${counts.reduce((a, b) => a + b, 0)}개`
  sheet.replaceChildren(head, grid)
}

export function initCalendar() {
  const show = (on: boolean) => { if (on) draw(); sheet.classList.toggle('on', on); sheet.inert = !on; btn.setAttribute('aria-expanded', String(on)) }
  sheet.inert = true // 닫혀 있을 때는 읽기·포커스 대상에서 뺀다
  btn.onclick = () => show(!sheet.classList.contains('on'))
  sheet.onclick = () => show(false)
  addEventListener('keydown', (e) => { if (e.key === 'Escape') show(false) })
}
