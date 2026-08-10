/**
 * 데이터 접근과 라우트 메타데이터.
 *
 * 마크업은 src/components/에, 라우트 트리는 src/router.tsx에 있다. 여기 있는 것은 둘 다
 * 필요로 하지만 어느 쪽도 소유하지 않는 것들이다. 생성된 스키마 타입으로 단언해 읽은
 * JSON, 역인덱스, 그리고 프리렌더러가 쓰는 엔트리별 <title>/description.
 *
 * 인식론은 JSON에 산다. 이 파일은 편의일 뿐이다. 다만 반드시 지켜야 하는 규칙 하나가
 * 있다(README "알려진 미해결 문제"): 근거 등급은 브라우즈 카드에 있어야지 상세 뷰에
 * 묻혀서는 안 된다 — 그래야 훈련법 열 개를 훑어도 `tradition`이 `consensus`처럼 정착된
 * 것으로 보이지 않는다.
 */
import systemsRaw from '../data/systems.json' with { type: 'json' }
import workoutsRaw from '../data/workouts.json' with { type: 'json' }
import usageRaw from '../data/usage.json' with { type: 'json' }
import anchorsRaw from '../data/anchors.json' with { type: 'json' }
import adaptationsRaw from '../data/adaptations.json' with { type: 'json' }
import type { Adaptation, Anchor, System, Usage, Workout } from './types/index.d.ts'
import type {
  AdaptCategory,
  AnchorSwitch,
  AnchorUse,
  Construct,
  ViewContext,
} from './types/view.ts'

/**
 * 이 모양들의 진실의 원천은 스키마이고, 이 파일 옆의 타입은 거기서 생성된다
 * (scripts/types.ts). JSON은 추론되는 대신 그 타입으로 단언되므로, 스키마 변경이 여기서
 * 타입 오류로 드러난다.
 */
const systems = systemsRaw as unknown as System[]
const workouts = workoutsRaw as unknown as Workout[]
const usage = usageRaw as unknown as Usage[]
const anchors = anchorsRaw as unknown as Anchor[]
const adaptations = adaptationsRaw as unknown as Adaptation[]

const byWorkout: Record<string, Workout> = Object.fromEntries(workouts.map((w) => [w.id, w]))
const bySystem: Record<string, System> = Object.fromEntries(systems.map((s) => [s.id, s]))
const byAnchor: Record<string, Anchor> = Object.fromEntries(anchors.map((a) => [a.model, a]))
const byAdaptation: Record<string, Adaptation> = Object.fromEntries(
  adaptations.map((a) => [a.id, a]),
)

/**
 * 앵커 페이지가 자기를 참조하는 모든 것을 보여줄 수 있도록 만든 역인덱스. 어떤 훈련법이
 * 거기에 매달리는지, 어떤 워크아웃이 그것을 싣는지(그리고 어디서 주앵커인지), 그리고
 * anchor_change가 어느 쪽으로든 그것에 닿는 모든 switching_cost.
 */
const systemsByAnchor: Record<string, System[]> = {}
for (const s of systems) (systemsByAnchor[s.intensity_model] ??= []).push(s)
const workoutsByAnchor: Record<string, AnchorUse[]> = {}
for (const w of workouts)
  for (const a of w.intensity.anchors)
    (workoutsByAnchor[a.model] ??= []).push({
      w,
      primary: w.intensity.primary_anchor === a.model,
    })
const switchesByAnchor: Record<string, AnchorSwitch[]> = {}
for (const s of systems)
  for (const x of s.switching_cost || []) {
    const [from, to] = (x.anchor_change || '').split('->').map((v: string) => v.trim())
    const entry = { to: s.id, from: x.from, silent: x.silent, note: x.note, from_anchor: from }
    for (const m of new Set([from, to]))
      if (byAnchor[m])
        (switchesByAnchor[m] ??= []).push({ ...entry, side: m === to ? 'in' : 'out' })
  }

/**
 * 앵커 구성개념. 각 앵커가 읽는 물리량이다. 묶음은 축을 보여줄 뿐이고, 노트가 구성개념을
 * 공유한다고 앵커가 서로 환산되지는 않는다고 말한다.
 */
