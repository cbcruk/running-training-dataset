/** @jsxImportSource remix/ui */
/**
 * 루트 컨트롤러. 사전이 가진 라우트가 전부 여기 있다 — 44개 엔트리와 그것을 여는 목록 셋.
 *
 * 각 액션이 하는 일은 같다. 행 하나를 찾고, 없으면 404를 돌려주고, 그 행에 맞는 메타데이터와
 * 함께 문서를 렌더한다. 메타데이터가 액션에 있는 이유는 ADR 0001이다: 엔트리마다 자기
 * <title>과 description을 가진 진짜 문서가 하나씩 있어야 한다.
 */
import { createController } from 'remix/router'

import {
  ANCHORS_META,
  HOME_META,
  WORKOUTS_META,
  anchorLabel,
  anchorMeta,
  byAnchor,
  bySystem,
  byWorkout,
  searchIndex,
  systemLabel,
  systemMeta,
  workoutLabel,
  workoutMeta,
  type View,
} from '../data/index.ts'
import { routes } from '../routes.ts'
import { AnchorDetail } from '../ui/anchor-detail.tsx'
import { Document } from '../ui/document.tsx'
import { AnchorList, NotFound, SystemList, WorkoutList } from '../ui/lists.tsx'
import { SystemDetail } from '../ui/system-detail.tsx'
import { WorkoutDetail } from '../ui/workout-detail.tsx'

export default createController(routes, {
  actions: {
    searchIndex() {
      return Response.json(searchIndex())
    },

    home({ render }) {
      return render(
        <Document meta={HOME_META} path="/" view="systems">
          <SystemList />
        </Document>,
      )
    },

    workouts({ render }) {
      return render(
        <Document meta={WORKOUTS_META} path="/workouts" view="workouts">
          <WorkoutList />
        </Document>,
      )
    },

    anchors({ render }) {
      return render(
        <Document meta={ANCHORS_META} path="/anchors" view="anchors">
          <AnchorList />
        </Document>,
      )
    },

    system({ params, render }) {
      const s = bySystem[params.id]
      if (!s) return render(notFoundDoc(params.id, 'systems'), { status: 404 })
      return render(
        <Document
          meta={systemMeta(s)}
          path={routes.system.href({ id: s.id })}
          view="systems"
          entry={systemLabel(s)}
        >
          <SystemDetail system={s} />
        </Document>,
      )
    },

    workout({ params, render }) {
      const w = byWorkout[params.id]
      if (!w) return render(notFoundDoc(params.id, 'workouts'), { status: 404 })
      return render(
        <Document
          meta={workoutMeta(w)}
          path={routes.workout.href({ id: w.id })}
          view="workouts"
          entry={workoutLabel(w)}
        >
          <WorkoutDetail workout={w} />
        </Document>,
      )
    },

    anchor({ params, render }) {
      const a = byAnchor[params.model]
      if (!a) return render(notFoundDoc(params.model, 'anchors'), { status: 404 })
      return render(
        <Document
          meta={anchorMeta(a)}
          path={routes.anchor.href({ model: a.model })}
          view="anchors"
          entry={anchorLabel(a)}
        >
          <AnchorDetail anchor={a} />
        </Document>,
      )
    },
  },
})

/**
 * 없는 엔트리도 문서다. 상태 코드는 404지만 본문은 여전히 사전의 셸이라, 링크를 잘못 따라온
 * 사람이 빈 페이지가 아니라 돌아갈 길을 본다.
 */
function notFoundDoc(id: string, view: View) {
  return (
    <Document meta={HOME_META} path="/" view={view}>
      <NotFound id={id} />
    </Document>
  )
}
