/** @jsxImportSource remix/ui */
/**
 * 워크아웃 하나 -> 도식 SVG 문자열.
 *
 * 도형 자체는 app/ui/chart.tsx에 있다. 여기 있는 것은 그것을 파일로 쓸 수 있는 문자열로
 * 바꾸는 한 줄뿐이다 — 브라우즈 UI와 CLI(scripts/render.ts)가 같은 하나의 정의를 렌더하고,
 * 그래서 시각물이 데이터에서 갈라질 수 없다.
 */
import { renderToString } from 'remix/ui/server'
import { WorkoutChart } from '../app/ui/chart.tsx'
import type { Workout } from '../app/data/types/index.d.ts'

export function renderWorkout(w: Workout, byId: Record<string, Workout>): Promise<string> {
  return renderToString(<WorkoutChart workout={w} byId={byId} />)
}
