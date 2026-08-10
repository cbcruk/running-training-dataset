#!/usr/bin/env node
/**
 * JSON Schema에서 TypeScript 타입을 생성한다.
 *
 * 스키마가 이미 진실의 원천이다 — `validate.ts`가 강제하고, 그것을 어긴 것은 나가지
 * 않는다. 옆에 인터페이스를 손으로 쓰면 조용히 갈라지는 두 번째 원천이 생기는데, 그건
 * 인용 정책이 막으려는 것과 같은 실패다(docs/TODO.md §1a). 그래서 타입은 유도되고,
 * 커밋되고, `vp run types`로 다시 만들어진다.
 *
 * 출력을 커밋하는 이유는 갓 클론한 저장소가 이걸 먼저 돌리지 않고도 타입 검사를 통과하게
 * 하기 위해서이고, CI가 다시 돌려 커밋된 사본이 여전히 스키마와 맞는지를 증명한다.
 */
import { compile } from 'json-schema-to-typescript'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schemaDir = resolve(root, 'data/schema')
const outDir = resolve(root, 'app/data/types')

const banner = `// data/schema/*.json에서 scripts/types.ts가 생성한 파일 - 고치지 말 것.
// 스키마를 바꾼 뒤에는 \`vp run types\`를 실행한다.
//
// 여기서 lint를 끈 것은 의도적이다. 이 파일의 모양은 생성기의 몫이고, 경고를 손으로
// 고쳐봐야 다음 실행에 되돌아간다.
/* eslint-disable */
`

/**
 * 스키마마다 모듈 하나. 모든 스키마가 자기 \`$defs/i18n\`을 정의하므로 한 파일로 컴파일하면
 * 생성된 이름이 충돌한다. 모듈을 나누면 각자 자기 스코프를 갖는다.
 */
const ROOTS: Record<string, string> = {
  'workout.schema.json': 'Workout',
  'system.schema.json': 'System',
  'usage.schema.json': 'Usage',
  'anchor-model.schema.json': 'Anchor',
  'adaptation.schema.json': 'Adaptation',
  'verified.schema.json': 'Verified',
}

const files = readdirSync(schemaDir)
  .filter((f) => f.endsWith('.schema.json'))
  .sort()

const reexports: string[] = []
for (const f of files) {
  const schema = JSON.parse(readFileSync(resolve(schemaDir, f), 'utf8'))
  const name = ROOTS[f]
  if (!name) throw new Error(`no root type name mapped for ${f} - add it to ROOTS`)
  const ts = await compile(schema, name, {
    bannerComment: '',
    additionalProperties: false,
    style: { printWidth: 100 },
  })
  const stem = f.replace('.schema.json', '')
  writeFileSync(resolve(outDir, `${stem}.d.ts`), banner + '\n' + ts)
  reexports.push(`export type { ${name} } from "./${stem}.d.ts";`)
}

// 배럴. 뷰가 실제로 소비하는 것은 행 타입들이다.
writeFileSync(resolve(outDir, 'index.d.ts'), `${banner}\n${reexports.join('\n')}\n`)

// 저장소 자신의 포매터로 정리한다. 그래야 재생성이 멱등이다. 이게 없으면
// `vp check --fix`가 출력을 다시 포맷하고 다음 실행이 diff를 보고한다.
execFileSync('./node_modules/.bin/vp', ['fmt', 'app/data/types'], { cwd: root, stdio: 'ignore' })

console.log(`app/data/types/ <- ${files.length} schemas (${files.map((f) => ROOTS[f]).join(', ')})`)
