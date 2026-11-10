// 치수(m). 렌더러 없이도 불러올 수 있게 따로 둔다(테스트에서 쓴다)
export const TOP = 0.9 // 작업대 높이
export const ER = 0.024 // 계란 반지름
export const EH = 0.031 // 계란 반높이
/** 작업대 윗면의 반폭(x)·반깊이(z) */
export const COUNTER = { hw: 2.2, hd: 0.7 }
/** 벽 TV 화면: 가운데 높이, 반폭·반높이, z */
export const TV = { y: 1.45, hw: 0.45, hh: 0.253, z: -0.64 }
/** 들고 있는 계란이 움직이는 면의 z */
export const HOLD_Z = 0.05
