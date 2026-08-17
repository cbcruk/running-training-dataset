/**
 * 훈련법 엔트리 라우트. 워크아웃·앵커 라우트도 같은 모양이다.
 *
 * 세 가지가 나뉘어 있는 이유를 한 번만 적는다.
 *
 * - `loader`는 행이 있는지 확인하고, 없으면 `notFound()`를 던진다. 돌려주는 것은 최근 본
 *   항목 띠가 쓰는 라벨 하나뿐이다 — 로더가 돌려주는 값은 하이드레이션 페이로드로 문서에
 *   직렬화되므로, 행 전체를 돌려주면 모든 페이지가 자기 내용을 두 번 싣게 된다.
 * - `component`는 코퍼스에서 직접 읽는다. 코퍼스는 어차피 브라우저 번들에 있다(목록
 *   페이지와 앵커 툴팁이 그것을 필요로 한다), 그래서 직렬화가 아니라 조회가 싸다.
 * - `head`는 엔트리별 <title>·description·canonical·OG를 얹는다. 크롤러와 링크 프리뷰가
 *   읽는 것은 이것뿐이고, 프리렌더된 문서 하나하나가 자기 것을 들고 있어야 한다(ADR 0001).
 */
import { createFileRoute, notFound } from '@tanstack/react-router'

import { bySystem, systemLabel, systemMeta } from '../data/index.ts'
import { canonical } from '../ui/href.ts'
import { NotFound } from '../ui/lists.tsx'
import { SystemDetail } from '../ui/system-detail.tsx'

export const Route = createFileRoute('/system/$id')({
  staticData: { view: 'systems' },
  loader: ({ params }) => {
    const s = bySystem[params.id]
    if (!s) throw notFound()
    return { entry: systemLabel(s) }
  },
  head: ({ params }) => {
    const s = bySystem[params.id]
    if (!s) return {}
    const meta = systemMeta(s)
    const href = canonical(`/system/${s.id}`)
    return {
      meta: [
        { title: meta.title },
        { name: 'description', content: meta.description },
        { property: 'og:title', content: meta.title },
        { property: 'og:description', content: meta.description },
        { property: 'og:url', content: href },
      ],
      links: [{ rel: 'canonical', href }],
    }
  },
  component: SystemRoute,
  notFoundComponent: MissingSystem,
})

function SystemRoute() {
  const { id } = Route.useParams()
  return <SystemDetail system={bySystem[id]} />
}

function MissingSystem() {
  const { id } = Route.useParams()
  return <NotFound id={id} />
}
