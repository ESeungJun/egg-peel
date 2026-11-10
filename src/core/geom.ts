import { COUNTER, EH, HOLD_Z, TOP, TV } from './dims.ts'

/**
 * 들고 있는 계란 중심이 올라갈 수 있는 가장 높은 y.
 * 벽 TV는 캔버스 위에 얹은 HTML이라, 계란이 화면에서 TV 아래 모서리보다 위로 가면 가려진다.
 * 카메라에서 TV 아래 모서리를 지나는 선이 들기 면(z=HOLD_Z)과 만나는 높이에서 계란 반높이와 여유를 뺀다.
 */
export function heldCeiling(cam: { y: number; z: number }, band: boolean): number {
  if (band) return 1.7 // 세로 폰은 TV가 위쪽 띠로 빠져 3D 영역을 가리지 않는다
  const edge = TV.y - TV.hh, s = (cam.z - HOLD_Z) / (cam.z - TV.z)
  const y = cam.y + (edge - cam.y) * s - EH - 0.012
  return Math.max(TOP + EH + 0.2, Math.min(1.7, y)) // 내리칠 높이(20cm)는 남긴다
}

/** (x, z)가 작업대 윗면 위인지. 밖이면 조각이 바닥으로 계속 떨어진다 */
export const onCounter = (x: number, z: number) => Math.abs(x) < COUNTER.hw && Math.abs(z) < COUNTER.hd
