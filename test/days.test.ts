import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lastDays, toCount, ymd } from '../src/game/days.ts'

test('날짜 키는 내 시간대의 YYYY-MM-DD', () => { assert.equal(ymd(new Date(2026, 0, 5, 23, 59)), '2026-01-05') })
test('최근 28일: 오늘이 마지막, 달·해를 넘어간다', () => {
  const d = lastDays(new Date(2026, 0, 10))
  assert.equal(d.length, 28)
  assert.equal(d[27], '2026-01-10')
  assert.equal(d[0], '2025-12-14')
  assert.equal(new Set(d).size, 28)
  assert.equal(lastDays(new Date(2024, 2, 1), 2)[0], '2024-02-29') // 윤년
})
test('저장 값 읽기: 이상한 값은 0', () => {
  assert.equal(toCount('12'), 12)
  assert.equal(toCount('3.9'), 3)
  for (const v of [null, '', 'abc', '-4', 'NaN', 'Infinity']) assert.equal(toCount(v), 0)
})
