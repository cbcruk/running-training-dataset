/**
 * 라우트 트리. 브라우저 진입점과 프리렌더러가 공유한다.
 *
 * 정의 하나, 히스토리 둘. 브라우저는 `createBrowserHistory`를, 프리렌더러는 라우트마다
 * `createMemoryHistory`를 받는다. 그것이 ADR 0001의 하중 부재를 유지한다 — 두 호스트가
 * 같은 원천에서 같은 것을 렌더한다는 성질을, 이제 손으로 만든 스위치가 아니라 라우트로
 * 표현한다.
 *
 * 파일 기반이 아니라 코드 기반 라우트다. 라우트 집합은 데이터에서 유도되고 한 화면에 들어올
 * 만큼 작다. 생성된 라우트 트리는 아무 이득 없이 빌드 단계만 늘린다.
 */
import type { ReactNode } from 'react'

import {
  Outlet,
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import {
  AnchorList,
  NotFound,
  SearchResults,
  SystemList,
  WorkoutList,
} from './components/Lists.tsx'
import { AnchorDetail } from './components/AnchorDetail.tsx'
import { SystemDetail } from './components/SystemDetail.tsx'
import { WorkoutDetail } from './components/WorkoutDetail.tsx'
import { viewContext } from './data.tsx'
import type { ViewContext } from './types/view.ts'

export interface RouterContext {
  ctx: ViewContext
}

/** `?q=`는 두 목록 라우트에만 얹힌다. 나머지는 검색을 무시한다. */
interface SearchParams {
  q?: string
}
const validateSearch = (raw: Record<string, unknown>): SearchParams => {
  const q = typeof raw.q === 'string' ? raw.q : undefined
  return q ? { q } : {}
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
  notFoundComponent: () => <NotFound id="" />,
})

/**
 * 목록 라우트는 자기 목록을 보여주고, `?q=`가 있으면 검색 결과를 보여준다 — 손으로 만든
 * 라우터가 갖고 있던 것과 같은 규칙인데, 이제 그것을 소유한 라우트에 붙어 있다.
 */
function listRoute(path: string, List: (p: { ctx: ViewContext }) => ReactNode) {
  const route = createRoute({
    getParentRoute: () => rootRoute,
    path,
    validateSearch,
    component: () => {
      const { q } = route.useSearch() as SearchParams
      const ctx = viewContext()
      return q ? <SearchResults ctx={ctx} rawQ={q} /> : <List ctx={ctx} />
    },
  })
  return route
}

const indexRoute = listRoute('/', SystemList)
const workoutsRoute = listRoute('/workouts', WorkoutList)
const anchorsRoute = listRoute('/anchors', AnchorList)

const systemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/system/$id',
  component: function SystemView() {
    const { id } = systemRoute.useParams()
    const ctx = viewContext()
    return ctx.bySystem[id] ? <SystemDetail ctx={ctx} id={id} /> : <NotFound id={id} />
  },
})

const workoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workout/$id',
  component: function WorkoutView() {
    const { id } = workoutRoute.useParams()
    const ctx = viewContext()
    return ctx.byWorkout[id] ? <WorkoutDetail ctx={ctx} id={id} /> : <NotFound id={id} />
  },
})

const anchorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/anchor/$model',
  component: function AnchorView() {
    const { model } = anchorRoute.useParams()
    const ctx = viewContext()
    return ctx.byAnchor[model] ? <AnchorDetail ctx={ctx} model={model} /> : <NotFound id={model} />
  },
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  workoutsRoute,
  anchorsRoute,
  systemRoute,
  workoutRoute,
  anchorRoute,
])

/**
 * 호스트 하나를 위한 라우터를 만든다.
 *
 * `basepath`는 GitHub Pages의 프로젝트 경로다. 프리렌더러는 `path`를 넘겨 라우트 하나에
 * 고정된 메모리 히스토리를 얻는다.
 */
export function makeRouter(basepath: string, path?: string) {
  return createRouter({
    routeTree,
    basepath,
    context: { ctx: viewContext() },
    defaultNotFoundComponent: () => <NotFound id="" />,
    // 메모리 진입 경로에 basepath가 실려 있어야 한다. 라우터가 매칭 전에 그것을 벗겨내므로,
    // 맨 "/anchor/rpe_10"은 아무것도 매칭하지 못하고 빈 화면을 렌더한다.
    ...(path
      ? {
          history: createMemoryHistory({
            initialEntries: [basepath.replace(/\/$/, '') + path],
          }),
        }
      : {}),
  })
}
