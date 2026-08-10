// data/schema/*.json에서 scripts/types.ts가 생성한 파일 - 고치지 말 것.
// 스키마를 바꾼 뒤에는 `vp run types`를 실행한다.
//
// 여기서 lint를 끈 것은 의도적이다. 이 파일의 모양은 생성기의 몫이고, 경고를 손으로
// 고쳐봐야 다음 실행에 되돌아간다.
/* eslint-disable */

/**
 * Korean prose. The dataset is Korean-only; English survives only where it is data rather than translation - colloquial names, canonical names, attributions and citations.
 */
export type I18N = string
export type Count = {
  value?: number
  min?: number
  max?: number
} & Count1
export type Count1 = {
  [k: string]: unknown
}
export type Evidence = {
  [k: string]: unknown
} & {
  tier: 'consensus' | 'plausible' | 'tradition'
  /**
   * @minItems 1
   */
  cite?: [string, ...string[]]
  note?: I18N
}

/**
 * The browsing entity. A system is a bet plus the cost of taking it, not a plan.
 */
export interface TrainingSystem {
  id: string
  name: string
  /**
   * Who formalized it. null = folk/unattributable.
   */
  attribution?: string | null
  /**
   * Provenance: where the description of this method comes from. A canonical text is the authoritative record of what a system prescribes - which is a different question from whether it works, and that one is answered (or not) by `evidence`. A `source` never justifies a tier, and unlike `cite` it is allowed at any tier, including `tradition`.
   *
   * @minItems 1
   */
  source?: [string, ...string[]]
  /**
   * The state of `source`, stated rather than left to be inferred from its absence. recorded = the describing text is cited in `source`. unrecorded = such a text exists but is not cited here yet. uncitable = no citable describing text exists at all, so `source` can never be filled. The last two both render as an empty `source`, which is why the distinction has to be written down: 'not yet done' and 'cannot be done' are different facts about a row. Tied to `source` in validate.ts, so it cannot drift from it.
   */
  provenance: 'recorded' | 'unrecorded' | 'uncitable'
  /**
   * draft = citations unverified by a human. Nothing ships verified without L4 human commit.
   */
  status: 'draft' | 'verified'
  /**
   * The system's anchor. switching_cost.anchor_change is derived from this, therefore machine-verifiable.
   */
  intensity_model:
    | 'daniels-vdot'
    | 'pct_hrmax'
    | 'pct_hrr'
    | 'pct_vo2max'
    | 'pct_cs'
    | 'rpe_10'
    | 'lactate_mmol'
    | 'race_pace_ref'
  /**
   * One sentence, what it wagers that others do not. Length and sentence count are enforced in validate.ts. Longer than a sentence is philosophy, and there is a field for that.
   */
  bet: string
  philosophy: I18N
  commitment: Commitment
  switching_cost?: SwitchingCost[]
  distribution?: Distribution
  volume_caps?: VolumeCap[]
  phases?: Phase[]
  claim?: Claim
  evidence: Evidence
  caveats?: I18N[]
}
/**
 * The first filter for someone shopping methods: can I even run this? Rarely stated by the systems themselves.
 */
export interface Commitment {
  sessions_per_week: Count
  min_weekly_km?: number
  plan_length_weeks?: Count
  requires_track?: boolean
  note?: I18N
}
/**
 * What breaks when you arrive here from another system. anchor_change is derivable from both systems' intensity_model and is checked in validate.ts.
 */
export interface SwitchingCost {
  /**
   * A system id. Never this system's own id.
   */
  from: string
  /**
   * '<from.intensity_model> -> <this.intensity_model>'. Machine-verified, not authored freely.
   */
  anchor_change: string
  /**
   * true = a term survives the switch while its meaning changes. The dangerous case, because nothing signals it.
   */
  silent: boolean
  note: I18N
}
export interface Distribution {
  model: 'pyramidal' | 'polarized' | 'threshold' | 'unstructured'
  /**
   * Percent of SESSIONS, not time. The confusion is common enough to name in the field description.
   *
   * @minItems 2
   */
  zones?: [
    {
      label: string
      pct_sessions: number
    },
    {
      label: string
      pct_sessions: number
    },
    ...{
      label: string
      pct_sessions: number
    }[],
  ]
  evidence: Evidence
}
export interface VolumeCap {
  zone: string
  max_pct_weekly?: number
  max_km?: number
  rule: I18N
  evidence: Evidence
}
export interface Phase {
  name: 'base' | 'build' | 'peak' | 'taper' | 'offseason'
  /**
   * Workout ids. Referential integrity checked in validate.ts.
   *
   * @minItems 1
   */
  emphasis: [string, ...string[]]
  note?: I18N
}
/**
 * What this system asserts that its evidence is supposed to support. Required whenever root evidence claims more than tradition - evidence with nothing to be evidence *for* is unfalsifiable.
 */
export interface Claim {
  /**
   * Korean prose. The dataset is Korean-only; English survives only where it is data rather than translation - colloquial names, canonical names, attributions and citations.
   */
  proposition: string
  mechanism?: I18N
}
