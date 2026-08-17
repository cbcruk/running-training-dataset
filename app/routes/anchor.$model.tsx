/** 앵커 엔트리 라우트. 세 부분이 왜 나뉘어 있는지는 app/routes/system.$id.tsx에 있다. */
import { createFileRoute, notFound } from '@tanstack/react-router'

import { anchorLabel, anchorMeta, byAnchor } from '../data/index.ts'
import { AnchorDetail } from '../ui/anchor-detail.tsx'
import { canonical } from '../ui/href.ts'
import { NotFound } from '../ui/lists.tsx'

export const Route = createFileRoute('/anchor/$model')({
  staticData: { view: 'anchors' },
  loader: ({ params }) => {
    const a = byAnchor[params.model]
    if (!a) throw notFound()
    return { entry: anchorLabel(a) }
  },
  head: ({ params }) => {
    const a = byAnchor[params.model]
    if (!a) return {}
    const meta = anchorMeta(a)
    const href = canonical(`/anchor/${a.model}`)
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
  component: AnchorRoute,
  notFoundComponent: MissingAnchor,
})

function AnchorRoute() {
  const { model } = Route.useParams()
  return <AnchorDetail anchor={byAnchor[model]} />
}

function MissingAnchor() {
  const { model } = Route.useParams()
  return <NotFound id={model} />
}
