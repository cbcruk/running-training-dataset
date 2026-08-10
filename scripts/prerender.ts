#!/usr/bin/env node
/**
 * 정적 내보내기. 사전 엔트리마다 진짜 HTML 파일 하나.
 *
 * ADR 0001의 발견 절반이다. 해시 라우팅은 크롤러도 링크 프리뷰도 볼 수 있는 URL을 주지
 * 못했다. 이제 모든 엔트리가 디스크의 문서로 존재하므로 GitHub Pages가 재작성 규칙 없이
 * 서빙한다.
 *
 * 마크업은 개발 서버가 응답하는 바로 그 라우터에서 나온다 — `router.fetch()`를 라우트마다
 * 한 번씩 부르고 본문을 파일로 쓴다. 프리렌더된 페이지와 서버가 준 페이지가 갈라질 수 없는
 * 이유는 둘이 같은 응답이기 때문이다.
 *
 * `vp run pages`가 아니라 `pnpm run pages`로 부른다. pnpm은 스크립트 이름을 부분
 * 문자열로 매칭하므로 `prerender`라는 이름은 `render`(SVG를 쓰는 쪽)에도 걸린다.
 */
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { assetServer } from '../app/assets.ts'
import { allPaths } from '../app/data/index.ts'
import { router } from '../app/router.ts'
import { routes } from '../app/routes.ts'
import { BASE } from '../app/ui/href.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')

/** 라우터는 URL을 요구한다. 오리진은 무엇이든 상관없다 — 아무것도 나가지 않는다. */
const ORIGIN = 'http://prerender.localhost'

/**
 * 브라우저가 실제로 들어가는 지점. `entry.ts`는 문서가 직접 부르고, 나머지 둘은 클라이언트
 * 엔트리라 런타임이 동적으로 임포트하므로 정적 그래프에 없다 — 그래서 이름으로 적는다.
 */
const BROWSER_ENTRIES = ['app/assets/entry.ts', 'app/assets/search.tsx', 'app/assets/recent.tsx']

async function fetchOk(path: string): Promise<{ body: Buffer; status: number }> {
  const response = await router.fetch(new Request(ORIGIN + path))
  const body = Buffer.from(await response.arrayBuffer())
  return { body, status: response.status }
}

async function write(relative: string, body: Buffer | string) {
  const out = resolve(dist, relative.replace(/^\//, ''))
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, body)
}

await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })

// public/은 그대로 나간다. style.css와 sw.js는 개발 서버에서도 여기서 서빙된다.
await cp(resolve(root, 'public'), dist, { recursive: true })

const paths = allPaths()
for (const path of paths) {
  const { body, status } = await fetchOk(path)
  if (status !== 200) throw new Error(`${path} -> ${status}: 라우터가 문서를 주지 않았다`)
  await write(path === '/' ? 'index.html' : `${path}/index.html`, body)
}

/**
 * GitHub Pages는 파일이 없는 경로에 404.html을 준다. 셸을 가리켜 두면 오타가 났거나 새로
 * 추가된 URL도 사전의 첫 화면으로 떨어진다.
 */
await write('404.html', (await fetchOk('/')).body)

// 검색이 읽는 것. 정적 호스팅에서도 개발 서버와 같은 URL에 있다.
const index = await fetchOk(routes.searchIndex.href())
if (index.status !== 200) throw new Error('search-index.json을 만들지 못했다')
await write(routes.searchIndex.href(), index.body)

/**
 * 브라우저 모듈과 그것이 끌고 오는 것 전부. `getPreloads`가 임포트 그래프를 따라가므로
 * 문서가 직접 부르지 않는 모듈도 빠지지 않는다.
 *
 * 이 URL들만은 배포 base를 달고 나온다(app/ui/href.ts의 `ASSET_BASE`). dist/는 사이트
 * 루트이므로 파일로 쓸 때 그 접두사를 떼어낸다.
 */
const assets = await assetServer.getPreloads(BROWSER_ENTRIES)
for (const href of assets) {
  const { body, status } = await fetchOk(href)
  if (status !== 200) throw new Error(`${href} -> ${status}: 에셋을 컴파일하지 못했다`)
  // 디스크 경로는 디코드해서 쓴다. `node_modules/.pnpm/remix@3.0.0-beta.5_...` 같은 이름이
  // URL에서는 퍼센트 인코딩되어 오는데, 정적 호스트는 요청 경로를 디코드해서 파일을 찾는다.
  await write(decodeURIComponent(href.slice(BASE.length - 1)), body)
}

await assetServer.close()

console.log(
  `dist/ <- ${paths.length}개 라우트 + 404.html + search-index.json + 에셋 ${assets.length}개`,
)
