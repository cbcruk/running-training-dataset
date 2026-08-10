/**
 * 브라우즈 표면. 목록 셋, 검색 결과, 그리고 not-found.
 *
 * 카드는 목록과 검색 결과가 공유한다. 템플릿 리터럴 판본이 두 번 펼쳐 써야 했던 바로 그
 * 중복이다.
 */
import { EntryLink, ProvenanceBadge, TierBadge } from './primitives.tsx'
import type { Anchor, System, Workout } from '../types/index.d.ts'
import type { WithCtx } from '../types/view.ts'

/**
 * 등급은 카드에 올라간다. 상세 뷰에만 두는 일은 없다 — README의 유일한 강한 UI 규칙이고,
 * 그래야 훈련법 열 개를 훑어도 `tradition`이 `consensus`처럼 보이지 않는다. 출처 상태가
 * 그 옆에 붙는 이유도 같다. 대부분의 행에 기록된 source가 없고, 빈칸은 브라우징 중에
 * 문서화되지 않은 행을 문서화된 행과 구별할 수 없게 만들었다. 두 엔티티가 모두 이 쌍을
 * 달고 있으므로, 읽는 사람은 자기가 어떤 종류의 카드를 보는지 몰라도 배지를 읽을 수 있다.
 */
export function SystemCard({
  ctx,
  system: s,
  brief = false,
}: WithCtx & { system: System; brief?: boolean }) {
  const { fmt } = ctx
  const c = s.commitment || {}
  const chips = [
    fmt.sessions(c.sessions_per_week) && `${fmt.sessions(c.sessions_per_week)}/wk`,
    c.min_weekly_km && `≥${fmt.km(c.min_weekly_km)}`,
    fmt.weeks(c.plan_length_weeks),
    c.requires_track ? 'track' : null,
  ].filter(Boolean)

  return (
    <EntryLink className="card sys-card" to={`system/${s.id}`}>
      <div className="card-head">
        <h2>{s.name}</h2>
        <span className="badges">
          <TierBadge tier={s.evidence?.tier} />
          <ProvenanceBadge provenance={s.provenance} />
        </span>
      </div>
      {!brief && <p className="attribution">{s.attribution || ''}</p>}
      <p className="bet">{s.bet}</p>
      {!brief && (
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

export function WorkoutCard({ workout: w, brief = false }: { workout: Workout; brief?: boolean }) {
  return (
    <EntryLink className="card wk-card" to={`workout/${w.id}`}>
      <div className="card-head">
        <h2>{w.canonical_name}</h2>
        <span className="badges">
          <TierBadge tier={w.claim?.evidence?.tier} />
          <ProvenanceBadge provenance={w.provenance} />
        </span>
      </div>
      {!brief && (
        <p className="family">
          <code>{w.family}</code>
          {w.test?.detectable === false && (
            <>
              {' · '}
              <span className="undetectable">{'관찰 불가'}</span>
            </>
          )}
        </p>
      )}
      <p className="bet">{w.claim?.proposition}</p>
    </EntryLink>
  )
}

export function AnchorCard({ ctx, anchor: a }: WithCtx & { anchor: Anchor }) {
  const { indexes } = ctx
  const sys = indexes.systemsByAnchor[a.model]?.length || 0
  const wk = indexes.workoutsByAnchor[a.model]?.length || 0
  return (
    <EntryLink className="card anchor-card" to={`anchor/${a.model}`}>
      <div className="card-head">
        <h2>
          <code>{a.model}</code>
        </h2>
        {a.equipment_free && <span className="floor-badge">{'장비 불필요'}</span>}
      </div>
      <p className="anchor-label">{a.label}</p>
      <p className="req">{a.requires}</p>
      <div className="chips">
        <span className="chip">{`${'훈련법'} ${sys}`}</span>
        <span className="chip">{`${'워크아웃'} ${wk}`}</span>
      </div>
    </EntryLink>
  )
}

export function SystemList({ ctx }: WithCtx) {
  const { systems } = ctx
  return (
    <>
      <section className="intro">
        <p>
          러닝 훈련법 목록이다. 카드마다 <b>bet</b>(무엇에 걸었는지, 한 문장)·
          <b>실행 조건</b>·<b>근거 등급</b>이 먼저 나온다. 등급을 카드에 둔 이유는 간단하다: 여러
          개를 훑다 보면 그냥 다들 하는 것(관행)이 밝혀진 것(정설)처럼 보이기 쉽다.
        </p>
      </section>
      <div className="grid">
        {systems.map((s) => (
          <SystemCard ctx={ctx} system={s} key={s.id} />
        ))}
      </div>
    </>
  )
}

export function WorkoutList({ ctx }: WithCtx) {
  const { workouts } = ctx
  return (
    <>
      <section className="intro">
        <p>
          <>
            워크아웃을 하나씩 자세히 보는 곳이다. 각 행에는 <b>주장</b>(반증 가능한 한 문장)과 그
            주장을 <b>깨보는 방법</b>이 함께 있다. &ldquo;이걸 하면 몇 분 빨라진다&rdquo; 같은
            수치는 넣지 않았다 — 일부러.
          </>
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

export function AnchorList({ ctx }: WithCtx) {
  const { anchors, constructs } = ctx
  const groups = constructs
    .map((c) => ({ c, items: anchors.filter((a) => a.construct === c.id) }))
    .filter((g) => g.items.length)

  return (
    <>
      <section className="intro">
        <p>
          <>
            앵커는 &ldquo;얼마나 세게&rdquo;를 재는 방법이다. 모든 워크아웃과 훈련법이 여기에 매달려
            있다. 무엇을 읽는지(<b>구성개념</b>)로 묶어놨지만, 같은 걸 읽어도 서로 환산되지는 않는다
            — 심박 70%와 예비량 70%는 다른 bpm이다. 장비가 없으면 결국 <code>rpe_10</code> 하나로
            내려온다. 환산이 아니라 하강이다.
          </>
        </p>
      </section>
      {groups.map(({ c, items }) => (
        <section className="anchor-construct-group" key={c.id}>
          <h3 className="construct-h" title={c.note}>
            {c.label}
          </h3>
          <div className="grid">
            {items.map((a) => (
              <AnchorCard ctx={ctx} anchor={a} key={a.model} />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

/**
 * 네이밍 조인의 헤드라인. 통칭 하나("tempo run")가 둘 이상의 워크아웃으로 풀리는 것이,
 * 이 데이터셋이 보이게 만들려고 존재하는 충돌이다.
 */
export function SearchResults({ ctx, rawQ }: WithCtx & { rawQ: string }) {
  const { systems, workouts, anchors, usage, byWorkout, bySystem } = ctx
  const q = rawQ.trim().toLowerCase()

  const termHits = usage.filter(
    (u) =>
      u.calls_it.toLowerCase().includes(q) ||
      (u.also_known_as || []).some((a: string) => a.toLowerCase().includes(q)),
  )
  const termWorkouts = [...new Set(termHits.map((u) => u.workout))]

  const sysHits = systems.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.id.includes(q) ||
      (s.attribution || '').toLowerCase().includes(q) ||
      s.bet.toLowerCase().includes(q),
  )
  const wkHits = workouts.filter(
    (w) =>
      w.canonical_name.toLowerCase().includes(q) ||
      w.id.includes(q) ||
      w.family.toLowerCase().includes(q) ||
      w.claim?.proposition.toLowerCase().includes(q),
  )
  const anchorHits = anchors.filter(
    (a) =>
      a.model.toLowerCase().includes(q) ||
      a.construct.includes(q) ||
      a.label.toLowerCase().includes(q),
  )

  const empty = termWorkouts.length <= 1 && !sysHits.length && !wkHits.length && !anchorHits.length
  if (empty) {
    return <p className="empty">{`${'결과 없음'}: “${rawQ}”`}</p>
  }

  return (
    <>
      {termWorkouts.length > 1 && (
        <div className="collision-banner">
          <b>{`“${rawQ}”`}</b>{' '}
          {`는 서로 다른 워크아웃 ${termWorkouts.length}개를 가리킨다 — 이름은 필드가 아니라 조인이다.`}
          <div className="collision-list">
            {termWorkouts.map((id: string) => (
              <EntryLink to={`workout/${id}`} className="collision-item" key={id}>
                <b>{byWorkout[id]?.canonical_name || id}</b>
                <span>
                  {termHits
                    .filter((u) => u.workout === id)
                    .map((u) => (u.system ? bySystem[u.system]?.name || u.system : '—'))
                    .join(', ')}
                </span>
              </EntryLink>
            ))}
          </div>
        </div>
      )}

      {sysHits.length > 0 && (
        <>
          <h3 className="search-h">{'훈련법'}</h3>
          <div className="grid">
            {sysHits.map((s) => (
              <SystemCard ctx={ctx} system={s} brief key={s.id} />
            ))}
          </div>
        </>
      )}

      {wkHits.length > 0 && (
        <>
          <h3 className="search-h">{'워크아웃'}</h3>
          <div className="grid">
            {wkHits.map((w) => (
              <WorkoutCard workout={w} brief key={w.id} />
            ))}
          </div>
        </>
      )}

      {anchorHits.length > 0 && (
        <>
          <h3 className="search-h">{'앵커'}</h3>
          <div className="grid">
            {anchorHits.map((a: Anchor) => (
              <AnchorCard ctx={ctx} anchor={a} key={a.model} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

export function NotFound({ id }: { id: string }) {
  return (
    <>
      <p className="empty">
        {`${'없음'}: `}
        <code>{id}</code>
      </p>
      <EntryLink className="back" to="">
        ← {'홈'}
      </EntryLink>
    </>
  )
}
