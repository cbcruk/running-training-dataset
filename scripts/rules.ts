/**
 * 이 데이터셋이 지켜야 하는 모든 규칙을, 함수 하나 뒤에.
 *
 * 규칙들은 export가 하나도 없는 375줄짜리 스크립트였고, 유일한 인터페이스가 "프로세스를
 * 띄우고 stdout에서 OK를 grep한다"였다. 그래서 한 부류의 질문 자체를 테스트로 물을 수
 * 없었다 — *이* 규칙이 *이* 파손에 발동하는가. 새 규칙이 동작하는지 확인하려면 JSON을
 * 옆으로 복사하고, 디스크에서 고치고, 바이너리를 돌리고, stderr를 grep하고, 파일을
 * 복원해야 했다.
 *
 * 그래서 진입점 하나, 구조화된 발견, I/O 없음. scripts/validate.ts는 그 위의 CLI
 * 어댑터가 됐고, chart.tsx가 render.ts·workout-detail.tsx와 이미 맺고 있던 것과 같은 배치다.
 *
 * 규칙을 더한다는 건 id를 가진 `add(...)` 하나를 더한다는 뜻이다. id가 계약이다.
 * 테스트가 그것을 가리키고, README의 위반 목록이 코드 옆에서 표류하는 대신 코드와
 * 대조될 수 있게 하는 것도 그것이다.
 */

// ajv는 2020 진입점을 CJS로 배포한다. default export가 생성자다.
import Ajv2020Module from 'ajv/dist/2020.js'
import { assertions, citedWorks } from './evidence.ts'
import type { Dataset } from './dataset.ts'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = any
const Ajv2020 = Ajv2020Module as unknown as new (opts: Row) => any

/**
 * 기계가 검사할 수 있는 세 층. 실패시킬 값이 있는 순서대로: L1 `schema`(모양),
 * L2 `ref`(가리키는 것이 존재하는가), L3 `discipline`(이 프로젝트 고유의 규칙, 범용
 * 검증기라면 알 리 없는 것들).
 *
 * L4는 사람의 읽기다. 어떤 규칙도 그것을 수행할 수 없지만, ADR 0008 이후로 규칙은 그
 * *기록*을 검사할 수 있다. `data/verified.json`의 항목은 실재하는 주장을 가리켜야 하고,
 * 데이터가 그 인용을 아직 들고 있는지와 맞아야 하며, 한 행이 스스로를 `verified`라
 * 부르려면 그 행의 모든 인용에 대해 존재해야 한다.
 */
export type Layer = 'schema' | 'ref' | 'discipline'

export interface Finding {
  layer: Layer
  /** 안정된 kebab-case id. 테스트가 이것을 단언한다. 메시지는 사람이 읽는 것. */
  rule: string
  /** 이 발견이 가리키는 행. 목록 전체에 대한 것이면 파일 이름. */
  row: string
  /** 행 안의 점 표기 경로. 발견이 행보다 좁을 때. */
  path?: string
  message: string
}

const dupes = (arr: Row[]): Row[] => arr.filter((v: Row, i: number) => arr.indexOf(v) !== i)

