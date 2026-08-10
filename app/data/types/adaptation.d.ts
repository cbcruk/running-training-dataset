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

/**
 * A taxonomy over target_adaptation - the flat enum grouped into coarse physiological categories with a definition. Descriptive only: it names and groups what a workout is claimed to target, and never asserts that a workout produces an outcome (that would reopen the expected_improvement trap). The categories are broad groupings, not claims of mechanistic isolation.
 */
export interface TargetAdaptation {
  /**
   * Matches the target_adaptation enum on workouts.
   */
  id:
    | 'plasma-volume'
    | 'capillarization'
    | 'mitochondrial-density'
    | 'stroke-volume'
    | 'lactate-clearance'
    | 'mlss-shift'
    | 'vo2max'
    | 'running-economy'
    | 'neuromuscular-recruitment'
    | 'glycogen-storage'
    | 'fat-oxidation'
    | 'tendon-stiffness'
    | 'bone-density'
    | 'musculoskeletal-durability'
    | 'pacing-skill'
  /**
   * A coarse physiological grouping (the taxonomy's broader term). Deliberately broad, not a claim of mechanistic isolation.
   */
  category:
    | 'central-cardiovascular'
    | 'peripheral-aerobic'
    | 'metabolic'
    | 'neuromuscular'
    | 'structural'
    | 'skill'
  label: I18N
  /**
   * Korean prose. The dataset is Korean-only; English survives only where it is data rather than translation - colloquial names, canonical names, attributions and citations.
   */
  definition: string
}
