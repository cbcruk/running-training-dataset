/**
 * 워크아웃 하나 -> 도식 SVG 문자열.
 *
 * 도형 자체는 app/ui/chart.tsx에 있다. 여기 있는 것은 그것을 파일로 쓸 수 있는 문자열로
 * 바꾸는 한 줄뿐이다 — 브라우즈 UI와 CLI(scripts/render.ts)가 같은 하나의 정의를 렌더하고,
 * 그래서 시각물이 데이터에서 갈라질 수 없다.
 *
 * `renderToStaticMarkup`이지 `renderToString`이 아니다. 하이드레이션 표시가 붙으면 안 되는
 * 순수한 SVG 파일이 필요하기 때문이다.
 */
import { renderToStaticMarkup } from 'react-dom/server'

import { WorkoutChart } from '../app/ui/chart.tsx'
import type { Workout } from '../app/data/types/index.d.ts'

export function renderWorkout(w: Workout, byId: Record<string, Workout>): string {
  return renderToStaticMarkup(<WorkoutChart workout={w} byId={byId} />)
}
