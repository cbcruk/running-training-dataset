// data/schema/*.json에서 scripts/types.ts가 생성한 파일 - 고치지 말 것.
// 스키마를 바꾼 뒤에는 `vp run types`를 실행한다.
//
// 여기서 lint를 끈 것은 의도적이다. 이 파일의 모양은 생성기의 몫이고, 경고를 손으로
// 고쳐봐야 다음 실행에 되돌아간다.
/* eslint-disable */

export type { Adaptation } from './adaptation.d.ts'
export type { Anchor } from './anchor-model.d.ts'
export type { System } from './system.d.ts'
export type { Usage } from './usage.d.ts'
export type { Verified } from './verified.d.ts'
export type { Workout } from './workout.d.ts'
