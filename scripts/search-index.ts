#!/usr/bin/env node
/**
 * 검색 색인 -> public/search-index.json.
 *
 * 검색은 브라우저에서 돈다(app/client/search.tsx). 코퍼스 전체를 번들에 싣는 대신 검색이
 * 실제로 읽는 필드만 이 파일로 나가고, 첫 키 입력에서 한 번 받아 서비스 워커가 캐시한다.
 *
 * `public/`에 쓰는 이유는 개발 서버와 정적 출력이 같은 URL을 주기 때문이다 — Vite가 그
 * 디렉터리를 개발 중에는 서빙하고 빌드에서는 그대로 복사한다. 생성물이므로 커밋하지
 * 않는다(.gitignore). `dev`와 `build`가 각자 앞에서 이 스크립트를 부른다.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { searchIndex } from '../app/data/index.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'public/search-index.json')

const index = searchIndex()
await mkdir(dirname(out), { recursive: true })
await writeFile(out, JSON.stringify(index))

console.log(
  `public/search-index.json <- 엔트리 ${index.entries.length}개 · 통칭 ${index.usage.length}개`,
)
