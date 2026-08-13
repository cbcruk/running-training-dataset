/** @jsxImportSource remix/ui */
/**
 * 브라우즈 표면. 목록 셋과 not-found.
 *
 * 검색 결과는 여기 없다. 그건 클라이언트에서 돌고(app/assets/search.tsx), 이유는
 * ADR 0009에 적혀 있다 — 정적으로 서빙되는 파일은 `?q=`를 볼 수 없다.
 */
import type { Handle } from 'remix/ui'
import { EntryLink, ProvenanceBadge, TierBadge } from './primitives.tsx'
import {
  ANCHOR_CONSTRUCTS,
  anchors,
  km,
  sessionsText,
  systems,
  systemsByAnchor,
  weeksText,
  workouts,
  workoutsByAnchor,
} from '../data/index.ts'
import type { Anchor, System, Workout } from '../data/types/index.d.ts'
import { routes } from '../routes.ts'

/**
 * 등급은 카드에 올라간다. 상세 뷰에만 두는 일은 없다 — README의 유일한 강한 UI 규칙이고,
 * 그래야 훈련법 열 개를 훑어도 `tradition`이 `consensus`처럼 보이지 않는다. 출처 상태가
 * 그 옆에 붙는 이유도 같다. 대부분의 행에 기록된 source가 없고, 빈칸은 브라우징 중에
 * 문서화되지 않은 행을 문서화된 행과 구별할 수 없게 만들었다. 두 엔티티가 모두 이 쌍을
 * 달고 있으므로, 읽는 사람은 자기가 어떤 종류의 카드를 보는지 몰라도 배지를 읽을 수 있다.
 */
export function SystemCard(handle: Handle<{ system: System; brief?: boolean }>) {
  return () => {
    const { system: s, brief = false } = handle.props
    const c = s.commitment || {}
    const chips = [
      sessionsText(c.sessions_per_week) && `${sessionsText(c.sessions_per_week)}/wk`,
      c.min_weekly_km && `≥${km(c.min_weekly_km)}`,
      weeksText(c.plan_length_weeks),
      c.requires_track ? 'track' : null,
    ].filter(Boolean) as string[]

    return (
      <EntryLink className="card sys-card" to={routes.system.href({ id: s.id })}>
        <div className="card-head">
          <h2>{s.name}</h2>
          <span className="badges">
            <TierBadge tier={s.evidence?.tier} />
            <ProvenanceBadge provenance={s.provenance} />
          </span>
        </div>
        {brief ? null : <p className="attribution">{s.attribution || ''}</p>}
        <p className="bet">{s.bet}</p>
        {brief ? null : (
          <div className="chips">
            {chips.map((x) => (
              <span className="chip" key={x}>
                {x}
              </span>
            ))}
          </div>
        )}
      </EntryLink>
    )
  }
}

export function WorkoutCard(handle: Handle<{ workout: Workout; brief?: boolean }>) {
  return () => {
    const { workout: w, brief = false } = handle.props
    return (
      <EntryLink className="card wk-card" to={routes.workout.href({ id: w.id })}>
        <div className="card-head">
          <h2>{w.canonical_name}</h2>
          <span className="badges">
            <TierBadge tier={w.claim?.evidence?.tier} dose={w.claim?.evidence?.dose_question} />
            <ProvenanceBadge provenance={w.provenance} />
          </span>
        </div>
        {brief ? null : (
          <p className="family">
            <code>{w.family}</code>
            {w.test?.detectable === false ? (
              <>
                {' · '}
                <span className="undetectable">관찰 불가</span>
              </>
            ) : null}
          </p>
        )}
        <p className="bet">{w.claim?.proposition}</p>
      </EntryLink>
    )
  }
}

export function AnchorCard(handle: Handle<{ anchor: Anchor }>) {
  return () => {
    const a = handle.props.anchor
    const sys = systemsByAnchor[a.model]?.length || 0
    const wk = workoutsByAnchor[a.model]?.length || 0
    return (
      <EntryLink className="card anchor-card" to={routes.anchor.href({ model: a.model })}>
        <div className="card-head">
          <h2>
            <code>{a.model}</code>
          </h2>
          {a.equipment_free ? <span className="floor-badge">장비 불필요</span> : null}
        </div>
        <p className="anchor-label">{a.label}</p>
        <p className="req">{a.requires}</p>
        <div className="chips">
          <span className="chip">{`훈련법 ${sys}`}</span>
          <span className="chip">{`워크아웃 ${wk}`}</span>
        </div>
      </EntryLink>
    )
  }
}

export function SystemList() {
  return () => (
    <>
      <section className="intro">
        <p>
          러닝 훈련법 목록이다. 카드마다 <b>bet</b>(무엇에 걸었는지, 한 문장)·<b>실행 조건</b>·
          <b>근거 등급</b>이 먼저 나온다. 등급을 카드에 둔 이유는 간단하다: 여러 개를 훑다 보면 그냥
          다들 하는 것(관행)이 밝혀진 것(정설)처럼 보이기 쉽다.
        </p>
      </section>
      <div className="grid">
        {systems.map((s) => (
          <SystemCard system={s} key={s.id} />
        ))}
      </div>
    </>
  )
}

export function WorkoutList() {
  return () => (
    <>
      <section className="intro">
        <p>
          워크아웃을 하나씩 자세히 보는 곳이다. 각 행에는 <b>주장</b>(반증 가능한 한 문장)과 그
          주장을 <b>깨보는 방법</b>이 함께 있다. &ldquo;이걸 하면 몇 분 빨라진다&rdquo; 같은 수치는
          넣지 않았다 — 일부러.
        </p>
      </section>
      <div className="grid">
        {workouts.map((w) => (
          <WorkoutCard workout={w} key={w.id} />
        ))}
      </div>
    </>
  )
}

export function AnchorList() {
  return () => {
    const groups = ANCHOR_CONSTRUCTS.map((c) => ({
      c,
      items: anchors.filter((a) => a.construct === c.id),
    })).filter((g) => g.items.length)

    return (
      <>
        <section className="intro">
          <p>
            앵커는 &ldquo;얼마나 세게&rdquo;를 재는 방법이다. 모든 워크아웃과 훈련법이 여기에 매달려
            있다. 무엇을 읽는지(<b>구성개념</b>)로 묶어놨지만, 같은 걸 읽어도 서로 환산되지는 않는다
            — 심박 70%와 예비량 70%는 다른 bpm이다. 장비가 없으면 결국 <code>rpe_10</code> 하나로
            내려온다. 환산이 아니라 하강이다.
          </p>
        </section>
        {groups.map(({ c, items }) => (
          <section className="anchor-construct-group" key={c.id}>
            <h3 className="construct-h" title={c.note}>
              {c.label}
            </h3>
            <div className="grid">
              {items.map((a) => (
                <AnchorCard anchor={a} key={a.model} />
              ))}
            </div>
          </section>
        ))}
      </>
    )
  }
}

export function NotFound(handle: Handle<{ id: string }>) {
  return () => (
    <>
      <p className="empty">
        {'없음: '}
        <code>{handle.props.id}</code>
      </p>
      <EntryLink className="back" to={routes.home.href()}>
        ← 홈
      </EntryLink>
    </>
  )
}
