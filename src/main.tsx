/**
 * 브라우저 진입점.
 *
 * 셸은 이제 innerHTML 대입이 아니라 React 루트이고, 라우팅은 손으로 만든 History API
 * 스위치가 아니라 TanStack Router다. 여기 남은 것은 라우터가 소유하지 않는 것들이다.
 * 크롬(내비, 검색창), 키보드 우선 조회, 최근 본 항목, 그리고 서비스 워커.
 *
 * ADR 0001의 사전 형태는 그대로다. 발견을 위한 프리렌더 문서, 사용을 위한 이 번들.
 * `scripts/prerender.tsx`가 같은 라우트 트리를 구동하므로 둘이 갈라질 수 없다.
 */
import './style.css'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { makeRouter } from './router.tsx'
import { PLACEHOLDER, RECENT_LABEL, currentView, entryLabel, metaFor } from './data.tsx'

const BASE = import.meta.env.BASE_URL || '/'
const router = makeRouter(BASE)

function required<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`missing #${id} - index.html and main.tsx disagree`)
  return el as T
}

/**
 * 읽는 사람마다 다르므로 절대 프리렌더되지 않는다. 디스크의 파일은 모두에게 같게 읽혀야
 * 한다.
 */
const RECENT_KEY = 'recent'
const RECENT_MAX = 8
interface RecentItem {
  path: string
  kind: string
  label: string
}

function readRecent(): RecentItem[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(v)
      ? (v as RecentItem[]).filter((x) => x && typeof x.path === 'string')
      : []
  } catch {
    return []
  }
}

function recordVisit(path: string) {
  const entry = entryLabel(path)
  if (!entry) return
  const next = [{ path, ...entry }, ...readRecent().filter((x) => x.path !== path)].slice(
    0,
    RECENT_MAX,
  )
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* 프라이빗 모드 — 띠가 비어 있을 뿐이다 */
  }
}

function RecentStrip() {
  const items = readRecent()
  if (!items.length) return null
  return (
    <section className="recent">
      <h3 className="recent-h">{RECENT_LABEL}</h3>
      <div className="recent-items">
        {items.map((x) => (
          <a className="wchip recent-item" href={BASE + x.path.slice(1)} key={x.path}>
            <span className="recent-kind">{x.kind}</span>
            {x.label}
          </a>
        ))}
      </div>
    </section>
  )
}

/**
 * 헤더와 검색창은 라우터 아웃렛 바깥에 살기 때문에, 라우트마다 다시 렌더되는 대신 여기서
 * 라우터 상태에 배선된다. 아웃렛 바깥이므로 훅이 아니라 구독으로 라우터 상태를 읽는다 —
 * 훅은 프로바이더의 컨텍스트를 요구한다.
 */
function useRouterLocation() {
  const [loc, setLoc] = useState(() => router.state.location)
  useEffect(() => router.subscribe('onResolved', () => setLoc(router.state.location)), [])
  return loc
}

function Chrome() {
  const location = useRouterLocation()
  const path = location.pathname.replace(BASE.replace(/\/$/, ''), '') || '/'
  const q = (location.search as { q?: string }).q ?? ''
  const [draft, setDraft] = useState(q)

  useEffect(() => setDraft(q), [q])

  // 클라이언트 내비게이션 중에도 탭 제목이 사실을 유지하게 한다.
  useEffect(() => {
    document.title = metaFor(path).title
    recordVisit(path)
  }, [path])

  // 크롬은 index.html에 서버 렌더되어 있으므로, React에서 다시 선언해 프리렌더된
  // 마크업과 싸우는 대신 명령적으로 다룬다.
  useEffect(() => {
    const search = required<HTMLInputElement>('search')
    search.placeholder = PLACEHOLDER
    if (search.value !== draft) search.value = draft
    const view = currentView(path)
    for (const a of document.querySelectorAll<HTMLElement>('[data-nav]')) {
      a.classList.toggle('active', a.dataset.nav === view)
    }
    for (const a of document.querySelectorAll<HTMLAnchorElement>('.topbar a[href^="./"]')) {
      a.setAttribute('href', BASE + (a.getAttribute('href') ?? '').slice(2))
    }
  }, [path, draft])

  useEffect(() => {
    const search = required<HTMLInputElement>('search')
    let timer: ReturnType<typeof setTimeout>
    const onInput = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const value = search.value.trim()
        setDraft(value)
        const to = path.startsWith('/workouts') ? '/workouts' : '/'
        void router.navigate({ to, search: value ? { q: value } : {} })
      }, 120)
    }
    search.addEventListener('input', onInput)
    return () => {
      clearTimeout(timer)
      search.removeEventListener('input', onInput)
    }
  }, [path])

  return path === '/' && !q ? <RecentStrip /> : null
}

/**
 *   /  또는 s   검색창에 포커스        ArrowUp/Down   결과를 훑는다
 *   Enter       강조된 항목을 연다      Esc            지우고 포커스를 뗀다
 */
function useKeyboardLookup() {
  const location = useRouterLocation()
  useEffect(() => {
    let index = -1
    const app = required<HTMLElement>('app')
    const results = () => [...app.querySelectorAll<HTMLElement>('a.card, a.collision-item')]
    const clear = () => {
      index = -1
      for (const el of app.querySelectorAll('.kbd-active')) el.classList.remove('kbd-active')
    }
    const move = (delta: number) => {
      const items = results()
      if (!items.length) return
      items[index]?.classList.remove('kbd-active')
      index = (index + delta + items.length) % items.length
      items[index].classList.add('kbd-active')
      items[index].scrollIntoView({ block: 'nearest' })
    }
    const typing = (el: Element | null) =>
      !!el &&
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable)

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const search = required<HTMLInputElement>('search')
      if ((e.key === '/' || e.key === 's') && !typing(document.activeElement)) {
        e.preventDefault()
        search.focus()
        search.select()
        return
      }
      if (e.key === 'Escape') {
        if (search.value) {
          search.value = ''
          search.dispatchEvent(new Event('input'))
        }
        search.blur()
        clear()
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!results().length) return
        e.preventDefault()
        move(e.key === 'ArrowDown' ? 1 : -1)
        return
      }
      if (e.key === 'Enter' && index >= 0) {
        const el = results()[index]
        if (el) {
          e.preventDefault()
          el.click()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    clear()
    return () => document.removeEventListener('keydown', onKey)
  }, [location.pathname, location.searchStr])
}

function App() {
  useKeyboardLookup()
  return (
    <>
      <Chrome />
      <RouterProvider router={router} />
    </>
  )
}

createRoot(required<HTMLElement>('app')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE }).catch(() => {
      /* 오프라인은 부가 기능이다. 거부되어도 달라지는 것은 없다 */
    })
  })
}
