#!/usr/bin/env node
/**
 * structure -> 도식 SVG. 요점은 미디어가 라이선스한 자산이 아니라 데이터의 파생물이라는
 * 것이다. 실제로 그리는 일은 svg.ts에 있고, 그래서 브라우저 UI가 동일한 시각물을 렌더한다.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderWorkout } from './svg.ts'
import type { Workout } from '../src/types/index.d.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workouts = JSON.parse(readFileSync(resolve(root, 'data/workouts.json'), 'utf8')) as Workout[]
const byId = Object.fromEntries(workouts.map((w) => [w.id, w]))

mkdirSync(resolve(root, 'out'), { recursive: true })
for (const w of workouts) {
  writeFileSync(resolve(root, `out/${w.id}.svg`), renderWorkout(w, byId))
  console.log(`out/${w.id}.svg`)
}
