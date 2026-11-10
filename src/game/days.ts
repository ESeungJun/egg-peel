/** 내 시간대의 날짜를 YYYY-MM-DD 로 (저장 키에 쓴다) */
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** today 를 마지막 칸으로 하는 최근 n 일. 오래된 날부터 */
export function lastDays(today: Date, n = 28): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)))
  return out
}

/** 저장된 값을 깐 개수로. 숫자가 아니거나 음수면 0 */
export const toCount = (v: string | null) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0 }
