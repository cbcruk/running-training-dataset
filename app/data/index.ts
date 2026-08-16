/**
 * 데이터 접근과 페이지 메타데이터.
 *
 * 마크업은 app/ui/에, URL 계약은 app/routes/의 파일 이름에 있다. 여기 있는 것은 둘 다
 * 필요로 하지만 어느 쪽도 소유하지 않는 것들이다. 생성된 스키마 타입으로 단언해 읽은 JSON,
 * 역인덱스, 표시용 어휘, 그리고 엔트리별 <title>/description.
 *
 * 인식론은 JSON에 산다. 이 파일은 편의일 뿐이다. 다만 반드시 지켜야 하는 규칙 하나가
 * 있다(README "알려진 미해결 문제"): 근거 등급은 브라우즈 카드에 있어야지 상세 뷰에
 * 묻혀서는 안 된다 — 그래야 훈련법 열 개를 훑어도 `tradition`이 `consensus`처럼 정착된
 * 것으로 보이지 않는다.
 *
 * 컴포넌트가 이 모듈을 직접 임포트한다. 예전 판본은 전부를 `ViewContext` 하나로 묶어
 * 컴포넌트마다 넘겼는데, 그 제약은 뷰가 두 호스트에서 같은 원천으로 렌더되어야 한다는 데서
 * 왔다. 지금은 프리렌더러와 브라우저가 같은 라우트 트리를 돌리므로 넘길 이유가 없다.
 */
import systemsRaw from '../../data/systems.json' with { type: 'json' }
import workoutsRaw from '../../data/workouts.json' with { type: 'json' }
import usageRaw from '../../data/usage.json' with { type: 'json' }
import anchorsRaw from '../../data/anchors.json' with { type: 'json' }
import adaptationsRaw from '../../data/adaptations.json' with { type: 'json' }
import type { Adaptation, Anchor, System, Usage, Workout } from './types/index.d.ts'
import type { AdaptCategory, AnchorSwitch, AnchorUse, Construct } from './types/view.ts'

/**
 * 이 모양들의 진실의 원천은 스키마이고, 이 파일 옆의 타입은 거기서 생성된다
 * (scripts/types.ts). JSON은 추론되는 대신 그 타입으로 단언되므로, 스키마 변경이 여기서
 * 타입 오류로 드러난다.
 */
export const systems = systemsRaw as unknown as System[]
export const workouts = workoutsRaw as unknown as Workout[]
export const usage = usageRaw as unknown as Usage[]
export const anchors = anchorsRaw as unknown as Anchor[]
export const adaptations = adaptationsRaw as unknown as Adaptation[]

export const byWorkout: Record<string, Workout> = Object.fromEntries(workouts.map((w) => [w.id, w]))
export const bySystem: Record<string, System> = Object.fromEntries(systems.map((s) => [s.id, s]))
export const byAnchor: Record<string, Anchor> = Object.fromEntries(anchors.map((a) => [a.model, a]))
export const byAdaptation: Record<string, Adaptation> = Object.fromEntries(
  adaptations.map((a) => [a.id, a]),
)

/**
 * 앵커 페이지가 자기를 참조하는 모든 것을 보여줄 수 있도록 만든 역인덱스. 어떤 훈련법이
 * 거기에 매달리는지, 어떤 워크아웃이 그것을 싣는지(그리고 어디서 주앵커인지), 그리고
 * anchor_change가 어느 쪽으로든 그것에 닿는 모든 switching_cost.
 */
export const systemsByAnchor: Record<string, System[]> = {}
for (const s of systems) (systemsByAnchor[s.intensity_model] ??= []).push(s)

export const workoutsByAnchor: Record<string, AnchorUse[]> = {}
for (const w of workouts)
  for (const a of w.intensity.anchors)
    (workoutsByAnchor[a.model] ??= []).push({
      w,
      primary: w.intensity.primary_anchor === a.model,
    })

