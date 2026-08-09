import { expect, test } from 'vite-plus/test'
import { load, patch } from '../scripts/dataset.ts'
import { check } from '../scripts/rules.ts'
import { renderWorkout } from '../scripts/svg.ts'

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

// The failure this one exists for is real and recent: a Faude cite that dropped
// its subtitle read as a different work from the same paper written in full.
test('one reference written two ways is caught', () => {
  const broken = patch(data, 'workouts', 'vo2max-30-30', (w) => {
    w.claim.evidence.cite = ['Billat LV (2001). Interval training. Sports Med 31(1).']
  })
  expect(rules(broken)).toContain('one-reference-one-string')
})
