/** 워크아웃 엔트리 라우트. 세 부분이 왜 나뉘어 있는지는 app/routes/system.$id.tsx에 있다. */
import { createFileRoute, notFound } from '@tanstack/react-router'

import { byWorkout, workoutLabel, workoutMeta } from '../data/index.ts'
import { canonical } from '../ui/href.ts'
import { NotFound } from '../ui/lists.tsx'
import { WorkoutDetail } from '../ui/workout-detail.tsx'

export const Route = createFileRoute('/workout/$id')({
  staticData: { view: 'workouts' },
  loader: ({ params }) => {
    const w = byWorkout[params.id]
    if (!w) throw notFound()
    return { entry: workoutLabel(w) }
  },
  head: ({ params }) => {
    const w = byWorkout[params.id]
    if (!w) return {}
    const meta = workoutMeta(w)
    const href = canonical(`/workout/${w.id}`)
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
  component: WorkoutRoute,
  notFoundComponent: MissingWorkout,
})

function WorkoutRoute() {
  const { id } = Route.useParams()
  return <WorkoutDetail workout={byWorkout[id]} />
}

function MissingWorkout() {
  const { id } = Route.useParams()
  return <NotFound id={id} />
}
