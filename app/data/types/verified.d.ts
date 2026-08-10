// data/schema/*.json에서 scripts/types.ts가 생성한 파일 - 고치지 말 것.
// 스키마를 바꾼 뒤에는 `vp run types`를 실행한다.
//
// 여기서 lint를 끈 것은 의도적이다. 이 파일의 모양은 생성기의 몫이고, 경고를 손으로
// 고쳐봐야 다음 실행에 되돌아간다.
/* eslint-disable */

/**
 * One act of reading: a person opened a source and decided whether it supports one assertion. Hand-written, never generated - this is the only place in the repo where a human read is recorded, and the point is that the record can be inspected rather than inferred from a flipped boolean.
 */
export interface VerificationLedgerEntry {
  /**
   * The reference that was read, in the same canonical string the data uses. Held to the one-reference-one-string rule alongside `cite` and `source`.
   */
  cite: string
  /**
   * A workout or system id.
   */
  row: string
  /**
   * Dotted path to the evidence-bearing node, as `evidence.ts` reports it: `claim`, `test`, `distribution`, `volume_caps[0]`, or "" for the row's own evidence.
   */
  path: string
  /**
   * Whether the source turned out to support the assertion. `false` is not a failure to record but a result: the cite must then be gone from the data, and this entry is what stops it being added back by someone who has not read it.
   */
  supports: boolean
  /**
   * Who read it. A name, not a handle - the value of this record is that it is attributable.
   */
  by: string
  /**
   * The date of the reading, ISO. A verification ages: a source read once does not need re-reading, but a claim rewritten after this date does.
   */
  on: string
  /**
   * What was found, concretely enough that a reader can tell it was actually read - the sentence, the section, the figure. "확인함" is not a note.
   */
  note: string
}
