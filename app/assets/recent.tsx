/** @jsxImportSource remix/ui */
/**
 * 최근 본 항목.
 *
 * 읽는 사람마다 다르므로 절대 프리렌더되지 않는다 — 디스크의 파일은 모두에게 같게
 * 읽혀야 한다. 그래서 이것은 클라이언트 엔트리다. 서버는 빈 자리만 렌더하고, 브라우저가
 * localStorage에서 채운다.
 *
 * 라벨은 서버가 건네준다. 코퍼스가 있어야 `daniels`를 "Daniels"라고 부를 수 있는데
 * 브라우저에는 코퍼스가 없기 때문이다(app/data/index.ts의 검색 색인 주석 참조).
 */
import { clientEntry, type Handle, type SerializableProps } from 'remix/ui'
import { url } from '../ui/href.ts'

const KEY = 'recent'
const MAX = 8
const LABEL = '최근 본 항목'

interface RecentItem {
  path: string
  kind: string
  label: string
}

interface RecentStripProps extends SerializableProps {
  /** 지금 문서의 사이트 루트 기준 경로. */
  path: string
  /** 지금 문서가 사전 엔트리라면 그 이름. 목록 페이지에는 없다. */
  entry?: { kind: string; label: string }
  /** 띠를 그리는 것은 홈뿐이다. 다른 페이지는 방문만 기록한다. */
  showList: boolean
}

function read(): RecentItem[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v)
      ? (v as RecentItem[]).filter((x) => x && typeof x.path === 'string')
      : []
  } catch {
    return []
  }
}

function record(item: RecentItem): RecentItem[] {
  const next = [item, ...read().filter((x) => x.path !== item.path)].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* 프라이빗 모드 — 띠가 비어 있을 뿐이다 */
  }
  return next
}

export const RecentStrip = clientEntry(
  import.meta.url,
  function RecentStrip(handle: Handle<RecentStripProps>) {
    let items: RecentItem[] = []

    // 서버 렌더에는 localStorage가 없다. 그쪽은 빈 자리를 그리고 끝난다.
    if (typeof localStorage !== 'undefined') {
      const { path, entry } = handle.props
      items = entry ? record({ path, ...entry }) : read()
    }

    // 루트 요소는 늘 있고 안쪽만 바뀐다. 이유는 app/assets/search.tsx와 같다.
    return () => {
      if (!handle.props.showList || !items.length) return <div className="recent-slot" />
      return (
        <div className="recent-slot">
          <section className="recent">
            <h3 className="recent-h">{LABEL}</h3>
            <div className="recent-items">
              {items.map((x) => (
                <a className="wchip recent-item" href={url(x.path)} key={x.path}>
                  <span className="recent-kind">{x.kind}</span>
                  {x.label}
                </a>
              ))}
            </div>
          </section>
        </div>
      )
    }
  },
)
