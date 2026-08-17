/**
 * `structure` -> 도식 SVG.
 *
 * 이 프로젝트가 싣는 미디어는 라이선스한 자산이 아니라 자기 데이터의 파생물이고, 그래서
 * 계속 들고 있는 것이 공짜다. 순수하다 — 파일시스템도 전역도 없다 — 그래서 CLI
 * (scripts/render.ts)와 브라우즈 UI가 둘 다 이 하나를 렌더하고, 시각물은 양쪽에서
 * 데이터의 한 함수로 남는다.
 *
 * 도형이 JSX인 것은 그 성질을 강제하기 위해서다. 문자열로 조립해 `dangerouslySetInnerHTML`
 * 로 넣던 예전 판본은 두 벌이 갈라질 수 있었다. 문자열이 필요한 쪽(SVG 파일)은
 * scripts/svg.tsx가 이 컴포넌트를 `renderToStaticMarkup`으로 렌더해서 얻는다.
 */
import type { Workout } from '../data/types/index.d.ts'
import type { Anchor, Quantity, Segment } from '../data/types/workout.d.ts'

type ById = Record<string, Workout>

/**
 * y축. `rpe_10`은 스키마가 강제하므로(contains/minContains/maxContains) 여기서 빗나갈 수
 * 없다 — 그리고 그것은 이 데이터가 가진 가장 부정확한 앵커라, 세로축이 구조적으로
 * 주관적이 된다. 차트는 두 축 모두 정밀해 보이지만 두 축 모두 도식이다. 라벨이 그렇게
 * 말하게 할 것.
 */
const rpe = (w: Workout): number => {
  const a = w.intensity.anchors.find((x: Anchor) => x.model === 'rpe_10')!
  return a.range ? (a.range[0] + a.range[1]) / 2 : a.value!
}

const resolveRpe = (ref: string, self: Workout, byId: ById): number =>
  ref === 'self' ? rpe(self) : rpe(byId[ref])

/** 배치 전용. 페이스 모델이 아니다. 거리 구간이 시간이 되려면 러너가 필요하고, 여기선 가정한다. */
const NOMINAL_MPS = (r: number) => 2.4 + (r / 10) * 2.6

/**
 * 스키마는 `value` 또는 `min`/`max` 쌍 중 하나를 요구하고(oneOf) validate.ts가 그것을
 * 강제하므로, 생성된 옵셔널 타입이 실제 데이터가 가질 수 있는 범위보다 넓다.
 */
const mid = (q: Quantity): number => (q.value != null ? q.value : (q.min! + q.max!) / 2)

interface Flat {
  kind: string
  rpe: number
  secs: number
}

const flatten = (segs: Segment[], self: Workout, byId: ById): Flat[] =>
  segs.flatMap((s: Segment) =>
    s.kind === 'repeat'
      ? Array.from({ length: mid(s.count as Quantity) }, () =>
          flatten(s.children as Segment[], self, byId),
        ).flat()
      : [
          {
            kind: s.kind,
            rpe: resolveRpe(s.intensity_ref!, self, byId),
            secs: s.duration
              ? mid(s.duration)
              : mid(s.distance!) / NOMINAL_MPS(resolveRpe(s.intensity_ref!, self, byId)),
          },
        ],
  )

const COLOR: Record<string, string> = {
  warmup: 'var(--muted)',
  cooldown: 'var(--muted)',
  recovery: 'var(--muted)',
  work: 'var(--accent)',
}

const W = 640
const H = 200
const PAD = 36
const PW = W - PAD * 2
const PH = H - PAD * 2

export interface WorkoutChartProps {
  workout: Workout
  byId: ById
}

export function WorkoutChart({ workout: w, byId }: WorkoutChartProps) {
  const segs = flatten(w.structure.segments, w, byId)
  const total = segs.reduce((a: number, s: Flat) => a + s.secs, 0)

  let x = PAD
  const bars = segs.map((s: Flat, i: number) => {
    const bw = (s.secs / total) * PW
    const bh = (s.rpe / 10) * PH
    const bar = {
      key: `${i}`,
      x: x.toFixed(1),
      y: (H - PAD - bh).toFixed(1),
      width: Math.max(bw - 0.5, 0.5).toFixed(1),
      height: bh.toFixed(1),
      fill: COLOR[s.kind],
    }
    x += bw
    return bar
  })

  const grid = [2, 4, 6, 8, 10].map((r: number) => ({
    r,
    y: (H - PAD - (r / 10) * PH).toFixed(1),
  }))

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      fontFamily="ui-monospace, monospace"
    >
      <style>{'svg{--accent:#c94f2c;--muted:#a09a92;--border:#e4e0d8;--fg:#3a3630}'}</style>
      <text x={PAD} y="18" fontSize="11" fill="var(--fg)">
        {w.canonical_name}
      </text>
      <text x={W - PAD} y="18" fontSize="8" textAnchor="end" fill="var(--muted)">
        schematic - x: nominal pace - y: perceived effort
      </text>
      {grid.map((g) => (
        <g key={g.r}>
          <line x1={PAD} y1={g.y} x2={W - PAD} y2={g.y} stroke="var(--border)" strokeWidth="0.5" />
          <text
            x={PAD - 6}
            y={(Number(g.y) + 3).toFixed(1)}
            textAnchor="end"
            fontSize="8"
            fill="var(--muted)"
          >
            {g.r}
          </text>
        </g>
      ))}
      {bars.map((b) => (
        <rect key={b.key} x={b.x} y={b.y} width={b.width} height={b.height} fill={b.fill} rx="1" />
      ))}
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--fg)" strokeWidth="1" />
    </svg>
  )
}
