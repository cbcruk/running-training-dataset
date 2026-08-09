/**
 * The route tree, shared by the browser entry and the prerenderer.
 *
 * One definition, two histories: the browser gets `createBrowserHistory`, the
 * prerenderer a `createMemoryHistory` per route. That keeps ADR 0001's
 * load-bearing property - both hosts render the same thing from the same source -
 * now expressed as routes rather than a hand-rolled switch.
 *
 * Code-based routes, not file-based: the route set is derived from the data (44
 * entries) and is small enough to read in one screen. A generated route tree would
 * add a build step for no benefit.
 */
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
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
import { currentLang, setLang, viewContext } from './data.tsx'
import type { Lang, ViewContext } from './types/view.ts'

export interface RouterContext {
  ctx: ViewContext
}

/** `?q=` rides on the two list routes; everything else ignores search. */
interface SearchParams {
  q?: string
}
const validateSearch = (raw: Record<string, unknown>): SearchParams => {
  const q = typeof raw.q === 'string' ? raw.q : undefined
  return q ? { q } : {}
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
  notFoundComponent: () => <NotFound ctx={viewContext()} id="" />,
})

// A list route shows its list, or search results when `?q=` is present - the same
// rule the hand-rolled router had, now attached to the route that owns it.
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
    return ctx.bySystem[id] ? <SystemDetail ctx={ctx} id={id} /> : <NotFound ctx={ctx} id={id} />
  },
})

const workoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workout/$id',
  component: function WorkoutView() {
    const { id } = workoutRoute.useParams()
    const ctx = viewContext()
    return ctx.byWorkout[id] ? <WorkoutDetail ctx={ctx} id={id} /> : <NotFound ctx={ctx} id={id} />
  },
})

const anchorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/anchor/$model',
  component: function AnchorView() {
    const { model } = anchorRoute.useParams()
    const ctx = viewContext()
    return ctx.byAnchor[model] ? (
      <AnchorDetail ctx={ctx} model={model} />
    ) : (
      <NotFound ctx={ctx} id={model} />
    )
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
 * Build a router for one host.
 *
 * `basepath` is the GitHub Pages project path; the prerenderer passes `path` to
 * get a memory history pinned to a single route.
 */
export function makeRouter(basepath: string, path?: string) {
  return createRouter({
    routeTree,
    basepath,
    context: { ctx: viewContext() },
    defaultNotFoundComponent: () => <NotFound ctx={viewContext()} id="" />,
    // The memory entry must carry the basepath: the router strips it before
    // matching, so a bare "/anchor/rpe_10" matches nothing and renders empty.
    ...(path
      ? {
          history: createMemoryHistory({
            initialEntries: [basepath.replace(/\/$/, '') + path],
          }),
        }
      : {}),
  })
}

/**
 * Language is React state now rather than a module-level toggle plus a manual
 * re-render. `setLang` still writes the module state the prerenderer reads, so
 * both hosts stay in agreement.
 */
export function useLang(): [Lang, (next: Lang) => void] {
  const [lang, set] = useState<Lang>(() => currentLang())
  useEffect(() => {
    setLang(lang)
    document.documentElement.lang = lang
  }, [lang])
  return useMemo(
    () => [
      lang,
      (next: Lang) => {
        setLang(next)
        localStorage.setItem('lang', next)
        set(next)
      },
    ],
    [lang],
  )
}
