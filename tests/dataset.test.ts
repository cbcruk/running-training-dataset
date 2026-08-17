import assert from 'node:assert/strict'
import { test as nodeTest } from 'node:test'
import { brokenRefs } from '../scripts/comment-refs.ts'
import { load, patch } from '../scripts/dataset.ts'
import { nameCollisions, searchIndex } from '../app/data/index.ts'
import { check } from '../scripts/rules.ts'
import { renderWorkout } from '../scripts/svg.tsx'

// node:test의 `test()`는 프로미스를 돌려주고 러너가 그것을 기다린다. 호출부에서 매번
// 버려주는 대신 한 번만 감싼다.
const test = (name: string, fn: () => void | Promise<void>) => void nodeTest(name, fn)

/**
 * `remix/assert`가 나가면서(ADR 0010) 이 파일이 쓰던 네 가지 단언만 node:assert 위에 다시
 * 얹는다. 어설션 라이브러리를 새로 들이지 않는 이유는, 검사할 것이 규칙 id 목록과 문자열
 * 하나뿐이라 그 이상이 필요한 적이 없었기 때문이다.
 */
const includes = (actual: unknown, expected: unknown): boolean =>
  typeof actual === 'string'
    ? actual.includes(String(expected))
    : Array.isArray(actual) && actual.includes(expected)

function expect<T>(actual: T) {
  return {
    toEqual: (expected: unknown) => assert.deepStrictEqual(actual, expected),
    toBe: (expected: unknown) => assert.strictEqual(actual, expected),
    toContain: (expected: unknown) =>
      assert.ok(
        includes(actual, expected),
        `${JSON.stringify(actual)}에 ${String(expected)}가 없다`,
      ),
    not: {
      toContain: (expected: unknown) =>
        assert.ok(
          !includes(actual, expected),
          `${JSON.stringify(actual)}에 ${String(expected)}가 있다`,
        ),
    },
  }
}

const data = load(process.cwd())
const byId = Object.fromEntries(data.workouts.map((w) => [w.id, w]))

// Naming the rule rather than matching on the message: the message is written for
// a person reading a failed build and should be free to change; the id is what a
// test and the README's list of violations both point at.
const rules = (d: typeof data): string[] => check(d).map((f) => f.rule)

test('the dataset passes every rule', () => {
  expect(check(data)).toEqual([])
})

test('every workout renders to a schematic svg', () => {
  for (const w of data.workouts) expect(renderWorkout(w, byId)).toContain('<svg')
})

// Sixteen comments named files that had been renamed out from under them, and
// nothing noticed for two ADRs. Deliberate exceptions live in comment-refs.ts's
// ALLOWED, so "gone on purpose" has to be written down rather than assumed.
test('no comment names a file that is not there', () => {
  expect(brokenRefs(process.cwd())).toEqual([])
})

// Each rule below was argued into existence, so each gets the break it was written
// to catch. A rule nothing exercises is a rule that can silently stop working -
// which is how the seed data shipped with the confound inconsistency that the
// severity rule was later written to find.

test("a workout id may not borrow a coach or a coach's word for it", () => {
  // The two the denylist let through: an eponym, and one system's coinage adopted
  // as the neutral id while usage.json recorded that the other systems disagreed.
  for (const [id, token] of [
    ['mona-fartlek', 'mona'],
    ['cruise-intervals', 'cruise'],
    ['daniels-intervals', 'daniels'],
  ] as const) {
    const broken = patch(data, 'workouts', 'descending-intervals', (w) => {
      w.id = id
    })
    expect(rules(broken)).toContain('id-outside-vocabulary')
    expect(check(broken).some((f) => f.message.includes(token))).toBe(true)
  }
})

// `tradition` covered both "nobody has looked" and "there is nothing fixed to look
// at". The second is not a gap further study closes, and only `fartlek` is in it.
test('a stochastic workout may not claim its dose is an open question', () => {
  const broken = patch(data, 'workouts', 'fartlek', (w) => {
    w.claim.evidence.dose_question = 'open'
  })
  expect(rules(broken)).toContain('stochastic-dose-question')
})

test('a fixed workout may not claim its dose is unaskable', () => {
  // `strides`, not `easy-run`: the rule reads dose_question only where the tier is
  // `tradition`, and above that the schema rejects the field outright.
  const broken = patch(data, 'workouts', 'strides', (w) => {
    w.claim.evidence.dose_question = 'unaskable'
  })
  expect(rules(broken)).toContain('unaskable-without-stochastic')
})

test('a tier above tradition has no dose question to answer', () => {
  const broken = patch(data, 'workouts', 'easy-run', (w) => {
    w.claim.evidence = {
      tier: 'plausible',
      cite: ['Someone X (1999). A paper. J Test 1(1).'],
      dose_question: 'open',
    }
  })
  expect(rules(broken)).toContain('schema')
})

test('a test may not lean on the reference its own claim already cites', () => {
  const broken = patch(data, 'workouts', 'easy-run', (w) => {
    w.test.evidence = { tier: 'plausible', cite: [...w.claim.evidence.cite] }
  })
  expect(rules(broken)).toContain('test-cite-duplicates-claim')
})

test('a test may not reach the top tier', () => {
  const broken = patch(data, 'workouts', 'easy-run', (w) => {
    w.test.evidence = {
      tier: 'consensus',
      cite: ['Someone X (1999). A paper about measurement. J Meas 1(1).'],
    }
  })
  expect(rules(broken)).toContain('test-consensus')
})

