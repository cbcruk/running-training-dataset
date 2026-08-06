// The browse surfaces: the three lists, the search results, and not-found.
//
// The cards are shared between a list and the search results, which is exactly
// the duplication the template-literal version had to open-code twice.
import { TierBadge } from "./primitives.jsx";

// Tier goes on the card, never only in the detail view - the README's one hard UI
// rule, so browsing ten systems cannot make `tradition` look like `consensus`.
export function SystemCard({ ctx, system: s, brief = false }) {
  const { t, url, fmt } = ctx;
  const c = s.commitment || {};
  const chips = [
    fmt.sessions(c.sessions_per_week) && `${fmt.sessions(c.sessions_per_week)}/wk`,
    c.min_weekly_km && `≥${fmt.km(c.min_weekly_km)}`,
    fmt.weeks(c.plan_length_weeks),
    c.requires_track ? "track" : null,
  ].filter(Boolean);

  return (
    <a className="card sys-card" href={url(`system/${s.id}`)}>
      <div className="card-head">
        <h2>{s.name}</h2>
        <TierBadge ctx={ctx} tier={s.evidence?.tier} />
      </div>
      {!brief && <p className="attribution">{s.attribution || ""}</p>}
      <p className="bet">{t(s.bet)}</p>
      {!brief && (
        <div className="chips">
          {chips.map((x) => (
            <span className="chip" key={x}>
              {x}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

export function WorkoutCard({ ctx, workout: w, brief = false }) {
  const { t, lang, url } = ctx;
  return (
    <a className="card wk-card" href={url(`workout/${w.id}`)}>
      <div className="card-head">
        <h2>{w.canonical_name}</h2>
        <TierBadge ctx={ctx} tier={w.claim?.evidence?.tier} />
      </div>
      {!brief && (
        <p className="family">
          <code>{w.family}</code>
          {w.test?.detectable === false && (
            <>
              {" · "}
              <span className="undetectable">{lang === "ko" ? "관찰 불가" : "unobservable"}</span>
            </>
          )}
        </p>
      )}
      <p className="bet">{t(w.claim?.proposition)}</p>
    </a>
  );
}

export function AnchorCard({ ctx, anchor: a }) {
  const { t, lang, url, indexes } = ctx;
  const sys = indexes.systemsByAnchor[a.model]?.length || 0;
  const wk = indexes.workoutsByAnchor[a.model]?.length || 0;
  return (
    <a className="card anchor-card" href={url(`anchor/${a.model}`)}>
      <div className="card-head">
        <h2>
          <code>{a.model}</code>
        </h2>
        {a.equipment_free && (
          <span className="floor-badge">{lang === "ko" ? "장비 불필요" : "no equipment"}</span>
        )}
      </div>
      <p className="anchor-label">{t(a.label)}</p>
      <p className="req">{t(a.requires)}</p>
      <div className="chips">
        <span className="chip">{`${lang === "ko" ? "체계" : "systems"} ${sys}`}</span>
        <span className="chip">{`${lang === "ko" ? "워크아웃" : "workouts"} ${wk}`}</span>
      </div>
    </a>
  );
}

export function SystemList({ ctx }) {
  const { lang, systems } = ctx;
  return (
    <>
      <section className="intro">
        <p>
          {lang === "ko" ? (
            <>
              체계가 브라우징 단위다. 각 카드는 <b>bet</b>(한 문장 내기)과 <b>실행 조건</b>, 그리고{" "}
              <b>근거 등급</b>을 앞세운다. 등급이 카드에 있는 이유: 열 개를 훑어도 관행이 정설처럼
              보이지 않게.
            </>
          ) : (
            <>
              The system is the unit you browse. Each card leads with its <b>bet</b> (a one-sentence
              wager), its <b>commitment</b>, and its <b>evidence tier</b> — tier is on the card so
              browsing ten of them never makes tradition look like consensus.
            </>
          )}
        </p>
      </section>
      <div className="grid">
        {systems.map((s) => (
          <SystemCard ctx={ctx} system={s} key={s.id} />
        ))}
      </div>
    </>
  );
}

export function WorkoutList({ ctx }) {
  const { lang, workouts } = ctx;
  return (
    <>
      <section className="intro">
        <p>
          {lang === "ko" ? (
            <>
              워크아웃은 디테일 뷰다. 각 행은 <b>주장</b>(반증 가능한 한 문장)과 그것을{" "}
              <b>반증하는 절차</b>를 싣는다. 개선 수치는 없다 — 의도적으로.
            </>
          ) : (
            <>
              Workouts are the detail view. Each row carries a falsifiable <b>claim</b> and the{" "}
              <b>procedure that would falsify it</b>. No expected-improvement number, deliberately.
            </>
          )}
        </p>
      </section>
      <div className="grid">
        {workouts.map((w) => (
          <WorkoutCard ctx={ctx} workout={w} key={w.id} />
        ))}
      </div>
    </>
  );
}

export function AnchorList({ ctx }) {
  const { t, lang, anchors, constructs } = ctx;
  const groups = constructs
    .map((c) => ({ c, items: anchors.filter((a) => a.construct === c.id) }))
    .filter((g) => g.items.length);

  return (
    <>
      <section className="intro">
        <p>
          {lang === "ko" ? (
            <>
              앵커(강도 모델)는 모든 워크아웃·체계가 매달리는 축이다. 읽는 <b>구성개념</b>으로 묶여
              있지만, 같은 구성개념이라도 서로 변환되지 않는다. 장비가 없으면 결국{" "}
              <code>rpe_10</code> 하나로 떨어진다 — 변환이 아니라 하강.
            </>
          ) : (
            <>
              Anchors (intensity models) are the axis every workout and system hangs on. They are
              grouped by the <b>construct</b> they read, but sharing a construct does not make them
              interconvert. Without equipment they all drop to a single <code>rpe_10</code> — a
              descent, not a conversion.
            </>
          )}
        </p>
      </section>
      {groups.map(({ c, items }) => (
        <section className="anchor-construct-group" key={c.id}>
          <h3 className="construct-h" title={t(c.note)}>
            {t(c.label)}
          </h3>
          <div className="grid">
            {items.map((a) => (
              <AnchorCard ctx={ctx} anchor={a} key={a.model} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

// The naming-join headline: one colloquial term ("tempo run") resolving to more
// than one workout is the collision the dataset exists to make visible.
export function SearchResults({ ctx, rawQ }) {
  const { t, lang, url, systems, workouts, anchors, usage, byWorkout, bySystem } = ctx;
  const q = rawQ.trim().toLowerCase();

  const termHits = usage.filter(
    (u) =>
      u.calls_it.toLowerCase().includes(q) ||
      (u.also_known_as || []).some((a) => a.toLowerCase().includes(q)),
  );
  const termWorkouts = [...new Set(termHits.map((u) => u.workout))];

  const sysHits = systems.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.id.includes(q) ||
      (s.attribution || "").toLowerCase().includes(q) ||
      t(s.bet).toLowerCase().includes(q),
  );
  const wkHits = workouts.filter(
    (w) =>
      w.canonical_name.toLowerCase().includes(q) ||
      w.id.includes(q) ||
      w.family.toLowerCase().includes(q) ||
      t(w.claim?.proposition).toLowerCase().includes(q),
  );
  const anchorHits = anchors.filter(
    (a) =>
      a.model.toLowerCase().includes(q) ||
      a.construct.includes(q) ||
      t(a.label).toLowerCase().includes(q),
  );

  const empty = termWorkouts.length <= 1 && !sysHits.length && !wkHits.length && !anchorHits.length;
  if (empty) {
    return <p className="empty">{`${lang === "ko" ? "결과 없음" : "No results"}: “${rawQ}”`}</p>;
  }

  return (
    <>
      {termWorkouts.length > 1 && (
        <div className="collision-banner">
          <b>{`“${rawQ}”`}</b>{" "}
          {lang === "ko"
            ? `는 서로 다른 워크아웃 ${termWorkouts.length}개를 가리킨다 — 이름은 필드가 아니라 조인이다.`
            : `maps to ${termWorkouts.length} different workouts — naming is a join, not a field.`}
          <div className="collision-list">
            {termWorkouts.map((id) => (
              <a href={url(`workout/${id}`)} className="collision-item" key={id}>
                <b>{byWorkout[id]?.canonical_name || id}</b>
                <span>
                  {termHits
                    .filter((u) => u.workout === id)
                    .map((u) => (u.system ? bySystem[u.system]?.name || u.system : "—"))
                    .join(", ")}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {sysHits.length > 0 && (
        <>
          <h3 className="search-h">{lang === "ko" ? "체계" : "Systems"}</h3>
          <div className="grid">
            {sysHits.map((s) => (
              <SystemCard ctx={ctx} system={s} brief key={s.id} />
            ))}
          </div>
        </>
      )}

      {wkHits.length > 0 && (
        <>
          <h3 className="search-h">{lang === "ko" ? "워크아웃" : "Workouts"}</h3>
          <div className="grid">
            {wkHits.map((w) => (
              <WorkoutCard ctx={ctx} workout={w} brief key={w.id} />
            ))}
          </div>
        </>
      )}

      {anchorHits.length > 0 && (
        <>
          <h3 className="search-h">{lang === "ko" ? "앵커" : "Anchors"}</h3>
          <div className="grid">
            {anchorHits.map((a) => (
              <AnchorCard ctx={ctx} anchor={a} key={a.model} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function NotFound({ ctx, id }) {
  const { lang, url } = ctx;
  return (
    <>
      <p className="empty">
        {`${lang === "ko" ? "없음" : "Not found"}: `}
        <code>{id}</code>
      </p>
      <a className="back" href={url("")}>
        ← {lang === "ko" ? "홈" : "home"}
      </a>
    </>
  );
}
