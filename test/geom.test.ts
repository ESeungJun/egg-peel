import { test } from 'node:test'
import assert from 'node:assert/strict'
import { heldCeiling, onCounter } from '../src/core/geom.ts'
import { EH, HOLD_Z, TOP, TV } from '../src/core/dims.ts'

test('들기 한계: 계란 윗끝이 카메라에서 본 TV 아래 모서리보다 아래다', () => {
  for (const cam of [{ y: 1.4, z: 1.0 }, { y: 1.51, z: 1.475 }, { y: 1.62, z: 1.95 }]) {
    const c = heldCeiling(cam, false), top = c + EH
    // 카메라 → 계란 윗끝 선을 TV 면까지 늘렸을 때 높이가 TV 아래 모서리보다 낮아야 가려지지 않는다
    const yAtTv = cam.y + (top - cam.y) * (cam.z - TV.z) / (cam.z - HOLD_Z)
    assert.ok(yAtTv < TV.y - TV.hh, JSON.stringify(cam))
    assert.ok(c >= TOP + EH + 0.2) // 내리칠 높이는 남는다
  }
})
test('세로 폰(TV 띠)은 예전 높이 그대로', () => { assert.equal(heldCeiling({ y: 1.62, z: 1.3 }, true), 1.7) })
test('TV가 아주 낮아도 내리칠 높이 20cm는 남긴다', () => { assert.equal(heldCeiling({ y: 0.95, z: 3 }, false), TOP + EH + 0.2) })
test('작업대 위/밖', () => {
  assert.ok(onCounter(0, 0.69) && onCounter(-2.1, -0.6))
  assert.ok(!onCounter(0, 0.78) && !onCounter(2.3, 0) && !onCounter(0, -0.71))
})