test('the top tier requires the human read that status records', () => {
  const broken = patch(data, 'workouts', 'easy-run', (w) => {
    w.claim.evidence.tier = 'consensus'
  })
  expect(rules(broken)).toContain('consensus-requires-verified')
})

test('a workout nobody formalized cannot be waiting on a text', () => {
  const broken = patch(data, 'workouts', 'strides', (w) => {
    w.provenance = 'unrecorded'
  })
  expect(rules(broken)).toContain('folk-workout-uncitable')
})

test('one work cannot be both the description and the proof', () => {
  const broken = patch(data, 'workouts', 'threshold-continuous', (w) => {
    w.source = [w.claim.evidence.cite[0]]
    w.provenance = 'recorded'
  })
  expect(rules(broken)).toContain('source-and-cite')
})

// `주기` is one vocabulary spoken from both ends, and until this rule nothing made
// the two ends agree - the emphasised id only had to exist.
test('a phase cannot emphasise a workout placed somewhere else', () => {
  const broken = patch(data, 'workouts', 'easy-run', (w) => {
    w.placement = ['peak']
  })
  expect(rules(broken)).toContain('phase-placement-mismatch')
})

// A human read had nowhere durable to live: the worksheet's boxes are rewritten on
// every regeneration and `status: verified` was rejected outright, which left the
// top tier closed rather than empty. The ledger is that place, and it is checked
// against the data in both directions.
const CONVERTINO =
  'Convertino VA (1991). Blood volume: its adaptation to endurance training. Med Sci Sports Exerc 23(12).'
const reading = (o: Record<string, unknown> = {}) => ({
  cite: CONVERTINO,
  row: 'easy-run',
  path: 'claim',
  supports: true,
  by: '테스터',
  on: '2026-08-10',
  note: '무엇을 확인했는지',
  ...o,
})

test('a reading has to name a row that exists', () => {
  expect(rules({ ...data, verified: [reading({ row: 'nope' })] })).toContain('ledger-unknown-row')
})

test('a reading has to name an assertion that exists', () => {
  expect(rules({ ...data, verified: [reading({ path: 'nope' })] })).toContain(
    'ledger-unknown-assertion',
  )
})

// The direction that earns its keep: a rejected reference must be gone from the
// data, so a cite someone has already ruled out cannot quietly come back.
test('a rejected reading must have removed its cite', () => {
  expect(rules({ ...data, verified: [reading({ supports: false })] })).toContain(
    'ledger-contradicts-data',
  )
})

test('verified needs a reading behind every citation on the row', () => {
  const claimed = {
    ...data,
    workouts: data.workouts.map((w) => (w.id === 'easy-run' ? { ...w, status: 'verified' } : w)),
  }
  expect(rules(claimed)).toContain('verified-without-ledger')
  const readings = (
    claimed.workouts.find((w) => w.id === 'easy-run')!.claim.evidence.cite as string[]
  ).map((c) => reading({ cite: c }))
  expect(rules({ ...claimed, verified: readings })).not.toContain('verified-without-ledger')
})

// The failure this one exists for is real and recent: a Faude cite that dropped
// its subtitle read as a different work from the same paper written in full.
test('one reference written two ways is caught', () => {
  const broken = patch(data, 'workouts', 'vo2max-30-30', (w) => {
    w.claim.evidence.cite = ['Billat LV (2001). Interval training. Sports Med 31(1).']
  })
  expect(rules(broken)).toContain('one-reference-one-string')
})

// 검색의 충돌 배너는 "이 통칭이 서로 다른 워크아웃 N개를 가리킨다"는 헤드라인이고, 조건이
// "충돌 2개 이상"뿐이던 판본은 `t` 한 글자로 워크아웃 23개를 가리킨다고 주장하면서 결과를
// 접힘 아래로 밀어냈다. 조건을 데이터 계층으로 옮긴 이유가 이 두 검사다 - 상수가 코퍼스에서
// 유도됐으므로, 코퍼스가 자라면 둘 중 하나가 먼저 깨져서 알려준다.
const index = searchIndex()
const terms = [...new Set(data.usage.flatMap((u) => [u.calls_it, ...(u.also_known_as ?? [])]))]

test('every name that really collides still gets its headline', () => {
  // 부분 문자열로 워크아웃 2개 이상을 가리키는 통칭이 "진짜 충돌"이고, 배너가 존재하는 이유다.
  const suppressed = terms.filter((t) => {
    const q = t.toLowerCase()
    const reach = new Set(
      data.usage
        .filter(
          (u) =>
            u.calls_it.toLowerCase().includes(q) ||
            (u.also_known_as ?? []).some((a: string) => a.toLowerCase().includes(q)),
        )
        .map((u) => u.workout),
    )
    return reach.size > 1 && nameCollisions(index, t).length === 0
  })
  expect(suppressed).toEqual([])
})

test('one or two characters is not a name, so it gets no headline', () => {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('')
  const shorts = [...letters, ...letters.flatMap((a) => letters.map((b) => a + b))]
  expect(shorts.filter((q) => nameCollisions(index, q).length > 0)).toEqual([])
})

// README가 검색의 예로 드는 바로 그 질의. 이것이 조용해지면 문서가 거짓이 된다.
test('"tempo" splits into the two workouts the README promises', () => {
  expect(nameCollisions(index, 'tempo').length).toBe(2)
})
