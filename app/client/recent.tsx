/**
 * 최근 본 항목.
 *
 * 읽는 사람마다 다르므로 절대 프리렌더되지 않는다 — 디스크의 파일은 모두에게 같게
 * 읽혀야 한다. 그래서 서버는 빈 자리만 렌더하고, 브라우저가 하이드레이션 뒤에
 * localStorage에서 채운다. 읽기와 쓰기가 둘 다 이펙트 안에 있는 이유가 그것이다:
 * 렌더 중에 하면 서버와 클라이언트의 첫 트리가 갈라져 하이드레이션이 깨진다.
 *
 * 라벨은 라우트가 건네준다. 코퍼스가 있어야 `daniels`를 "Daniels"라고 부를 수 있는데
 * 브라우저에는 코퍼스가 없기 때문이다(app/data/index.ts의 검색 색인 주석 참조).
 */
import { useEffect, useState } from 'react'

import { AnchorLink, SystemLink, WorkoutLink } from '../ui/primitives.tsx'

/**
 * `recent`가 아니라 `recent:v2`인 이유: 예전 판본은 항목마다 완성된 경로 문자열을 넣었고,
 * 지금은 종류와 id를 넣는다(링크를 라우터가 타입 검사된 `to`/`params`로 만들기 때문이다).
 * 키를 바꾸면 예전 항목이 파싱 실패가 아니라 그냥 없는 것이 되고, 띠는 한 번 비었다가
 * 다시 찬다.
 */
const KEY = 'recent:v2'
const MAX = 8
const LABEL = '최근 본 항목'

export type EntryKind = 'system' | 'workout' | 'anchor'

export interface RecentItem {
  kind: EntryKind
  id: string
  label: string
}

export interface RecentStripProps {
  /** 지금 문서가 사전 엔트리라면 그것. 목록 페이지에는 없고, 그때는 기록하지 않는다. */
  entry?: RecentItem
  /** 띠를 그리는 것은 홈뿐이다. 다른 페이지는 방문만 기록한다. */
  showList: boolean
}

const KINDS: EntryKind[] = ['system', 'workout', 'anchor']

const isItem = (x: unknown): x is RecentItem =>
  !!x &&
  typeof x === 'object' &&
  typeof (x as RecentItem).id === 'string' &&
  typeof (x as RecentItem).label === 'string' &&
  KINDS.includes((x as RecentItem).kind)

function read(): RecentItem[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v.filter(isItem) : []
  } catch {
    return []
  }
}

function record(item: RecentItem): RecentItem[] {
  const key = `${item.kind}:${item.id}`
  const next = [item, ...read().filter((x) => `${x.kind}:${x.id}` !== key)].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* 프라이빗 모드 — 띠가 비어 있을 뿐이다 */
  }
  return next
}

function RecentLink({ item }: { item: RecentItem }) {
  const body = (
    <>
      <span className="recent-kind">{item.kind}</span>
      {item.label}
    </>
  )
  const className = 'wchip recent-item'
  if (item.kind === 'system') {
    return (
      <SystemLink className={className} id={item.id}>
        {body}
      </SystemLink>
    )
  }
  if (item.kind === 'workout') {
    return (
      <WorkoutLink className={className} id={item.id}>
        {body}
      </WorkoutLink>
    )
  }
  return (
    <AnchorLink className={className} model={item.id}>
      {body}
    </AnchorLink>
  )
}

export function RecentStrip({ entry, showList }: RecentStripProps) {
  const [items, setItems] = useState<RecentItem[]>([])

  useEffect(() => {
    setItems(entry ? record(entry) : read())
  }, [entry?.kind, entry?.id, entry?.label])

  // 루트 요소는 늘 있고 안쪽만 바뀐다. 서버가 그린 빈 자리와 첫 클라이언트 렌더가 같아야
  // 하이드레이션이 조용히 지나간다.
  if (!showList || !items.length) return <div className="recent-slot" />
  return (
    <div className="recent-slot">
      <section className="recent">
        <h3 className="recent-h">{LABEL}</h3>
        <div className="recent-items">
          {items.map((x) => (
            <RecentLink item={x} key={`${x.kind}:${x.id}`} />
          ))}
        </div>
      </section>
    </div>
  )
}
