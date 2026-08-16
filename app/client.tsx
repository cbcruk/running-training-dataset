/**
 * 브라우저 진입점.
 *
 * 위쪽 절반은 Start의 기본 클라이언트 엔트리와 같다 — 문서를 하이드레이트한다. 아래쪽은
 * 라우터가 결코 소유하지 않는 것들이다: 키보드 우선 조회와 오프라인. 프레임워크가 바뀌어도
 * 손으로 쓴 채로 남는 부분이고, ADR 0004부터 여기 있었다.
 */
import { StartClient } from '@tanstack/react-start/client'
import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'

import { CLEAR_SEARCH } from './client/search.tsx'

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})

/**
 *   /  또는 s   검색창에 포커스        ArrowUp/Down   결과를 훑는다
 *   Enter       강조된 항목을 연다      Esc            지우고 포커스를 뗀다
 *
 * DOM을 직접 만지는 이유는 이것이 React 트리의 상태가 아니기 때문이다 — 강조는 문서 전체를
 * 훑고, 검색 결과와 카드 목록은 서로 다른 컴포넌트가 그린다. 결과가 `#app` 안에만 있지
 * 않다는 점만 예전 판본과 다르다.
 */
function keyboardLookup() {
  let index = -1

  const search = () => document.getElementById('search') as HTMLInputElement | null
  const results = () =>
    [...document.querySelectorAll<HTMLElement>('a.card, a.collision-item')].filter(
      (el) => el.offsetParent !== null,
    )

  const clear = () => {
    index = -1
    for (const el of document.querySelectorAll('.kbd-active')) el.classList.remove('kbd-active')
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

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const box = search()
    if (!box) return

    if ((e.key === '/' || e.key === 's') && !typing(document.activeElement)) {
      e.preventDefault()
      box.focus()
      box.select()
      return
    }
    if (e.key === 'Escape') {
      // 값은 React가 소유한다. 여기서 `box.value`를 직접 지우면 React의 value tracker가
      // 변화를 못 보고 다음 렌더가 되돌려놓으므로, 지우는 일 자체를 컴포넌트에 맡긴다.
      if (box.value) document.dispatchEvent(new CustomEvent(CLEAR_SEARCH))
      box.blur()
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
  })

  // 결과 목록이 바뀌면 강조는 더 이상 아무것도 가리키지 않는다.
  document.addEventListener('input', clear, true)
}

keyboardLookup()

/** 오프라인은 부가 기능이다. 거부되어도 달라지는 것은 없다. */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {})
  })
}