export const switchesByAnchor: Record<string, AnchorSwitch[]> = {}
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
export const ANCHOR_CONSTRUCTS: Construct[] = [
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
export const ADAPT_CATEGORIES: AdaptCategory[] = [
  { id: 'central-cardiovascular', label: '중심 심혈관' },
  { id: 'peripheral-aerobic', label: '말초 유산소' },
  { id: 'metabolic', label: '대사' },
  { id: 'neuromuscular', label: '신경근' },
  { id: 'structural', label: '구조·내구' },
  { id: 'skill', label: '기술' },
]

/**
 * 날것의 intensity_model / anchor.model 코드를 호버 가능하게 만든다. 툴팁이 anchors.json
 * 에서 라벨 + 구성개념 + 측정에 필요한 것을 끌어오므로 `lactate_mmol` 같은 슬러그가 그
 * 자리에서 스스로를 설명한다.
 */
export const CONSTRUCT_LABEL: Record<string, string> = Object.fromEntries(
  ANCHOR_CONSTRUCTS.map((c) => [c.id, c.label]),
)

/**
 * 호버하면 자기 차원을 설명하는 실행 조건 칩. 짧은 "9-13x/wk"·"≥120km"는 무엇인지를
 * 말하고, 툴팁은 그것이 무슨 뜻인지를 말한다.
 */
export const COMMIT_TIPS = {
  sessions:
    '주당 훈련 세션 수 — 이 훈련법을 실행하는 데 필요한 주간 빈도다. 더블(하루 2회)이면 세션 수가 훈련일 수보다 많다.',
  volume: '권장 최소 주간 주행거리(km). 이 밑으로 내려가면 훈련법의 전제가 약해진다.',
  weeks: '권장 계획 길이(주).',
  track: '트랙이 필요한지 여부. 필요한 이유는 반복 구간을 정확히 재기 위해서다.',
}

export const PLACEHOLDER = '검색: "tempo run", daniels, easy…'

export const km = (n: number | null | undefined) => (n == null ? '' : `${n}km`)

export function sessionsText(sp?: { value?: number; min?: number; max?: number }) {
  if (!sp) return ''
  if (sp.value != null) return `${sp.value}×`
  return `${sp.min}–${sp.max}×`
}

export function weeksText(pl?: { value?: number; min?: number; max?: number }) {
  if (!pl) return ''
  if (pl.value != null) return `${pl.value}w`
  return `${pl.min}–${pl.max}w`
}

/** 어떤 경로가 어느 내비 탭에 속하는지. */
export type View = 'systems' | 'workouts' | 'anchors'

/**
 * 엔트리별 <title>과 description. 크롤러나 링크 프리뷰가 읽는 것은 이것뿐이므로,
 * 프리렌더된 문서 하나하나가 자기 것을 들고 있어야 한다(ADR 0001).
 */
export interface PageMeta {
  title: string
  description: string
}

const SITE = 'Running Training Dataset'

const clip = (s: string | undefined, n = 155) => {
  const v = String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
  return v.length > n ? v.slice(0, n - 1).trimEnd() + '…' : v
}

export const HOME_META: PageMeta = {
  title: SITE,
  description: clip(
    '러닝 훈련법 카탈로그. 각 훈련법이 무엇에 베팅하는지, 실행 비용은 얼마인지, 실제로 알려진 것은 어디까지인지. 모든 행은 draft다.',
  ),
}

export const WORKOUTS_META: PageMeta = {
  title: `워크아웃 · ${SITE}`,
  description: clip(
    '각 워크아웃은 반증 가능한 주장과 그것을 반증하는 절차를 싣는다. 개선 수치는 없다 — 의도적으로.',
  ),
}

export const ANCHORS_META: PageMeta = {
  title: `앵커 · ${SITE}`,
  description: clip(
    '강도 앵커 8종을 측정 구성개념(지각·페이스·심박·대사)별로 정리. 같은 구성개념이라도 서로 변환되지 않는다.',
  ),
}

export function systemMeta(s: System): PageMeta {
  return { title: `${s.name} · ${SITE}`, description: clip(s.bet) }
}

export function workoutMeta(w: Workout): PageMeta {
  return { title: `${w.canonical_name} · ${SITE}`, description: clip(w.claim?.proposition) }
}

export function anchorMeta(a: Anchor): PageMeta {
  return { title: `${a.model} · ${SITE}`, description: clip(`${a.label} — ${a.requires}`) }
}

/**
 * 최근 본 항목 띠가 쓰는 라벨. 그 목록은 읽는 사람마다 다르므로 절대 프리렌더되지 않지만,
 * 라벨은 코퍼스가 있어야 붙일 수 있으므로 라우트가 지금 페이지의 것을 건네준다.
 *
 * `kind`와 `id`가 함께 가는 이유는 링크 때문이다. 띠는 완성된 경로 문자열이 아니라 이
 * 쌍을 저장하고, 라우터가 그것으로 타입 검사된 `<Link>`를 만든다(app/client/recent.tsx).
 */
export interface EntryLabel {
  kind: 'system' | 'workout' | 'anchor'
  id: string
  label: string
}

export function systemLabel(s: System): EntryLabel {
  return { kind: 'system', id: s.id, label: s.name }
}

export function workoutLabel(w: Workout): EntryLabel {
  return { kind: 'workout', id: w.id, label: w.canonical_name }
}

export function anchorLabel(a: Anchor): EntryLabel {
  return { kind: 'anchor', id: a.model, label: a.model }
}

/**
 * 검색 색인. 검색이 실제로 읽는 필드만 담는다.
 *
 * 파일도 엔드포인트도 아니다. 검색 컴포넌트가 브라우저에서 이 함수를 부른다
 * (app/client/search.tsx). ADR 0001이 세운 모양이고, 한 바퀴 돌아 제자리로 왔다: ADR 0009가
 * `/search-index.json`으로 옮겼던 것은 프리렌더된 문서마다 코퍼스를 싣지 않으려던 것이었고,
 * ADR 0011이 프리렌더를 포기하면서 그 이유가 사라졌다. 문서는 셸 하나뿐이고 코퍼스는 어차피
 * 번들을 탄다.
 *
 * 그래서 **한 번도 열지 않은 엔트리도 오프라인에서 검색된다.**
 */
export interface SearchEntry {
  kind: 'system' | 'workout' | 'anchor'
  id: string
  title: string
  sub: string
  tier?: string
  provenance?: string
  /** 소문자로 접어둔 검색 대상. 브라우저가 매번 다시 접지 않아도 되게. */
  haystack: string[]
}

export interface SearchIndex {
  entries: SearchEntry[]
  /**
   * 통칭 -> 그 통칭으로 불리는 워크아웃들. 이 데이터셋이 보이게 만들려고 존재하는 충돌이고,
   * 검색 결과의 헤드라인이다.
   */
  usage: { workout: string; calls_it: string; aka: string[]; system: string | null }[]
}

export function searchIndex(): SearchIndex {
  const fold = (...parts: (string | undefined | null)[]) =>
    parts.filter(Boolean).map((p) => String(p).toLowerCase())

  return {
    entries: [
      ...systems.map(
        (s): SearchEntry => ({
          kind: 'system',
          id: s.id,
          title: s.name,
          sub: s.bet,
          tier: s.evidence?.tier,
          provenance: s.provenance,
          haystack: fold(s.name, s.id, s.attribution, s.bet),
        }),
      ),
      ...workouts.map(
        (w): SearchEntry => ({
          kind: 'workout',
          id: w.id,
          title: w.canonical_name,
          sub: w.claim?.proposition ?? '',
          tier: w.claim?.evidence?.tier,
          provenance: w.provenance,
          haystack: fold(w.canonical_name, w.id, w.family, w.claim?.proposition),
        }),
      ),
      ...anchors.map(
        (a): SearchEntry => ({
          kind: 'anchor',
          id: a.model,
          title: a.model,
          sub: a.label,
          haystack: fold(a.model, a.construct, a.label),
        }),
      ),
    ],
    usage: usage.map((u) => ({
      workout: u.workout,
      calls_it: u.calls_it,
      aka: u.also_known_as ?? [],
      system: u.system ? (bySystem[u.system]?.name ?? u.system) : null,
    })),
  }
}
