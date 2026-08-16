import { createFileRoute } from '@tanstack/react-router'

import { WORKOUTS_META } from '../data/index.ts'
import { canonical } from '../ui/href.ts'
import { WorkoutList } from '../ui/lists.tsx'

export const Route = createFileRoute('/workouts')({
  staticData: { view: 'workouts' },
  head: () => ({
    meta: [
      { title: WORKOUTS_META.title },
      { name: 'description', content: WORKOUTS_META.description },
      { property: 'og:title', content: WORKOUTS_META.title },
      { property: 'og:description', content: WORKOUTS_META.description },
      { property: 'og:url', content: canonical('/workouts') },
    ],
    links: [{ rel: 'canonical', href: canonical('/workouts') }],
  }),
  component: WorkoutList,
})
