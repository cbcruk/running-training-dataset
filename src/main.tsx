/**
 * Browser entry.
 *
 * The shell is a React root now rather than an innerHTML assignment, and routing
 * is TanStack Router rather than a hand-rolled History-API switch. What is left
 * here is what a router does not own: the chrome (nav, search box, language
 * toggle), keyboard-first lookup, recently-viewed, and the service worker.
 *
 * The dictionary shape from ADR 0001 is unchanged: prerendered documents for
 * discovery, this bundle for use. `scripts/prerender.tsx` drives the same route
 * tree, so the two cannot drift.
 */
import './style.css'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { makeRouter, useLang } from './router.tsx'
import { PLACEHOLDER, RECENT_LABEL, currentView, entryLabel, metaFor } from './data.tsx'
import type { Lang } from './types/view.ts'

const BASE = import.meta.env.BASE_URL || '/'
const router = makeRouter(BASE)

function required<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`missing #${id} - index.html and main.tsx disagree`)
  return el as T
}

/**
 * Per-reader, so it is never prerendered: the files on disk must read the same
 * for everyone.
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
    /* private mode - the strip just stays empty */
  }
}

function RecentStrip({ lang }: { lang: Lang }) {
  const items = readRecent()
  if (!items.length) return null
  return (
    <section className="recent">
      <h3 className="recent-h">{RECENT_LABEL[lang] || RECENT_LABEL.en}</h3>
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
 * The header, search box and language toggle live outside the router outlet, so
 * they are wired here against router state rather than re-rendered per route.
 * The chrome sits outside the router outlet, so it reads router state through a
 * subscription rather than the hooks - those require the provider's context.
 */
function useRouterLocation() {
  const [loc, setLoc] = useState(() => router.state.location)
  useEffect(() => router.subscribe('onResolved', () => setLoc(router.state.location)), [])
  return loc
}

function Chrome({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const location = useRouterLocation()
  const path = location.pathname.replace(BASE.replace(/\/$/, ''), '') || '/'
  const q = (location.search as { q?: string }).q ?? ''
  const [draft, setDraft] = useState(q)

  useEffect(() => setDraft(q), [q])

  // Keep the tab title truthful across client-side navigation.
  useEffect(() => {
    document.title = metaFor(path).title
    recordVisit(path)
  }, [path])

  // The chrome is server-rendered in index.html, so drive it imperatively rather
  // than re-declaring it in React and fighting the prerendered markup.
  useEffect(() => {
    const search = required<HTMLInputElement>('search')
    const toggle = required<HTMLButtonElement>('lang-toggle')
    toggle.textContent = lang === 'ko' ? 'EN' : '한국어'
    search.placeholder = PLACEHOLDER[lang]
    if (search.value !== draft) search.value = draft
    const view = currentView(path)
    for (const a of document.querySelectorAll<HTMLElement>('[data-nav]')) {
      a.classList.toggle('active', a.dataset.nav === view)
    }
    for (const a of document.querySelectorAll<HTMLAnchorElement>('.topbar a[href^="./"]')) {
      a.setAttribute('href', BASE + (a.getAttribute('href') ?? '').slice(2))
    }
  }, [lang, path, draft])

  useEffect(() => {
    const search = required<HTMLInputElement>('search')
    const toggle = required<HTMLButtonElement>('lang-toggle')
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
    const onToggle = () => setLang(lang === 'ko' ? 'en' : 'ko')
    search.addEventListener('input', onInput)
    toggle.addEventListener('click', onToggle)
    return () => {
      clearTimeout(timer)
      search.removeEventListener('input', onInput)
      toggle.removeEventListener('click', onToggle)
    }
  }, [lang, path, setLang])

  return path === '/' && !q ? <RecentStrip lang={lang} /> : null
}

/**
 *   /  or  s   focus the search box        ArrowUp/Down   walk the results
 *   Enter      open the highlighted hit    Esc            clear, then blur
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
  const [lang, setLang] = useLang()
  useKeyboardLookup()
  return (
    <>
      <Chrome lang={lang} setLang={setLang} />
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
      /* offline is an enhancement; a refusal changes nothing */
    })
  })
}
