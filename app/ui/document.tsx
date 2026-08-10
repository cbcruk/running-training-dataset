/** @jsxImportSource remix/ui */
/**
 * 문서 셸. 예전 index.html이 하던 일 전부다.
 *
 * 프리렌더된 문서 하나하나가 자기 <title>·description·canonical·OG 태그를 들고 있어야
 * 한다 — 해시 라우팅이 결코 서빙할 수 없던 사전의 절반이고(ADR 0001), 링크 프리뷰와
 * 크롤러가 읽는 것은 이것뿐이다. 예전에는 프리렌더러가 빌드된 셸 HTML을 문자열 치환으로
 * 고쳤다. 이제는 그냥 props다.
 */
import type { Handle, RemixNode } from 'remix/ui'
import { PLACEHOLDER, type PageMeta, type View } from '../data/index.ts'
import { RecentStrip } from '../assets/recent.tsx'
import { SearchPanel } from '../assets/search.tsx'
import { routes } from '../routes.ts'
import { asset, url } from './href.ts'

/**
 * 절대 URL이 필요한 태그(canonical, og:url)를 위한 원점. 경로 부분은 붙이지 않는다 —
 * 그건 배포 base의 몫이고 app/ui/href.ts가 붙인다.
 */
const SITE_ORIGIN = (process.env.SITE_ORIGIN ?? 'https://cbcruk.github.io').replace(/\/$/, '')

export interface DocumentProps {
  meta: PageMeta
  /** 지금 문서의 사이트 루트 기준 경로. canonical과 최근 본 항목 기록에 쓴다. */
  path: string
  view: View
  /** 최근 본 항목 띠에 넣을 지금 페이지의 이름. 엔트리가 아닌 페이지에는 없다. */
  entry?: { kind: string; label: string }
  children?: RemixNode
}

const NAV: { view: View; label: string; href: string }[] = [
  { view: 'systems', label: '훈련법', href: routes.home.href() },
  { view: 'workouts', label: '워크아웃', href: routes.workouts.href() },
  { view: 'anchors', label: '앵커', href: routes.anchors.href() },
]

export function Document(handle: Handle<DocumentProps>) {
  return () => {
    const { meta, path, view, entry, children } = handle.props
    const canonical = SITE_ORIGIN + url(path === '/' ? '' : path)

    return (
      <html lang="ko">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>{meta.title}</title>
          <meta name="description" content={meta.description} />
          <link rel="canonical" href={canonical} />
          <meta property="og:type" content="article" />
          <meta property="og:title" content={meta.title} />
          <meta property="og:description" content={meta.description} />
          <meta property="og:url" content={canonical} />
          <meta name="twitter:card" content="summary" />
          <link rel="icon" href="data:," />
          <link rel="stylesheet" href={url('style.css')} />
        </head>
        <body>
          <header className="topbar">
            <a className="brand" href={url(routes.home.href())}>
              <span className="brand-mark">▮▮▮</span>
              <span className="brand-name">Running Training Dataset</span>
            </a>
            <nav className="nav">
              {NAV.map((n) => (
                <a
                  key={n.view}
                  href={url(n.href)}
                  data-nav={n.view}
                  className={n.view === view ? 'active' : undefined}
                >
                  {n.label}
                </a>
              ))}
            </nav>
          </header>

          <SearchPanel placeholder={PLACEHOLDER} />

          <main id="app">
            <RecentStrip path={path} entry={entry} showList={path === '/'} />
            {children}
          </main>

          <footer className="foot">
            <p>
              모든 행은 <code>status: draft</code>다. 어떤 인용도 사람이 확인하지 않았다. 데이터는
              가설이고, 이 UI는 조회 도구다 — 결코 지침이 아니다.
            </p>
            <p className="foot-meta">
              <a href="https://github.com/cbcruk/running-training-dataset">source</a> · MIT · 도식
              차트, 두 축 모두 명목값
            </p>
          </footer>

          <script type="module" src={asset('app/assets/entry.ts')} />
        </body>
      </html>
    )
  }
}
