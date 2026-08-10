#!/usr/bin/env node
/**
 * 규칙 묶음 위의 CLI. 데이터를 읽고, 모든 규칙을 돌리고, 찍고, exit code를 세운다.
 *
 * 규칙 자체는 rules.ts에 살고 프로세스도 파일시스템도 모른다. 그래서 "이 규칙이 이
 * 파손에 발동하는가"를 여기를 거치지 않고 테스트할 수 있다. 이 파일에 남은 것은 정말로
 * 명령줄에 속하는 부분이다: 저장소 루트가 어디인지, 발견 하나가 사람에게 어떻게 읽히는지,
 * 그리고 초록불 뒤에 사람이 보고 싶어 하는 요약.
 */
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

/**
 * 네이밍 조인을 드러낸다. 통칭 하나가 서로 다른 워크아웃 둘에 닿는 것이 이 데이터셋의
 * 헤드라인 발견이므로, 실행할 때마다 소리 내어 말한다.
 */
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
