import { createFileRoute } from '@tanstack/react-router'

import { ANCHORS_META } from '../data/index.ts'
import { canonical } from '../ui/href.ts'
import { AnchorList } from '../ui/lists.tsx'

export const Route = createFileRoute('/anchors')({
  staticData: { view: 'anchors' },
  head: () => ({
    meta: [
      { title: ANCHORS_META.title },
      { name: 'description', content: ANCHORS_META.description },
      { property: 'og:title', content: ANCHORS_META.title },
      { property: 'og:description', content: ANCHORS_META.description },
      { property: 'og:url', content: canonical('/anchors') },
    ],
    links: [{ rel: 'canonical', href: canonical('/anchors') }],
  }),
  component: AnchorList,
})
