/**
 * 데이터셋을 디스크에서 읽는 곳 — 파일이 어디 있는지 아는 유일한 자리.
 *
 * rules.ts와 떼어놓아 규칙이 순수하게 남게 한다. 테스트는 한 번 읽고, 메모리에서 필드
 * 하나를 바꾸고, 무엇이 깨지는지 물을 수 있다. 저장소에 쓰지 않고. 규칙 하나를 겨누는
 * 것과, 파일을 옮겨놓고 프로세스를 띄우고 출력을 grep하는 것의 차이가 이것이다.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = any

export interface Dataset {
  workouts: Row[]
  systems: Row[]
  usage: Row[]
  anchors: Row[]
  adaptations: Row[]
  /**
   * 검증 원장. 소스를 읽은 모든 행위를 손으로 적은 것. 규칙이 둘을 서로 대조하므로
   * 데이터와 함께 읽는다 — 항목은 실재하는 주장을 가리켜야 하고, 인용이 아직 남아
   * 있는지가 그 항목이 말하는 읽기 결과와 맞아야 한다.
   */
  verified: Row[]
  /** 파일명으로 키를 잡은 JSON Schema. 예: `workout.schema.json`. */
  schemas: Record<string, Row>
}

export function load(root: string): Dataset {
  const j = (p: string): Row => JSON.parse(readFileSync(resolve(root, p), 'utf8'))
  const schemaDir = resolve(root, 'data/schema')
  const schemas: Record<string, Row> = {}
  for (const f of readdirSync(schemaDir).filter((f) => f.endsWith('.schema.json')))
    schemas[f] = JSON.parse(readFileSync(resolve(schemaDir, f), 'utf8'))

  return {
    workouts: j('data/workouts.json'),
    systems: j('data/systems.json'),
    usage: j('data/usage.json'),
    anchors: j('data/anchors.json'),
    adaptations: j('data/adaptations.json'),
    verified: j('data/verified.json'),
    schemas,
  }
}

/**
 * 한 행만 손본 사본으로 바꿔 끼운 데이터셋.
 *
 * 규칙 테스트를 위해 있다. 규칙이 발동한다는 것을 보이는 방법은 실제 데이터를 정확히 한
 * 가지 방식으로 깨뜨려 정확히 한 건이 잡히는 것을 보는 것이고, 그러려면 깨뜨리는 일이
 * 싸야 하고 원본은 그대로여야 한다.
 */
export function patch(
  data: Dataset,
  list: 'workouts' | 'systems' | 'usage' | 'anchors' | 'adaptations',
  id: string,
  change: (row: Row) => Row,
): Dataset {
  const key = list === 'anchors' ? 'model' : 'id'
  const rows = data[list].map((r: Row) => {
    if (r[key] !== id) return r
    const clone = structuredClone(r)
    return change(clone) ?? clone
  })
  return { ...data, [list]: rows }
}
