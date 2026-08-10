/**
 * 뷰 계층 자신의 타입. 이 파일 옆의 데이터 타입은 JSON Schema에서 생성되지만 이것들은
 * 아니다. 뷰가 어떻게 호출되는지를 서술하고, 그건 스키마가 말할 바가 아니다.
 */
import type { Adaptation, Anchor, System, Usage, Workout } from './index.d.ts'

/** 앵커가 읽는 물리량. 묶음은 축을 보여줄 뿐 다리를 놓지 않는다. */
export interface Construct {
  id: string
  label: string
  note: string
}

export interface AdaptCategory {
  id: string
  label: string
}

/** 어떤 앵커를 싣는 워크아웃과, 그것이 그 워크아웃의 주앵커인지. */
export interface AnchorUse {
  w: Workout
  primary: boolean
}

/** switching_cost의 한쪽. 그것이 닿는 앵커로 인덱싱된다. */
export interface AnchorSwitch {
  to: string
  from: string
  silent?: boolean
  note?: string
  from_anchor?: string
  side: 'in' | 'out'
}

/**
 * 뷰가 필요로 하는 전부를 렌더마다 한 번 모아둔 것.
 *
 * 뷰는 순수하고 DOM이 없으므로(ADR 0001) 프리렌더러와 브라우저가 하나의 원천에서
 * 렌더한다. `ctx`는 그들이 읽던 모듈 수준 클로저를 대체한 것이다. 그것을 명시적으로
 * 넘기기 때문에 컴포넌트를 앱을 띄우지 않고 테스트에서 렌더할 수 있다.
 */
export interface ViewContext {
  /** 내부 경로에 base를 붙인 href. 예: `url("anchor/rpe_10")`. */
  url: (path: string) => string

  byWorkout: Record<string, Workout>
  bySystem: Record<string, System>
  byAnchor: Record<string, Anchor>
  byAdaptation: Record<string, Adaptation>

  systems: System[]
  workouts: Workout[]
  anchors: Anchor[]
  adaptations: Adaptation[]
  usage: Usage[]

  constructs: Construct[]
  constructLabel: Record<string, string>
  adaptCategories: AdaptCategory[]
  commitTips: Record<'sessions' | 'volume' | 'weeks' | 'track', string>

  fmt: {
    km: (n: number | null | undefined) => string
    sessions: (sp: { value?: number; min?: number; max?: number } | undefined) => string
    weeks: (pl: { value?: number; min?: number; max?: number } | undefined) => string
  }

  /** 역인덱스. 앵커 페이지가 자기를 참조하는 모든 것을 보여줄 수 있도록. */
  indexes: {
    systemsByAnchor: Record<string, System[]>
    workoutsByAnchor: Record<string, AnchorUse[]>
    switchesByAnchor: Record<string, AnchorSwitch[]>
  }
}

/** 이 앱의 모든 컴포넌트가 컨텍스트를 받는다. 대부분은 하나를 더 받는다. */
export interface WithCtx {
  ctx: ViewContext
}
