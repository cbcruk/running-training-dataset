/**
 * 검색.
 *
 * 서버에서 돌 수도 있었다 — `?q=`를 읽는 로더 하나면 된다 — 하지만 이 사이트는 GitHub
 * Pages에 정적 파일로 나가고 정적 파일은 질의 문자열을 볼 수 없다. 그래서 검색은 예전
 * 판본에서와 마찬가지로 브라우저에서 돈다. 코퍼스는 번들이 아니라
 * `/search-index.json`에서 한 번 받아온다(scripts/search-index.ts가 굽는다).
 *
 * 결과가 나오면 `<body>`에 `searching` 클래스가 붙고 CSS가 `#app`을 숨긴다. 결과를 문서
 * 본문 자리로 옮기는 대신 이렇게 한 이유는, 그러려면 서버가 렌더한 페이지 전체를 이
 * 컴포넌트의 prop으로 직렬화해야 하고 그러면 모든 문서가 자기 내용을 두 번 싣게 되기
 * 때문이다.
 */
import { useEffect, useRef, useState } from 'react'

import { AnchorLink, SystemLink, WorkoutLink } from '../ui/primitives.tsx'

interface SearchEntry {
  kind: 'system' | 'workout' | 'anchor'
  id: string
  title: string
  sub: string
  tier?: string
  provenance?: string
  haystack: string[]
}

interface UsageRow {
  workout: string
  calls_it: string
  aka: string[]
  system: string | null
}

interface SearchIndex {
  entries: SearchEntry[]
  usage: UsageRow[]
}

/**
 * 문서 수준 키보드 계층(app/client.tsx)이 검색을 지워달라고 부탁하는 방법.
 *
 * 값은 React가 소유하므로 바깥에서 `input.value`를 지우면 value tracker가 변화를 못 보고
 * 다음 렌더가 되돌려놓는다. 그래서 지우는 일은 이 컴포넌트가 하고, 바깥은 신호만 보낸다.
 */
export const CLEAR_SEARCH = 'search:clear'

const TIER_LABEL: Record<string, string> = {
  consensus: '정설',
  plausible: '유력',
  tradition: '관행',
}

const HEADING: Record<SearchEntry['kind'], string> = {
  system: '훈련법',
  workout: '워크아웃',
  anchor: '앵커',
}

const CARD_CLASS: Record<SearchEntry['kind'], string> = {
  system: 'card sys-card',
  workout: 'card wk-card',
  anchor: 'card anchor-card',
}

/** 결과 카드 하나. 종류마다 링크 컴포넌트가 다를 뿐 내용은 같다. */
function ResultCard({ entry: e }: { entry: SearchEntry }) {
  const body = (
    <>
      <div className="card-head">
        <h2>{e.kind === 'anchor' ? <code>{e.title}</code> : e.title}</h2>
        {e.tier ? (
          <span className={`tier tier-${e.tier}`}>{TIER_LABEL[e.tier] ?? e.tier}</span>
        ) : null}
      </div>
      <p className="bet">{e.sub}</p>
    </>
  )
  const className = CARD_CLASS[e.kind]

  if (e.kind === 'system') {
    return (
      <SystemLink className={className} id={e.id}>
        {body}
      </SystemLink>
    )
  }
  if (e.kind === 'workout') {
    return (
      <WorkoutLink className={className} id={e.id}>
        {body}
      </WorkoutLink>
    )
  }
  return (
    <AnchorLink className={className} model={e.id}>
      {body}
    </AnchorLink>
  )
}

export function SearchPanel({ placeholder }: { placeholder: string }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState<SearchIndex | null>(null)

  /** 색인은 첫 키 입력에서 한 번만 받는다. 실패하면 검색이 조용히 비어 있을 뿐이다. */
  const loading = useRef(false)
  useEffect(() => {
    if (!query || index || loading.current) return
    loading.current = true
    fetch(`${import.meta.env.BASE_URL}search-index.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: SearchIndex | null) => {
        if (json) setIndex(json)
      })
      .catch(() => {
        /* 오프라인이고 캐시에도 없다 — 결과가 비는 것 말고 달라지는 것은 없다 */
      })
  }, [query, index])

  // `#app`을 숨기는 것은 CSS다. 클래스는 문서 수준에 있어야 하므로 React 트리 밖으로 나간다.
  useEffect(() => {
    document.body.classList.toggle('searching', query !== '')
  }, [query])

  useEffect(() => {
    const clear = () => setQuery('')
    document.addEventListener(CLEAR_SEARCH, clear)
    return () => document.removeEventListener(CLEAR_SEARCH, clear)
  }, [])

  const q = query.toLowerCase()
  const hits = index && q ? index.entries.filter((e) => e.haystack.some((h) => h.includes(q))) : []

  // 통칭 하나가 둘 이상의 워크아웃으로 풀리는 것이, 이 데이터셋이 보이게 만들려고
  // 존재하는 충돌이다. 그래서 결과의 헤드라인이 된다.
  const termHits =
    index && q
      ? index.usage.filter(
          (u) =>
            u.calls_it.toLowerCase().includes(q) || u.aka.some((a) => a.toLowerCase().includes(q)),
        )
      : []
  const collisions = [...new Set(termHits.map((u) => u.workout))]
  const byId = new Map(index?.entries.map((e) => [`${e.kind}:${e.id}`, e]))

  const groups = (['system', 'workout', 'anchor'] as const)
    .map((kind) => ({ kind, items: hits.filter((h) => h.kind === kind) }))
    .filter((g) => g.items.length)

  return (
    <div className="searchpanel">
      <div className="searchwrap">
        <input
          id="search"
          className="search"
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value.trim())}
        />
        <p className="kbd-hint">
          <kbd>/</kbd> 검색 · <kbd>↑</kbd>
          <kbd>↓</kbd> 결과 · <kbd>↵</kbd> 열기 · <kbd>esc</kbd> 지우기
        </p>
      </div>

      {query ? (
        <div className="search-results">
          {collisions.length > 1 ? (
            <div className="collision-banner">
              <b>{`“${query}”`}</b>{' '}
              {`는 서로 다른 워크아웃 ${collisions.length}개를 가리킨다 — 이름은 필드가 아니라 조인이다.`}
              <div className="collision-list">
                {collisions.map((id) => (
                  <WorkoutLink className="collision-item" id={id} key={id}>
                    <b>{byId.get(`workout:${id}`)?.title ?? id}</b>
                    <span>
                      {termHits
                        .filter((u) => u.workout === id)
                        .map((u) => u.system ?? '—')
                        .join(', ')}
                    </span>
                  </WorkoutLink>
                ))}
              </div>
            </div>
          ) : null}

          {groups.map(({ kind, items }) => (
            <div key={kind}>
              <h3 className="search-h">{HEADING[kind]}</h3>
              <div className="grid">
                {items.map((e) => (
                  <ResultCard entry={e} key={e.id} />
                ))}
              </div>
            </div>
          ))}

          {!collisions.length && !groups.length ? (
            <p className="empty">{`결과 없음: “${query}”`}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
