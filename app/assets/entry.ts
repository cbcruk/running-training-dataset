/**
 * 브라우저 진입점.
 *
 * 라우팅은 여기 없다. Remix 3에서 문서 내비게이션은 실제 내비게이션이고, 프리렌더된 파일
 * 하나하나가 진짜 문서라서 링크가 그것을 그대로 연다. 남는 것은 라우터가 결코 소유하지
 * 않았던 것들이다 — 클라이언트 엔트리를 깨우는 런타임, 키보드 우선 조회, 오프라인.
 */
import { run } from 'remix/ui'
import { BASE } from '../ui/href.ts'

const app = run({
  async loadModule(moduleUrl, exportName) {
    const mod = await import(moduleUrl)
    return mod[exportName]
  },
  /**
   * 런타임이 내부 링크 클릭을 가로채 최상위 프레임을 이 함수로 다시 읽는다. 그래서
   * 프리렌더된 문서를 그대로 쓰면서도 전체 리로드 없이 넘어간다 — ADR 0001이 말하는
   * "쓰기 위한 앱" 절반이, 라우터 없이 문서 교체로 돌아온 것이다.
   */
  async resolveFrame(src, options) {
    // beta.6에서 위치 인자(src, signal)가 옵션 객체로 바뀌었다. 옵션은 폼 제출도
    // 실어 나르지만(`method`·`formData`·`encType`) 이 사이트에는 폼이 없다. 그것들을
    // 조용히 버리는 대신 여기 적어둔다 - 폼이 생기면 이 함수가 GET으로 삼켜버린다.
    const response = await fetch(src, {
      headers: { Accept: 'text/html' },
      signal: options?.signal,
    })
    if (!response.ok) return `<pre>Frame error: ${response.status} ${response.statusText}</pre>`
    return response.body ?? (await response.text())
  },
})

app.addEventListener('error', (event) => {
  console.error('Component error:', event.error)
})

/**
 *   /  또는 s   검색창에 포커스        ArrowUp/Down   결과를 훑는다
 *   Enter       강조된 항목을 연다      Esc            지우고 포커스를 뗀다
 *
 * 라우팅 관심사가 아니어서 프레임워크가 바뀌어도 손으로 쓴 채로 남는다. 예전 판본과 다른
 * 점은 결과가 `#app` 안에만 있지 않다는 것뿐이다 — 검색 결과는 그 바깥에 그려진다.
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
      if (box.value) {
        box.value = ''
        box.dispatchEvent(new Event('input', { bubbles: true }))
      }
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
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE }).catch(() => {})
  })
}
