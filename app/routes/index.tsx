import { createFileRoute } from '@tanstack/react-router'

import { HOME_META } from '../data/index.ts'
import { canonical } from '../ui/href.ts'
import { SystemList } from '../ui/lists.tsx'

export const Route = createFileRoute('/')({
  staticData: { view: 'systems' },
  head: () => ({
    meta: [
      { title: HOME_META.title },
      { name: 'description', content: HOME_META.description },
      { property: 'og:title', content: HOME_META.title },
      { property: 'og:description', content: HOME_META.description },
      { property: 'og:url', content: canonical('/') },
    ],
    links: [{ rel: 'canonical', href: canonical('/') }],
  }),
  component: SystemList,
})
