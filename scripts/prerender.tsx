#!/usr/bin/env node
/**
 * 사전 엔트리마다 진짜 HTML 파일 하나씩을 빌드된 dist/에 쓴다.
 *
 * ADR 0001의 발견 쪽 절반이다. 해시 라우팅에서는 크롤러나 링크 프리뷰가 볼 수 있는 URL이
 * 카탈로그에 없었다. 이제 모든 엔트리가 디스크의 문서로 존재하므로 GitHub Pages가 재작성
 * 규칙 없이 서빙하고, 클라이언트 번들이 로드되면서 즉시 내비게이션으로 업그레이드한다.
 *
 * 마크업은 브라우저가 렌더하는 것과 같은 뷰에서 나온다. 그래서 프리렌더된 페이지와
 * 클라이언트가 렌더한 페이지가 갈라질 수 없다.
 *
 * src/data.tsx와 src/router.tsx를 직접 임포트한다. 예전에는 불가능했다 — Node가 JSX를
 * 파싱하지 못하므로 ADR 0002는 컴포넌트 모델의 대가로 중간 SSR 빌드를 두었고 이 파일은
 * 그것을 임포트했다. ADR 0003이 스크립트를 nub 아래로 옮겨 즉석에서 트랜스파일하게
 * 만들면서 그 추가 빌드 단계가 사라졌다.
 *
 * `prerender`가 아니라 `vp run pages`로 실행할 것. pnpm은 스크립트 이름을 부분 문자열로
 * 매칭하므로, `prerender`라는 이름의 스크립트는 `vp run render`(SVG를 쓰는 쪽)에서도
 * 함께 발동해 dist/가 생기기 전에 이것을 돌리게 된다.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { RouterProvider } from '@tanstack/react-router'
import { allRoutes, currentView, metaFor, setBase } from '../src/data.tsx'
import { makeRouter } from '../src/router.tsx'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const BASE = process.env.BASE_PATH || '/running-training-dataset/'

setBase(BASE)

/**
 * 빌드된 셸. Vite가 해시된 자산 태그를 이미 주입해 두었다. 그대로 재사용해서 프리렌더된
 * 페이지가 정확히 같은 번들을 로드하게 한다.
 */
const shellPath = resolve(dist, 'index.html')
let shell: string
try {
  shell = readFileSync(shellPath, 'utf8')
} catch {
  console.error('dist/index.html not found - run `vp build` before prerendering.')
  process.exit(1)
}

/**
 * Vite가 상대 base로 설정되어 있어 자산 URL이 "./assets/…"로 나온다. /anchor/rpe_10/에
 * 있는 페이지는 그것을 사이트 루트 기준으로 풀어야 한다.
 */
function absolutizeAssets(html: string): string {
  return html.replace(
    /(src|href)="\.\/([^"]*)"/g,
    (_: string, attr: string, path: string) => `${attr}="${BASE}${path}"`,
  )
}

const esc = (s: string) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )

const SITE_URL = process.env.SITE_URL || 'https://cbcruk.github.io/running-training-dataset'

async function pageFor(path: string): Promise<string> {
  const { title, description } = metaFor(path)
  const canonical = SITE_URL.replace(/\/$/, '') + (path === '/' ? '/' : path)
  const router = makeRouter(BASE, path)
  await router.load()
  const body = renderToStaticMarkup(<RouterProvider router={router} />)
  const view = currentView(path)

  let html = absolutizeAssets(shell)

  // 엔트리별 메타데이터. 해시 라우팅이 결코 서빙할 수 없던 부분.
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  html = html.replace(
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${esc(description)}" />`,
  )
  html = html.replace(
    '</head>',
    `  <link rel="canonical" href="${esc(canonical)}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta name="twitter:card" content="summary" />
  </head>`,
  )

  // 엔트리 본문. 그래야 JavaScript 없이도 문서가 읽힌다.
  html = html.replace('<main id="app"></main>', `<main id="app">${body}</main>`)

  // 활성 내비 탭을 하이드레이션 후가 아니라 서빙되는 HTML에서도 표시한다.
  html = html.replace(new RegExp(`(<a[^>]*data-nav="${view}")`), '$1 class="active"')

  return html
}

mkdirSync(dist, { recursive: true })
const routes = allRoutes()
for (const path of routes) {
  const out = path === '/' ? resolve(dist, 'index.html') : resolve(dist, `.${path}/index.html`)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, await pageFor(path))
}

// GitHub Pages는 파일이 없는 경로에 404.html을 서빙한다. 그것을 셸로 향하게 해서 오타나
// 새로 추가된 URL도 클라이언트 라우터를 띄우게 한다.
writeFileSync(resolve(dist, '404.html'), await pageFor('/'))

console.log(`prerendered ${routes.length} routes + 404.html into dist/ (base ${BASE})`)
