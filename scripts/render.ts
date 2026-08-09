#!/usr/bin/env node
/**
 * structure -> schematic SVG. The point: media is a derivative of data, not a licensed asset.
 * The actual drawing lives in svg.ts so the browser UI renders the identical visual.
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