const ANCHOR_CONSTRUCTS: Construct[] = [
  {
    id: 'perception',
    label: '지각',
    note: '장비 없는 주관 축 — 유일한 보편 교환 축.',
  },
  {
    id: 'pace',
    label: '페이스(속도)',
    note: '같은 속도를 읽어도 서로 변환되지 않는다: VDOT는 측정된 피트니스, 목표 페이스는 희망.',
  },
  {
    id: 'heart-rate',
    label: '심박수',
    note: "같은 '70%'라도 최대(HRmax)와 예비량(HRR) 기준이면 다른 bpm이다.",
  },
  {
    id: 'metabolic',
    label: '대사 측정',
    note: '실험실·측정기 필요. VO2와 젖산은 서로 다른 생리 축이다.',
  },
]

/** 적응 분류의 거친 범주를 표시하는 고정 순서. */
const ADAPT_CATEGORIES: AdaptCategory[] = [
  { id: 'central-cardiovascular', label: '중심 심혈관' },
  { id: 'peripheral-aerobic', label: '말초 유산소' },
  { id: 'metabolic', label: '대사' },
  { id: 'neuromuscular', label: '신경근' },
  { id: 'structural', label: '구조·내구' },
  { id: 'skill', label: '기술' },
]

/** 모듈 상태. 구동하는 쪽이 세운다 — 브라우저 셸이거나 프리렌더러. */
let BASE = '/'

export function setBase(next: string) {
  BASE = next.endsWith('/') ? next : next + '/'
}

export const PLACEHOLDER = '검색: "tempo run", daniels, easy…'

/**
 * 날것의 intensity_model / anchor.model 코드를 호버 가능하게 만든다. 툴팁이 anchors.json
 * 에서 라벨 + 구성개념 + 측정에 필요한 것을 끌어오므로 `lactate_mmol` 같은 슬러그가 그
 * 자리에서 스스로를 설명한다.
 */
const CONSTRUCT_LABEL = Object.fromEntries(ANCHOR_CONSTRUCTS.map((c) => [c.id, c.label]))

/**
 * 호버하면 자기 차원을 설명하는 실행 조건 칩. 짧은 "9-13x/wk"·"≥120km"는 무엇인지를
 * 말하고, 툴팁은 그것이 무슨 뜻인지를 말한다.
 */
const COMMIT_TIPS = {
  sessions:
    '주당 훈련 세션 수 — 이 훈련법을 실행하는 데 필요한 주간 빈도다. 더블(하루 2회)이면 세션 수가 훈련일 수보다 많다.',
  volume: '권장 최소 주간 주행거리(km). 이 밑으로 내려가면 훈련법의 전제가 약해진다.',
  weeks: '권장 계획 길이(주).',
  track: '트랙이 필요한지 여부. 필요한 이유는 반복 구간을 정확히 재기 위해서다.',
}

const KM = (n: number | null | undefined) => (n == null ? '' : `${n}km`)
function sessionsText(sp?: { value?: number; min?: number; max?: number }) {
  if (!sp) return ''
  if (sp.value != null) return `${sp.value}×`
  return `${sp.min}–${sp.max}×`
}
function weeksText(pl?: { value?: number; min?: number; max?: number }) {
  if (!pl) return ''
  if (pl.value != null) return `${pl.value}w`
  return `${pl.min}–${pl.max}w`
}

/**
 * 라우트 트리는 이제 src/router.tsx에 있다. 여기 남는 것은 라우터가 소유하지 않는
 * 것들이다. 어떤 경로가 어느 내비 탭에 속하는지, 프리렌더러가 쓰는 엔트리별 <title>과
 * description, 그리고 내보낼 라우트 목록.
 */
export function currentView(path: string): string {
  const p = path || '/'
  if (p.startsWith('/anchor')) return 'anchors'
  if (p.startsWith('/workout')) return 'workouts'
  if (p.startsWith('/system')) return 'systems'
  return 'systems'
}

/**
 * 엔트리별 <title>과 description. 해시 라우팅이 결코 서빙할 수 없던 사전의 절반이다.
 * 크롤러나 링크 프리뷰가 읽는 것은 이것뿐이다.
 */
