#!/usr/bin/env node
// The CLI over the ruleset: read the data, run every rule, print, set an exit code.
//
// The rules themselves live in rules.ts and know nothing about processes or the
// filesystem, so a test can ask "does this rule fire on this break" without going
// through here. What is left in this file is the part that genuinely belongs to a
// command line: where the repo root is, how a finding reads to a person, and the
// summary a human wants after a green run.
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from './dataset.ts'
import { check } from './rules.ts'
import { assertions } from './evidence.ts'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = any

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const data = load(root)
const findings = check(data)

const { workouts, systems, usage, anchors, adaptations } = data
console.log(
  `workouts: ${workouts.length}  systems: ${systems.length}  usage: ${usage.length}  anchors: ${anchors.length}  adaptations: ${adaptations.length}`,
)

const tiers: Record<string, number> = {}
for (const row of [...workouts, ...systems])
  for (const a of assertions(row)) tiers[a.evidence.tier] = (tiers[a.evidence.tier] ?? 0) + 1
console.log(`evidence tiers:`, tiers)

// The naming join, surfaced: one colloquial name reaching two different workouts
// is the dataset's headline finding, so a run says so out loud.
const collisions: Record<string, Set<string>> = {}
for (const u of usage) (collisions[u.calls_it] ??= new Set()).add(u.workout)
for (const [name, set] of Object.entries(collisions).filter(([, v]) => v.size > 1))
  console.log(`collision: "${name}" -> ${[...set].join(', ')}`)

if (findings.length) {
  console.error(`\n${findings.length} error(s):`)
  for (const f of findings as Row[]) console.error(`  [${f.layer}] ${f.message}`)
  process.exit(1)
}
console.log('\nOK')
