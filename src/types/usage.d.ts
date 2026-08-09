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
 * (system, workout) -> what that system calls it. Naming is a join, not a field: putting name='tempo run' on a workout row makes the dataset wrong on arrival, because Daniels' tempo is threshold and Hansons' tempo is marathon pace.
 */
export interface NamingUsage {
  /**
   * A system id, or null for folk usage belonging to no system.
   */
  system: string | null
  /**
   * A workout id.
   */
  workout: string
  /**
   * The colloquial name as used. This is the only place a colloquial name may live.
   */
  calls_it: string
  /**
   * @minItems 1
   */
  also_known_as?: [string, ...string[]]
  /**
   * true = this name maps to a different workout in another system. Derivable from the table, stored so the renderer can flag without a scan.
   */
  collides?: boolean
  note?: I18N
}