/** 참조를 제1저자 + 연도로 묶는다. 하나의 문자열 규칙이 쓰는 키. */
const citeKey = (c: string): string | null => {
  const m = c.match(/^([A-Za-z][^(]*?)\s*\((\d{4})\)/)
  return m ? `${m[1].trim().split(/[\s,&]+/)[0]} ${m[2]}` : null
}

export function check(data: Dataset): Finding[] {
  const { workouts, systems, usage, anchors, adaptations, verified, schemas } = data
  const found: Finding[] = []
  const add = (layer: Layer, rule: string, row: string, message: string, path?: string) =>
    found.push(path ? { layer, rule, row, path, message } : { layer, rule, row, message })

  const ajv = new Ajv2020({ allErrors: true, strict: false })
  for (const [name, schema] of Object.entries(schemas)) ajv.addSchema(schema, name)

  for (const [name, list, key] of [
    ['workout', workouts, 'workout.schema.json'],
    ['system', systems, 'system.schema.json'],
    ['usage', usage, 'usage.schema.json'],
    ['anchor', anchors, 'anchor-model.schema.json'],
    ['adaptation', adaptations, 'adaptation.schema.json'],
    ['verified', verified, 'verified.schema.json'],
  ] as [string, Row[], string][]) {
    const validate = ajv.getSchema(key)
    list.forEach((row: Row, i: number) => {
      if (validate(row)) return
      // ajv는 `contains`에 맞지 않는 항목마다 별개의 오류로 보고한다. 노이즈다.
      // `contains` 자체의 판정만 남기고 항목별 잔해는 버린다.
      for (const e of validate.errors.filter((e: Row) => !/\/contains\//.test(e.schemaPath)))
        add(
          'schema',
          'schema',
          row.id ?? row.model ?? row.calls_it ?? `${name}[${i}]`,
          `${name}[${i}] ${row.id ?? row.model ?? row.calls_it ?? ''} ${e.instancePath} ${e.message}`,
          e.instancePath || undefined,
        )
    })
  }

  const wIds = new Set(workouts.map((w: Row) => w.id))
  const sIds = new Set(systems.map((s: Row) => s.id))

  for (const d of dupes(workouts.map((w: Row) => w.id)))
    add('ref', 'duplicate-id', d, `duplicate workout id: ${d}`)
  for (const d of dupes(systems.map((s: Row) => s.id)))
    add('ref', 'duplicate-id', d, `duplicate system id: ${d}`)

  // 측정 계층은 데이터가 실제로 쓰는 모든 앵커를 덮어야 한다. 그래야 훈련법의
  // intensity_model이나 워크아웃의 앵커가 "이걸 재려면 무엇이 필요한가"에 대한 답을
  // 갖지 못하는 일이 생기지 않는다.
  const anchorModels = new Set(anchors.map((a: Row) => a.model))
  for (const d of dupes(anchors.map((a: Row) => a.model)))
    add('ref', 'duplicate-id', d, `duplicate anchor model: ${d}`)
  for (const s of systems)
    if (!anchorModels.has(s.intensity_model))
      add(
        'ref',
        'unknown-anchor',
        s.id,
        `system ${s.id}: intensity_model "${s.intensity_model}" has no anchors.json entry`,
      )
  for (const w of workouts)
    for (const a of w.intensity.anchors)
      if (!anchorModels.has(a.model))
        add(
          'ref',
          'unknown-anchor',
          w.id,
          `${w.id}: anchor model "${a.model}" has no anchors.json entry`,
        )

  // 장비 없는 앵커는 정확히 하나이고 그것은 rpe_10이어야 한다 — 워크아웃 스키마가 행
  // 단위로 강제하는 것과 같은 원칙(rpe_10이 정확히 하나). 보편 바닥은 정의상 하나뿐이고,
  // 둘이면 하강의 목적지가 모호해진다.
  const free = anchors.filter((a: Row) => a.equipment_free).map((a: Row) => a.model)
  if (free.length !== 1 || free[0] !== 'rpe_10')
    add(
      'discipline',
      'equipment-free-anchor',
      'anchors.json',
      `anchors.json: the sole equipment_free anchor must be rpe_10, got [${free.join(', ')}]`,
    )
  // perception 구성개념은 주관 축이고, 그것이 곧 장비 없는 바닥이다. rpe_10만이,
  // 그리고 그 외에는 아무것도 그 자리를 주장할 수 없다.
  const perception = anchors
    .filter((a: Row) => a.construct === 'perception')
    .map((a: Row) => a.model)
  if (perception.length !== 1 || perception[0] !== 'rpe_10')
    add(
      'discipline',
      'perception-construct',
      'anchors.json',
      `anchors.json: the sole 'perception' construct must be rpe_10, got [${perception.join(', ')}]`,
    )

  // 적응 분류는 데이터가 쓰는 모든 target_adaptation을 덮어야 한다. 그래야 워크아웃이
  // 분류가 정의하지도 묶지도 않은 적응을 표적으로 삼는 일이 생기지 않는다.
  const adaptationIds = new Set(adaptations.map((a: Row) => a.id))
  for (const d of dupes(adaptations.map((a: Row) => a.id)))
    add('ref', 'duplicate-id', d, `duplicate adaptation id: ${d}`)
  for (const w of workouts)
    for (const t of w.target_adaptation)
      if (!adaptationIds.has(t))
        add(
          'ref',
          'unknown-adaptation',
          w.id,
          `${w.id}: target_adaptation "${t}" has no adaptations.json entry`,
        )

  const walkSegments = (segs: Row[], cb: (s: Row) => void) =>
    segs.forEach((s: Row) => {
      cb(s)
      if (s.children) walkSegments(s.children, cb)
    })

  for (const w of workouts) {
    walkSegments(w.structure.segments, (s: Row) => {
      if (s.intensity_ref && s.intensity_ref !== 'self' && !wIds.has(s.intensity_ref))
        add(
          'ref',
          'unknown-workout-ref',
          w.id,
          `${w.id}: intensity_ref "${s.intensity_ref}" is not a workout id`,
        )
      if (s.ramp_to && s.ramp_to !== 'self' && !wIds.has(s.ramp_to))
        add(
          'ref',
          'unknown-workout-ref',
          w.id,
          `${w.id}: ramp_to "${s.ramp_to}" is not a workout id`,
        )
    })
    for (const r of w.prerequisites?.requires_workouts ?? [])
      if (!wIds.has(r))
        add('ref', 'unknown-workout-ref', w.id, `${w.id}: requires_workouts "${r}" unknown`)
    if (
      w.intensity.primary_anchor &&
      !w.intensity.anchors.some((a: Row) => a.model === w.intensity.primary_anchor)
    )
      add(
        'ref',
        'primary-anchor-unlisted',
        w.id,
        `${w.id}: primary_anchor "${w.intensity.primary_anchor}" not in anchors`,
      )
    // 모델당 값 하나. pct_hrmax 앵커가 둘인 것은 뉘앙스가 아니라 행이 자기 자신과 불일치하는 것이다.
    for (const d of dupes(w.intensity.anchors.map((a: Row) => a.model)))
      add('discipline', 'duplicate-anchor-model', w.id, `${w.id}: duplicate anchor model "${d}"`)
  }
  // `base`/`build`/`peak`/`taper`/`offseason`은 양쪽에서 쓰는 한 어휘다. 훈련법은 어떤
  // 주기에서 어떤 워크아웃을 강조하는지 말하고, 워크아웃은 자기가 어느 주기에 놓이는지
  // 말한다. 둘을 맞추는 것이 없어서, 훈련법이 `taper`에서 강조하는 워크아웃이 정작
  // 자기는 `base`에만 놓인다고 말할 수 있었고, 페이지는 그 두 진술을 아무 표시 없이
  // 나란히 렌더했다. 강조된 id가 존재하는지 보는 것은 이 필드의 참조 무결성 전부가
  // 아니었다.
  const byWorkoutId = Object.fromEntries(workouts.map((w: Row) => [w.id, w]))
  for (const s of systems)
    for (const p of s.phases ?? [])
      for (const e of p.emphasis) {
        if (!wIds.has(e)) {
          add(
            'ref',
            'unknown-workout-ref',
            s.id,
            `system ${s.id} phase ${p.name}: unknown workout "${e}"`,
          )
          continue
        }
        const placement: string[] = byWorkoutId[e].placement ?? []
        if (!placement.includes(p.name))
          add(
            'ref',
            'phase-placement-mismatch',
            s.id,
            `system ${s.id} phase ${p.name}: emphasises "${e}", but that workout is placed in [${placement.join(', ')}]`,
            `phases.${p.name}`,
          )
      }

  for (const u of usage) {
    if (!wIds.has(u.workout))
      add(
        'ref',
        'unknown-workout-ref',
        u.calls_it,
        `usage "${u.calls_it}": unknown workout "${u.workout}"`,
      )
    if (u.system !== null && !sIds.has(u.system))
      add(
        'ref',
        'unknown-system-ref',
        u.calls_it,
        `usage "${u.calls_it}": unknown system "${u.system}"`,
      )
  }

  // 통칭은 워크아웃 행으로 새어 들어와서는 안 된다. 그건 usage.json의 몫이다.
  const BANNED_IN_ID = ['tempo', 'easy-pace', 'lt-run', 'pickup']
  for (const w of workouts)
    for (const b of BANNED_IN_ID)
      if (w.id.includes(b) || w.canonical_name.toLowerCase().includes(b))
        add(
          'discipline',
          'colloquial-in-id',
          w.id,
          `${w.id}: overloaded colloquial term "${b}" in id/canonical_name. Put it in usage.json.`,
        )

  // 위의 BANNED_IN_ID는 규칙이 아니라 *이미 걸린 위반자 목록*이다. 아무도 예견하지 않은
  // 통칭은 그냥 통과하고, 실제로 둘이 그렇게 들어와 있었다: `mona-fartlek`(Steve
  // Moneghetti의 별명)과 `cruise-intervals`(Jack Daniels의 고유 조어 — 같은 행을
  // norwegian-singles는 "Threshold intervals", bakken-doubles는 "Double threshold"라고
  // 부른다고 usage.json이 이미 적고 있었는데도 그중 하나를 중립 id로 앉혔다).
  //
  // 그래서 방향을 뒤집는다. 막을 낱말을 세는 대신, id의 각 토큰이 이 데이터셋이 이미
  // 합의한 어휘에서 왔는지를 묻는다. 기본값이 거부이므로 다음 위반자를 미리 알 필요가 없다.
  //
  // 어휘의 대부분은 스키마와 데이터에서 그대로 끌어온다. 구조를 가리키는 낱말만 여기
  // 적는데, 이 목록이 짧게 유지되는 것 자체가 강제 장치다 — 새 낱말을 쓰려면 그 낱말이
  // 이 프로젝트의 어휘라고 명시적으로 선언해야 한다.
  //
  // 앵커 모델명은 일부러 어휘에서 뺐다. `daniels-vdot`이 거기 있어서, 어휘로 삼으면
  // `daniels-intervals`가 통과해버린다 — 이 규칙이 잡으려는 바로 그 형태가.
  const SHAPE_WORDS = [
    'run',
    'intervals',
    'repeats',
    'sprints',
    'set',
    'continuous',
    'progression',
    'alternations',
    'trial',
    'time',
    'strides',
    'descending',
    'uniform',
    'rep',
    '30',
    'marathon',
    'aerobic',
    'anaerobic',
    'downhill',
  ]
  const workoutSchemaProps = schemas['workout.schema.json'].properties
  const vocabulary = new Set<string>(SHAPE_WORDS)
  const admit = (term: string) => term.split('-').forEach((t: string) => vocabulary.add(t))
  for (const e of workoutSchemaProps.family.enum) admit(e)
  for (const e of workoutSchemaProps.venue.items.enum) admit(e)
  for (const e of workoutSchemaProps.placement.items.enum) admit(e)
  for (const e of workoutSchemaProps.target_adaptation.items.enum) admit(e)
  for (const a of adaptations) admit(a.id)

  for (const w of workouts) {
    const outside = w.id.split('-').filter((t: string) => !vocabulary.has(t))
    if (outside.length)
      add(
        'discipline',
        'id-outside-vocabulary',
        w.id,
        `${w.id}: "${outside.join('", "')}" is not in the dataset's vocabulary. ` +
          `A workout id is descriptive and system-neutral - a coach's name for it, ` +
          `or a coach's name, belongs in usage.json.`,
      )
  }

  // `tradition`은 두 가지 서로 다른 사실을 한 낱말로 덮고 있었다. 아무도 아직 연구하지
  // 않은 것과, 지금 서술된 형태로는 용량 질문 자체가 성립하지 않는 것. 앞의 것은 연구가
  // 메울 수 있는 공백이고 뒤의 것은 영구적인 성질인데, 화면에서는 똑같이 "관행"으로
  // 보였다. `provenance`의 `unrecorded` vs `uncitable`과 같은 구멍이다.
  //
  // `dose_question`은 자유 서술이 아니다. 행이 스스로 `structure.stochastic`으로 "내
  // 구간은 예시일 뿐"이라고 선언하는 것이 곧 용량에 지시대상이 없다는 뜻이므로, 양방향으로
  // 묶는다. 확률적인 행은 `unaskable`을 달아야 하고, `unaskable`을 단 행은 확률적이어야
  // 한다. 어느 쪽도 혼자서는 선언될 수 없다.
  const doseQuestions = (w: Row): string[] => {
    const out: string[] = []
    const walk = (node: Row) => {
      if (Array.isArray(node)) return node.forEach(walk)
      if (!node || typeof node !== 'object') return
      if (node.tier === 'tradition' && node.dose_question) out.push(node.dose_question)
      for (const v of Object.values(node)) walk(v)
    }
    walk(w)
    return out
  }
  for (const w of workouts) {
    const answers = doseQuestions(w)
    if (w.structure.stochastic === true) {
      if (answers.some((a) => a !== 'unaskable'))
        add(
          'discipline',
          'stochastic-dose-question',
          w.id,
          `${w.id}: structure.stochastic is true, so its segments are illustrative and ` +
            `there is no dose to ask about - every tradition evidence on it must be ` +
            `dose_question "unaskable", got [${answers.join(', ')}]`,
        )
    } else if (answers.includes('unaskable'))
      add(
        'discipline',
        'unaskable-without-stochastic',
        w.id,
        `${w.id}: dose_question "unaskable" claims the protocol has no fixed dose, but ` +
          `structure.stochastic is not true - the structure says otherwise`,
      )
  }

  // 모든 워크아웃은 최소 하나의 이름으로 도달 가능해야 한다. 아니면 찾을 수 없다.
  for (const w of workouts)
    if (!usage.some((u: Row) => u.workout === w.id))
      add(
        'discipline',
        'unnameable-workout',
        w.id,
        `${w.id}: no usage row - unnameable, therefore unfindable`,
      )

  // bet은 한 문장이다. 문단이 필요하면 그건 philosophy이고, 그 필드가 따로 있다. 90자
  // 한도는 영어 표기를 기준으로 정해졌다. 한국어는 같은 말을 더 적은 글자로 하므로 이
  // 한도는 틀린 것이 아니라 느슨해졌다 — 조이려면 새 숫자를 논증하는 변경으로 할 것.
  for (const s of systems) {
    const b: string = s.bet
    if (b.length > 90)
      add(
        'discipline',
        'bet-too-long',
        s.id,
        `system ${s.id}: bet is ${b.length} chars - not a bet, that is philosophy`,
        'bet',
      )
    if ((b.match(/[.!?。]/g) ?? []).length > 1)
      add(
        'discipline',
        'bet-multi-sentence',
        s.id,
        `system ${s.id}: bet is more than one sentence`,
        'bet',
      )
  }

  // switching_cost.anchor_change는 intensity_model에서 유도되므로 검증 가능하다.
  const sysById = Object.fromEntries(systems.map((s: Row) => [s.id, s]))
  for (const s of systems)
    for (const sc of s.switching_cost ?? []) {
      if (sc.from === s.id)
        add('discipline', 'switching-cost-self', s.id, `system ${s.id}: switching_cost from itself`)
      const src = sysById[sc.from]
      if (!src) {
        add(
          'ref',
          'unknown-system-ref',
          s.id,
          `system ${s.id}: switching_cost.from "${sc.from}" unknown`,
        )
        continue
      }
      const expected = `${src.intensity_model} -> ${s.intensity_model}`
      if (sc.anchor_change !== expected)
        add(
          'discipline',
          'anchor-change-contradicts',
          s.id,
          `system ${s.id} <- ${sc.from}: anchor_change "${sc.anchor_change}" contradicts intensity_model, expected "${expected}"`,
        )
    }

  // 주장 자신의 기전을 통해 작용하는 교란은 정의상 심각하다.
  for (const w of workouts)
    for (const c of w.test.confounds ?? [])
      if (c.shares_mechanism === true && c.severity !== 'high')
        add(
          'discipline',
          'confound-severity',
          w.id,
          `${w.id}: confound "${c.factor}" shares_mechanism but severity="${c.severity}" - mechanistic indistinguishability is high by definition`,
          'test.confounds',
        )

  const rows = [...workouts, ...systems]

  // cite는 인용처럼 생겨야 한다. URL이나 분위기가 아니라.
  for (const row of rows)
    for (const a of assertions(row))
      for (const c of a.evidence.cite ?? [])
        if (!/\(\d{4}\)/.test(c))
          add(
            'discipline',
            'cite-year',
            row.id,
            `${row.id}: cite lacks a (year): "${c.slice(0, 50)}"`,
            a.path,
          )

  // `source`는 근거가 아니라 출처지만 여전히 인용이고 같은 기준으로 검사된다. 워크아웃도
  // 훈련법과 같은 조건으로 이 필드를 갖는다. 정경 텍스트를 *효능* 근거에서 떼어내는 일이
  // 그 텍스트가 무엇을 *처방하는지*의 기록까지 지워서는 안 되고, 그것이 `source`가
  // 지키려고 존재하는 분리다.
  for (const row of rows)
    for (const src of row.source ?? [])
      if (!/\(\d{4}\)/.test(src))
        add(
          'discipline',
          'source-year',
          row.id,
          `${row.id}: source lacks a (year): "${src.slice(0, 50)}"`,
        )

  // 빈 `source`는 혼자서는 아무 말도 하지 않고, 침묵은 "괜찮음"으로 읽힌다. 기록된
  // 텍스트가 없는 행과 텍스트가 존재할 수 없는 행은 다른 사실인데, `provenance`가 생기기
  // 전까지 둘 다 같은 빈칸으로 렌더됐다. 둘을 묶으면 이 필드가 아무나 붙일 수 있는
  // 라벨이 아니라 검사되는 진술이 된다. `recorded`는 자기가 주장하는 source를 내놓아야
  // 하고 나머지 둘은 비어 있어야 하므로, 배지가 그 아래 행과 어긋날 수 없다.
  for (const row of rows) {
    const has = !!row.source?.length
    if (row.provenance === 'recorded' && !has)
      add(
        'discipline',
        'provenance-source-mismatch',
        row.id,
        `${row.id}: provenance="recorded" but no source - nothing was recorded`,
      )
    if (row.provenance !== 'recorded' && has)
      add(
        'discipline',
        'provenance-source-mismatch',
        row.id,
        `${row.id}: provenance="${row.provenance}" but a source is present - a recorded text makes the row "recorded"`,
      )
  }

  // 아무도 정식화하지 않은 워크아웃에는 그것을 서술하는 권위 있는 텍스트가 있을 수
  // 없으므로, 빈 `source`는 "아직 못 함"이 아니라 "할 수 없음"이다. 라벨을
  // `attribution`에서 유도하면 둘이 어긋나지 않는다. 통칭 워크아웃을 `unrecorded`로
  // 표시하면 영원히 채울 수 없는 행이 누군가의 작업 목록에 올라간다.
  for (const w of workouts)
    if (w.attribution === null && w.provenance !== 'uncitable')
      add(
        'discipline',
        'folk-workout-uncitable',
        w.id,
        `${w.id}: attribution=null but provenance="${w.provenance}" - a workout formalized by nobody has no authoritative text to record`,
      )

  // 이 구분은 둘이 결코 합쳐지지 않을 때만 유지된다. 같은 저작을 서술이자 증명으로
  // 인용하는 행은 방법이 자기를 서술하는 것으로 자기를 입증한다고 주장하는 것이고,
  // `source`는 바로 그 혼동을 가르려고 도입됐다.
  for (const row of rows) {
    const cites = citedWorks(row)
    for (const src of row.source ?? [])
      if (cites.has(src))
        add(
          'discipline',
          'source-and-cite',
          row.id,
          `${row.id}: "${src.slice(0, 45)}..." is both a source and an evidence cite - provenance and efficacy are different claims and must not share a reference on one row`,
        )
  }

  // 하나의 참조, 하나의 문자열. 검증 패스(docs/TODO.md §1)는 사람에게 각 소스를 한 번씩
  // 확인하라고 하는데, 그건 소스가 어디서나 같게 읽힐 때만 성립한다. 한 참조의 두 표기는
  // (test에는 축약형, claim에는 전체형) 두 소스로 보이고 하나로 grep되지 않는다. 이
  // 규칙이 돌기 전 Billat 2001은 세 가지 형태로 갈라져 있었고 그중 하나는 이니셜이
  // 틀렸다. source도 다른 것과 같은 참조다. 출처로 나오든 근거로 나오든 한 저작, 한
  // 문자열.
  const citeForms: Record<string, Set<string>> = {}
  const noteForm = (c: string) => {
    const key = citeKey(c)
    if (key) (citeForms[key] ??= new Set()).add(c)
  }
  for (const row of rows) {
    for (const src of row.source ?? []) noteForm(src)
    for (const a of assertions(row)) for (const c of a.evidence.cite ?? []) noteForm(c)
  }
  // 원장 항목도 참조를 부른다. 검증자가 그것을 세 번째 방식으로 적었다면, 데이터와
  // 맞춰볼 수 없는 무언가에 대한 읽기를 기록하는 셈이다.
  for (const v of verified) noteForm(v.cite)
  for (const [key, forms] of Object.entries(citeForms))
    if (forms.size > 1)
      add(
        'discipline',
        'one-reference-one-string',
        key,
        `citation "${key}" appears in ${forms.size} renderings - pick one canonical string:\n` +
          [...forms].map((f) => `      - ${f}`).join('\n'),
      )

  // 근거는 무엇의 근거인지가 있어야 한다. claim.proposition 없이 tradition 이상을
  // 주장하는 훈련법 행은 구조적으로 반증 불가능하다 — 인용이 무엇을 보였어야 하는지
  // 아무것도 진술되지 않은 채 놓여 있다. TODO §1b 작업에서 13행 중 6행이 그랬고, 이
  // 규칙이 그것이 돌아오지 못하게 한다.
  for (const s of systems)
    if (s.evidence && s.evidence.tier !== 'tradition' && !s.claim?.proposition)
      add(
        'discipline',
        'claim-proposition-required',
        s.id,
        `${s.id}: evidence.tier="${s.evidence.tier}" needs a claim.proposition - evidence with nothing to be evidence for cannot be checked or falsified`,
      )

  // test는 claim에서 파생된 절차이므로, claim을 확립하는 소스가 test를 독립적으로
  // 확립할 수는 없다 — 재사용하면 한 번의 읽기가 두 개의 주장으로 계산되어 모든 등급
  // 카운트가 부풀어 오른다. 시드 데이터에서 인용을 가진 test 여덟 개 전부가 자기 claim의
  // 인용을 글자 그대로 재사용했는데, 그것이 자기 정보가 없는 슬롯의 모습이다. 기준은
  // 비포함이 아니라 서로소다. 반론은 참조 하나하나에 걸리므로, claim이 [A]를 인용할 때
  // test가 [A, B]를 인용해도 A는 여전히 두 번 세어진다. test가 인용해도 *되는* 것은
  // 측정에 관한 소스이고, 그건 구조적으로 서로소다.
  for (const w of workouts) {
    const claimCites = new Set<string>(w.claim?.evidence?.cite ?? [])
    for (const c of w.test?.evidence?.cite ?? [])
      if (claimCites.has(c))
        add(
          'discipline',
          'test-cite-duplicates-claim',
          w.id,
          `${w.id}: test cites "${c.slice(0, 45)}..." which its claim already cites - a test's evidence must stand on its own or not exist`,
          'test.evidence',
        )
  }

  // test는 생리학적 발견이 아니라 현장 관측 휴리스틱이고, 데이터셋 스스로 그렇게 말한다.
  // `confounds`는 최소 하나를 요구하고, 가장 나쁜 종류는 주장 자신의 기전을 통해 작용해
  // 관찰로 분리되지 않는다. 행 스스로 기전적으로 구별 불가능하다고 선언한 신호가 동시에
  // 분야가 정착시킨 것일 수는 없다. `consensus`는 claim의 것이다.
  for (const w of workouts)
    if (w.test?.evidence?.tier === 'consensus')
      add(
        'discipline',
        'test-consensus',
        w.id,
        `${w.id}: test.evidence.tier=consensus - a test is an observation heuristic carrying its own confounds, and the top tier is for claims`,
        'test.evidence',
      )

  // `consensus`는 분야가 동의한다고 주장하는데, 그것은 어떤 단일 소스도 진술하지 않고
  // 생성기가 서지에서 읽어낼 수도 없다. 논문을 실제로 열어봐야만 충족되는 바를 가진
  // 유일한 등급이므로, 사람 서명 게이트를 복제하는 대신 물려받는다. status는 "사람이
  // 읽었는가"에 답하고 tier는 "얼마나 뒷받침되는가"에 답하는데, 최상위 등급에서만
  // 전자가 후자의 전제 조건이 된다.
  for (const row of rows)
    for (const a of assertions(row))
      if (a.evidence.tier === 'consensus' && row.status !== 'verified')
        add(
          'discipline',
          'consensus-requires-verified',
          row.id,
          `${row.id}: tier=consensus on a status="${row.status}" row - the top tier requires the human read that status records`,
          a.path,
        )

  // 사람의 읽기는 살 자리가 없었다. 워크시트의 체크박스는 재생성될 때마다 다시 쓰이고,
  // `status: verified`는 누가 썼는지 규칙이 알 수 없다는 이유로 통째로 거부됐다 — 그래서
  // 그 읽기를 요구하는 최상위 등급은 비어 있는 것이 아니라 닫혀 있었다. 원장은 그 주장을
  // 금지하는 대신 명시적으로 만든다. 항목이 소스와 주장과 사람과 날짜와 무엇을 찾았는지를
  // 부르고, 한 단어 diff에서 추측되는 대신 리뷰에서 읽힌다.
  const byId = Object.fromEntries(rows.map((r: Row) => [r.id, r]))
  const assertionKey = (row: string, path: string) => `${row} ${path}`
  const citesAt = new Map<string, Set<string>>()
  for (const row of rows)
    for (const a of assertions(row))
      citesAt.set(assertionKey(row.id, a.path), new Set(a.evidence.cite ?? []))

  for (const v of verified) {
    if (!byId[v.row]) {
      add('ref', 'ledger-unknown-row', v.row, `verified: "${v.row}" is not a workout or system id`)
      continue
    }
    const at = citesAt.get(assertionKey(v.row, v.path))
    if (!at) {
      add(
        'ref',
        'ledger-unknown-assertion',
        v.row,
        `verified: ${v.row} has no evidence at path "${v.path}"`,
        v.path,
      )
      continue
    }
    // 항목과 데이터가 같은 말을 해야 한다. 확인된 읽기인데 그 인용이 이후 제거됐다면
    // 기록이 낡은 것이고, 기각된 읽기인데 인용이 아직 남아 있다면 기각이 적용되지 않은
    // 것이다 — 그리고 두 번째 경우가, 누군가 이미 배제한 참조가 조용히 돌아오는 것을
    // 막는다.
    const present = at.has(v.cite)
    if (v.supports && !present)
      add(
        'discipline',
        'ledger-contradicts-data',
        v.row,
        `verified: ${v.row}.${v.path} was confirmed against "${v.cite.slice(0, 40)}..." but no longer cites it`,
        v.path,
      )
    if (!v.supports && present)
      add(
        'discipline',
        'ledger-contradicts-data',
        v.row,
        `verified: ${v.row}.${v.path} still cites "${v.cite.slice(0, 40)}..." which a reading rejected - drop the cite`,
        v.path,
      )
  }

  // 인용이 확인되지 않은 채로는 아무것도 verified로 나가지 않는다. 무엇이 확인된
  // 것인지도 이제 진술 가능하다. 그 행이 인용하는 모든 참조에 확인 항목이 있다는 것.
  const confirmed = new Set(
    verified.filter((v: Row) => v.supports).map((v: Row) => `${v.row} ${v.path} ${v.cite}`),
  )
  for (const row of rows) {
    if (row.status !== 'verified') continue
    const missing: string[] = []
    for (const a of assertions(row))
      for (const c of a.evidence.cite ?? [])
        if (!confirmed.has(`${row.id} ${a.path} ${c}`))
          missing.push(`${a.path || '(row)'} ← ${c.slice(0, 40)}...`)
    if (missing.length)
      add(
        'discipline',
        'verified-without-ledger',
        row.id,
        `${row.id}: status=verified but ${missing.length} citation(s) have no reading in data/verified.json:\n` +
          missing.map((m) => `      - ${m}`).join('\n'),
      )
  }

  return found
}
