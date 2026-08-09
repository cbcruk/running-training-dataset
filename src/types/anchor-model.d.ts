// data/schema/*.json에서 scripts/types.ts가 생성한 파일 - 고치지 말 것.
// 스키마를 바꾼 뒤에는 `vp run types`를 실행한다.
//
// 여기서 lint를 끈 것은 의도적이다. 이 파일의 모양은 생성기의 몫이고, 경고를 손으로
// 고쳐봐야 다음 실행에 되돌아간다.
/* eslint-disable */

/**
 * The measurement layer. One row per intensity_model: what it takes to measure, and the honest degraded path when you cannot. NOT a conversion - anchors do not convert cleanly, so the fallback points at the equipment-free floor (rpe_10) and names what is lost, never a numeric substitution.
 */
export type IntensityAnchorModel = {
  [k: string]: unknown
} & {
  /**
   * Matches intensity_model on systems and anchor.model on workouts.
   */
  model:
    | 'daniels-vdot'
    | 'pct_hrmax'
    | 'pct_hrr'
    | 'pct_vo2max'
    | 'pct_cs'
    | 'rpe_10'
    | 'lactate_mmol'
    | 'race_pace_ref'
  /**
   * The physical quantity the anchor reads. Anchors sharing a construct are NOT interconvertible - two heart-rate anchors (max vs reserve) mean different bpm for the same %; grouping shows the axes, it does not bridge them. Only rpe_10 is 'perception'.
   */
  construct: 'perception' | 'pace' | 'heart-rate' | 'metabolic'
  label: I18N
  /**
   * Korean prose. The dataset is Korean-only; English survives only where it is data rather than translation - colloquial names, canonical names, attributions and citations.
   */
  requires: string
  /**
   * true only for the universal floor (rpe_10). Enforced in validate.ts.
   */
  equipment_free: boolean
  /**
   * Korean prose. The dataset is Korean-only; English survives only where it is data rather than translation - colloquial names, canonical names, attributions and citations.
   */
  fallback?: string
  note?: I18N
}
/**
 * Korean prose. The dataset is Korean-only; English survives only where it is data rather than translation - colloquial names, canonical names, attributions and citations.
 */
export type I18N = string
