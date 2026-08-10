import { test as nodeTest } from 'node:test'
import { expect } from 'remix/assert'
import { brokenRefs } from '../scripts/comment-refs.ts'
import { load, patch } from '../scripts/dataset.ts'
import { check } from '../scripts/rules.ts'
import { renderWorkout } from '../scripts/svg.tsx'

// node:test의 `test()`는 프로미스를 돌려주고 러너가 그것을 기다린다. 호출부에서 매번
// 버려주는 대신 한 번만 감싼다.
const test = (name: string, fn: () => void | Promise<void>) => void nodeTest(name, fn)

const data = load(process.cwd())
const byId = Object.fromEntries(data.workouts.map((w) => [w.id, w]))

// Naming the rule rather than matching on the message: the message is written for
// a person reading a failed build and should be free to change; the id is what a
// test and the README's list of violations both point at.
const rules = (d: typeof data): string[] => check(d).map((f) => f.rule)

test('the dataset passes every rule', () => {
  expect(check(data)).toEqual([])
})

test('every workout renders to a schematic svg', async () => {
  for (const w of data.workouts) expect(await renderWorkout(w, byId)).toContain('<svg')
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