const SITE = 'Running Training Dataset'
export function metaFor(path: string): { title: string; description: string } {
  const parts = (path || '/').split('/').filter(Boolean)
  const clip = (s: string | undefined, n = 155) => {
    const v = String(s || '')
      .replace(/\s+/g, ' ')
      .trim()
    return v.length > n ? v.slice(0, n - 1).trimEnd() + '…' : v
  }
  if (parts[0] === 'anchors')
    return {
      title: `${'앵커'} · ${SITE}`,
      description: clip(
        '강도 앵커 8종을 측정 구성개념(지각·페이스·심박·대사)별로 정리. 같은 구성개념이라도 서로 변환되지 않는다.',
      ),
    }
  if (parts[0] === 'anchor' && byAnchor[parts[1]]) {
    const a = byAnchor[parts[1]]
    return {
      title: `${a.model} · ${SITE}`,
      description: clip(`${a.label} — ${a.requires}`),
    }
  }
  if (parts[0] === 'workouts')
    return {
      title: `${'워크아웃'} · ${SITE}`,
      description: clip(
        '각 워크아웃은 반증 가능한 주장과 그것을 반증하는 절차를 싣는다. 개선 수치는 없다 — 의도적으로.',
      ),
    }
  if (parts[0] === 'workout' && byWorkout[parts[1]]) {
    const w = byWorkout[parts[1]]
    return {
      title: `${w.canonical_name} · ${SITE}`,
      description: clip(w.claim?.proposition),
    }
  }
  if (parts[0] === 'system' && bySystem[parts[1]]) {
    const s = bySystem[parts[1]]
    return { title: `${s.name} · ${SITE}`, description: clip(s.bet) }
  }
  return {
    title: SITE,
    description: clip(
      '러닝 훈련법 카탈로그. 각 훈련법이 무엇에 베팅하는지, 실행 비용은 얼마인지, 실제로 알려진 것은 어디까지인지. 모든 행은 draft다.',
    ),
  }
}

/**
 * 경로에서 엔트리 이름을 만든다. 브라우저 셸의 최근 본 항목 띠가 쓰는데, 그것은 읽는
 * 사람마다 다르므로 절대 프리렌더되지 않는다 — 디스크의 파일은 모두에게 같아야 한다.
 */
export function entryLabel(path: string): { kind: string; label: string } | null {
  const parts = (path || '/').split('/').filter(Boolean)
  if (parts[0] === 'system' && bySystem[parts[1]])
    return { kind: 'system', label: bySystem[parts[1]].name }
  if (parts[0] === 'workout' && byWorkout[parts[1]])
    return { kind: 'workout', label: byWorkout[parts[1]].canonical_name }
  if (parts[0] === 'anchor' && byAnchor[parts[1]])
    return { kind: 'anchor', label: byAnchor[parts[1]].model }
  return null
}

export const RECENT_LABEL = '최근 본 항목'

/** 프리렌더러가 내보내는 모든 라우트. 사전 엔트리당 파일 하나. */
export function allRoutes() {
  return [
    '/',
    '/workouts',
    '/anchors',
    ...systems.map((s) => `/system/${s.id}`),
    ...workouts.map((w) => `/workout/${w.id}`),
    ...anchors.map((a) => `/anchor/${a.model}`),
  ]
}

/**
 * 뷰가 필요로 하지만 스스로 가지러 가서는 안 되는 것 전부. 행들, 역인덱스, 표시용 어휘.
 *
 * 이것이 있는 이유는 뷰가 예전에 이 파일 안의 템플릿 리터럴이었고 그 모든 것을 모듈
 * 수준 클로저에서 읽었기 때문이다. 컴포넌트가 되고 나서는 건네받아야 했고, `ctx` 하나를
 * 넘기는 방식이 마이그레이션을 한 번에 뒤엎는 대신 뷰 하나씩 진행할 수 있게 했다.
 */
export function viewContext(): ViewContext {
  return {
    url: (path: string) => `${BASE}${path}`,
    byWorkout,
    bySystem,
    byAnchor,
    byAdaptation,
    systems,
    workouts,
    anchors,
    adaptations,
    usage,
    constructs: ANCHOR_CONSTRUCTS,
    constructLabel: CONSTRUCT_LABEL,
    adaptCategories: ADAPT_CATEGORIES,
    commitTips: COMMIT_TIPS,
    fmt: { km: KM, sessions: sessionsText, weeks: weeksText },
    indexes: { systemsByAnchor, workoutsByAnchor, switchesByAnchor },
  }
}
