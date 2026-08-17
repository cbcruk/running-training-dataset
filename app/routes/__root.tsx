/**
 * 문서 셸. 예전 index.html이 하던 일 전부다.
 *
 * 프리렌더된 문서 하나하나가 자기 <title>·description·canonical·OG 태그를 들고 있어야
 * 한다 — 해시 라우팅이 결코 서빙할 수 없던 사전의 절반이고(ADR 0001), 링크 프리뷰와
 * 크롤러가 읽는 것은 이것뿐이다. 여기 있는 것은 모든 문서가 공유하는 것뿐이고, 엔트리별
 * 값은 각 라우트의 `head`가 얹는다 — `<HeadContent />`가 그 둘을 합쳐 <head>에 쓴다.
 */
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useMatches,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'

import { RecentStrip } from '../client/recent.tsx'
import { SearchPanel } from '../client/search.tsx'
import { HOME_META, PLACEHOLDER, type EntryLabel, type View } from '../data/index.ts'
import { NotFound } from '../ui/lists.tsx'

/**
 * 어떤 라우트가 어느 내비 탭에 속하는지. 예전에는 `<Document view="...">` prop이었다.
 * 라우트가 자기 것을 들고 있는 편이 낫다 — 라우트를 더하면서 셸을 고칠 일이 없다.
 */
declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    view?: View
  }
}

/** 엔트리 라우트의 로더가 돌려주는 것 중 셸이 읽는 부분. */
interface EntryLoaderData {
  entry?: EntryLabel
}

const NAV: { view: View; label: string; to: '/' | '/workouts' | '/anchors' }[] = [
  { view: 'systems', label: '훈련법', to: '/' },
  { view: 'workouts', label: '워크아웃', to: '/workouts' },
  { view: 'anchors', label: '앵커', to: '/anchors' },
]

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'UTF-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { property: 'og:type', content: 'article' },
      { name: 'twitter:card', content: 'summary' },
      /**
       * 사이트 기본값. 라우트가 자기 것으로 덮어쓴다.
       *
       * ADR 0011 전에는 이 넷이 없어도 됐다 — 프리렌더된 문서마다 자기 것을 들고 있었으니까.
       * 지금은 디스크의 문서가 셸 하나뿐이고 그 셸이 모든 URL에 서빙되므로, 여기 없으면
       * JavaScript가 돌기 전의 문서에 제목이 아예 없다. 엔트리별 값은 하이드레이션 뒤에야
       * 붙고, 크롤러와 링크 프리뷰가 그때까지 기다려주지 않는다는 것이 이 이동의 대가다.
       */
      { title: HOME_META.title },
      { name: 'description', content: HOME_META.description },
      { property: 'og:title', content: HOME_META.title },
      { property: 'og:description', content: HOME_META.description },
    ],
    links: [
      { rel: 'icon', href: 'data:,' },
      { rel: 'stylesheet', href: `${import.meta.env.BASE_URL}style.css` },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: UnknownUrl,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  const matches = useMatches()
  const leaf = matches[matches.length - 1]
  const view = leaf?.staticData.view
  const entry = (leaf?.loaderData as EntryLoaderData | undefined)?.entry

  /**
   * 활성 탭은 마운트 뒤에 붙는다.
   *
   * 셸은 `/404`에서 한 번 렌더돼 모든 URL에 서빙되므로(ADR 0011) 그 마크업에는 어떤 탭도
   * 활성이 아니다. 그리고 React는 하이드레이션에서 이런 속성 불일치를 조용히 넘기고 서버가
   * 준 것을 유지한다 — 그래서 `/anchor/rpe_10`으로 직접 들어오면 앵커 탭이 끝까지 죽어
   * 있었다. 클라이언트 내비게이션으로 들어올 때만 살아 있어서 눈에 늦게 띄었다.
   *
   * 마운트 뒤에 켜면 서버가 준 것과 첫 클라이언트 렌더가 같아지고(둘 다 비활성), 이어지는
   * 렌더가 표시를 붙인다. ADR 0011이 "셸에 라우트 내용이 들어가면 안 된다"고 적은 규칙은
   * **URL에 의존하는 속성에도** 그대로 적용된다 — 그것이 이 커밋이 배운 것이다.
   */
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const activeView = mounted ? view : undefined

  return (
    <>
      <header className="topbar">
        {/*
          `activeProps={{}}`로 라우터의 기본 활성 표시를 끈다. 이유가 둘이다. 라우터는 정확히
          일치하는 경로만 활성으로 보므로 `/anchor/rpe_10`에서 앵커 탭을 켜지 못하고 — 그것이
          `view`가 존재하는 이유다 — 켜는 경우에는 `class="active active"`처럼 겹쳤다.
        */}
        <Link className="brand" to="/" activeProps={{}}>
          <span className="brand-mark">▮▮▮</span>
          <span className="brand-name">Running Training Dataset</span>
        </Link>
        <nav className="nav">
          {NAV.map((n) => (
            <Link
              key={n.view}
              to={n.to}
              data-nav={n.view}
              activeProps={{}}
              className={n.view === activeView ? 'active' : undefined}
              aria-current={n.view === activeView ? 'page' : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <SearchPanel placeholder={PLACEHOLDER} />

      <main id="app">
        {/* 띠를 그리는 것은 홈뿐이다. 다른 페이지는 방문만 기록한다. */}
        <RecentStrip entry={entry} showList={leaf?.routeId === '/'} />
        <Outlet />
      </main>

      <footer className="foot">
        <p>
          모든 행은 <code>status: draft</code>다. 어떤 인용도 사람이 확인하지 않았다. 데이터는
          가설이고, 이 UI는 조회 도구다 — 결코 지침이 아니다.
        </p>
        <p className="foot-meta">
          <a href="https://github.com/cbcruk/running-training-dataset">source</a> · MIT · 도식 차트,
          두 축 모두 명목값
        </p>
      </footer>
    </>
  )
}

/**
 * 어떤 라우트에도 걸리지 않은 URL. 상태 코드는 404지만 본문은 여전히 사전의 셸이라, 링크를
 * 잘못 따라온 사람이 빈 페이지가 아니라 돌아갈 길을 본다.
 */
function UnknownUrl() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return <NotFound id={pathname} />
}
