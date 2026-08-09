/**
 * Data access and route metadata.
 *
 * The markup lives in src/components/, the route tree in src/router.tsx. What is
 * here is what both need and neither owns: the JSON loaded and asserted into the
 * generated schema types, the reverse indexes, the bilingual helper, and the
 * per-entry <title>/description the prerenderer writes.
 *
 * Epistemics live in the JSON; this file is convenience only. The one hard rule
 * it must honour (README "Known open problems"): the evidence tier goes on the
 * browse card, not buried in the detail view — so browsing ten systems can never
 * make a `tradition` system look as settled as a `consensus` one.
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
 * The schemas are the source of truth for these shapes; the types next to this
 * file are generated from them (scripts/types.ts). The JSON is asserted into
 * them rather than inferred, so a schema change surfaces here as a type error.
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
 * Reverse indexes so an anchor page can show everything that references it:
 * which systems anchor on it, which workouts list it (and where it is primary),
 * and every switching_cost whose anchor_change touches it on either side.
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
 * Anchor constructs: the physical quantity each anchor reads. Grouping shows the
 * axes; the notes state that sharing a construct does NOT make anchors convert.
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

/** Fixed display order for the adaptation taxonomy's coarse categories. */
const ADAPT_CATEGORIES: AdaptCategory[] = [
  { id: 'central-cardiovascular', label: '중심 심혈관' },
  { id: 'peripheral-aerobic', label: '말초 유산소' },
  { id: 'metabolic', label: '대사' },
  { id: 'neuromuscular', label: '신경근' },
  { id: 'structural', label: '구조·내구' },
  { id: 'skill', label: '기술' },
]

/** Module state, set by whichever host is driving: the browser shell or the prerenderer. */
let BASE = '/'

export function setBase(next: string) {
  BASE = next.endsWith('/') ? next : next + '/'
}

export const PLACEHOLDER = '검색: "tempo run", daniels, easy…'

/**
 * A raw intensity_model / anchor.model code, made hoverable: the tooltip pulls
 * label + construct + what-it-takes-to-measure from anchors.json so a slug like
 * "lactate_mmol" explains itself in place.
 */
const CONSTRUCT_LABEL = Object.fromEntries(ANCHOR_CONSTRUCTS.map((c) => [c.id, c.label]))

/**
 * A commitment chip that explains its dimension on hover - the terse
 * "9-13x/wk" / "≥120km" say what, the tooltip says what it means.
 */
const COMMIT_TIPS = {
  sessions:
    '주당 훈련 세션 수 — 이 체계를 실행하는 데 필요한 주간 빈도다. 더블(하루 2회)이면 세션 수가 훈련일 수보다 많다.',
  volume: '권장 최소 주간 주행거리(km). 이 밑으로 내려가면 체계의 전제가 약해진다.',
  weeks: '권장 계획 길이(주).',
  track: '트랙이 필요한지 여부. 필요하면 정밀한 반복 구간 측정을 위해서다.',
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
 * The route tree lives in src/router.tsx now. What stays here is what the router
 * does not own: which nav tab a path belongs to, the per-entry <title> and
 * description the prerenderer writes, and the list of routes to emit.
 */
export function currentView(path: string): string {
  const p = path || '/'
  if (p.startsWith('/anchor')) return 'anchors'
  if (p.startsWith('/workout')) return 'workouts'
  if (p.startsWith('/system')) return 'systems'
  return 'systems'
}

/**
 * Per-entry <title> and description. This is the half of the dictionary that hash
 * routing could never serve: a crawler or link preview reads only these.
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
      '러닝 훈련 체계 카탈로그. 각 체계가 무엇에 베팅하는지, 실행 비용은 얼마인지, 실제로 알려진 것은 어디까지인지. 모든 행은 draft다.',
    ),
  }
}

/**
 * Name an entry from its path. Used by the browser shell's recently-viewed strip,
 * which is per-reader and therefore never prerendered - the files on disk have to
 * stay identical for everyone.
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

/** Every route the prerenderer emits - one file per dictionary entry. */
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
 * Everything a view needs that it should not go and fetch for itself: the rows,
 * the reverse indexes, the display vocabularies and the language-bound `t`.
 *
 * It exists because the views used to be template literals in this file and read
 * all of that off the module-level closure. Once they became components they had
 * to be handed it instead, and passing one `ctx` is what let the migration run a
 * view at a time rather than as a big-bang rewrite.
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
