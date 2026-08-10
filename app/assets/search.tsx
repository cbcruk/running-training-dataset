/** @jsxImportSource remix/ui */
/**
 * 검색. 클라이언트 엔트리다.
 *
 * 서버에서 돌 수도 있었다 — `?q=`를 읽는 액션 하나면 된다 — 하지만 이 사이트는 GitHub
 * Pages에 정적 파일로 나가고 정적 파일은 질의 문자열을 볼 수 없다. 그래서 검색은 예전
 * 판본에서와 마찬가지로 브라우저에서 돈다. 달라진 것은 코퍼스가 번들 안에 있지 않고
 * `routes.searchIndex` 엔드포인트에서 한 번 받아온다는 것뿐이다(app/routes.ts).
 *
 * 결과가 나오면 `<body>`에 `searching` 클래스가 붙고 CSS가 `#app`을 숨긴다. 결과를 문서
 * 본문 자리로 옮기는 대신 이렇게 한 이유는, 그러려면 서버가 렌더한 페이지 전체를 이
 * 컴포넌트의 prop으로 직렬화해야 하고 그러면 모든 문서가 자기 내용을 두 번 싣게 되기
 * 때문이다.
 */
import { clientEntry, on, type Handle, type SerializableProps } from 'remix/ui'
import { routes } from '../routes.ts'
import { url } from '../ui/href.ts'

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

interface SearchPanelProps extends SerializableProps {
  placeholder: string
}

const TIER_LABEL: Record<string, string> = {
  consensus: '정설',
  plausible: '유력',
  tradition: '관행',
}

const HREF: Record<SearchEntry['kind'], (id: string) => string> = {
  system: (id) => routes.system.href({ id }),
  workout: (id) => routes.workout.href({ id }),
  anchor: (model) => routes.anchor.href({ model }),
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

export const SearchPanel = clientEntry(
  import.meta.url,
  function SearchPanel(handle: Handle<SearchPanelProps>) {
    let query = ''
    let index: SearchIndex | null = null

    /** 색인은 첫 키 입력에서 한 번만 받는다. 실패하면 검색이 조용히 비어 있을 뿐이다. */
    async function loadIndex() {
      if (index) return
      try {
        const res = await fetch(url(routes.searchIndex.href()))
        if (res.ok) index = (await res.json()) as SearchIndex
      } catch {
        /* 오프라인이고 캐시에도 없다 — 결과가 비는 것 말고 달라지는 것은 없다 */
      }
    }

    function setQuery(next: string) {
      query = next
      document.body.classList.toggle('searching', query !== '')
    }

    return () => {
      const q = query.toLowerCase()
      const hits =
        index && q ? index.entries.filter((e) => e.haystack.some((h) => h.includes(q))) : []

      // 통칭 하나가 둘 이상의 워크아웃으로 풀리는 것이, 이 데이터셋이 보이게 만들려고
      // 존재하는 충돌이다. 그래서 결과의 헤드라인이 된다.
      const termHits =
        index && q
          ? index.usage.filter(
              (u) =>
                u.calls_it.toLowerCase().includes(q) ||
                u.aka.some((a) => a.toLowerCase().includes(q)),
            )
          : []
      const collisions = [...new Set(termHits.map((u) => u.workout))]
      const byId = new Map(index?.entries.map((e) => [`${e.kind}:${e.id}`, e]))

      const groups = (['system', 'workout', 'anchor'] as const)
        .map((kind) => ({ kind, items: hits.filter((h) => h.kind === kind) }))
        .filter((g) => g.items.length)

      // 루트는 항상 이 요소 하나다. 클라이언트 엔트리가 최상위 노드 개수를 바꾸면 런타임의
      // DOM diff가 형제를 문서 수준에 끼워 넣으려 하고, doctype 앞에는 아무것도 들어갈 수
      // 없어서 페이지가 통째로 깨진다.
      return (
        <div className="searchpanel">
          <div className="searchwrap">
            <input
              id="search"
              className="search"
              type="search"
              autocomplete="off"
              spellcheck={false}
              placeholder={handle.props.placeholder}
              mix={on('input', async (event) => {
                const value = (event.currentTarget as HTMLInputElement).value.trim()
                if (value === query) return
                setQuery(value)
                if (value) await loadIndex()
                void handle.update()
              })}
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
                      <a className="collision-item" href={url(HREF.workout(id))} key={id}>
                        <b>{byId.get(`workout:${id}`)?.title ?? id}</b>
                        <span>
                          {termHits
                            .filter((u) => u.workout === id)
                            .map((u) => u.system ?? '—')
                            .join(', ')}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              {groups.map(({ kind, items }) => (
                <div key={kind}>
                  <h3 className="search-h">{HEADING[kind]}</h3>
                  <div className="grid">
                    {items.map((e) => (
                      <a className={CARD_CLASS[kind]} href={url(HREF[kind](e.id))} key={e.id}>
                        <div className="card-head">
                          <h2>{kind === 'anchor' ? <code>{e.title}</code> : e.title}</h2>
                          {e.tier ? (
                            <span className={`tier tier-${e.tier}`}>
                              {TIER_LABEL[e.tier] ?? e.tier}
                            </span>
                          ) : null}
                        </div>
                        <p className="bet">{e.sub}</p>
                      </a>
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
  },
)
