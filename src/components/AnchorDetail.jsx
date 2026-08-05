// The anchor entry, as components.
//
// Spike for the component-model migration. Two things to notice against the
// template-literal original in views.mjs:
//
//   1. No esc(). JSX escapes text children and attribute values itself, so the
//      manual-escaping footgun - one forgotten call is a hole - is gone
//      structurally rather than by discipline.
//   2. The page reads as its sections. `descent`, `siblings`, `sysHtml`,
//      `wkHtml`, `switchHtml` were locals holding HTML strings; they are now
//      components that either render or return null.
//
// The hard constraint from ADR 0001 still holds: these render to a string in
// Node via preact-render-to-string, so the prerenderer and the browser keep
// producing the same markup from one source.
import { Block, Chip, TierBadge, WChip } from "./primitives.jsx";

export function AnchorDetail({ ctx, model }) {
  const { t, lang, url, byAnchor, anchors, bySystem, constructs, indexes } = ctx;
  const a = byAnchor[model];
  if (!a) return null;

  const sys = indexes.systemsByAnchor[model] || [];
  const wk = indexes.workoutsByAnchor[model] || [];
  const switches = indexes.switchesByAnchor[model] || [];
  const siblings = anchors.filter((x) => x.construct === a.construct && x.model !== model);
  const construct = constructs.find((c) => c.id === a.construct);

  return (
    <>
      <a class="back" href={url("anchors")}>
        ← {lang === "ko" ? "앵커 목록" : "anchors"}
      </a>
      <article class="detail">
        <div class="detail-head">
          <h1>
            <code>{a.model}</code>
          </h1>
          {a.equipment_free && (
            <span class="floor-badge">{lang === "ko" ? "장비 불필요" : "no equipment"}</span>
          )}
        </div>
        <p class="bet big">{t(a.label)}</p>
        <div class="chips">
          <Chip title={t(construct?.note)}>{t(construct?.label)}</Chip>
        </div>

        <Block title={lang === "ko" ? "무엇을 읽나" : "What it reads"}>
          <p>{t(construct?.note)}</p>
        </Block>

        <Block title={lang === "ko" ? "측정 요건" : "Requirements"}>
          <p>{t(a.requires)}</p>
        </Block>

        <Descent ctx={ctx} anchor={a} />
        <Siblings ctx={ctx} siblings={siblings} />
        <AnchoredSystems ctx={ctx} systems={sys} />
        <UsingWorkouts ctx={ctx} workouts={wk} />
        <InSwitches ctx={ctx} switches={switches} bySystem={bySystem} />
      </article>
    </>
  );
}

// rpe_10 carries `note` (why it is the floor); every other anchor carries
// `fallback` (what you lose when the equipment is gone).
function Descent({ ctx, anchor }) {
  const { t, lang } = ctx;
  if (anchor.equipment_free) {
    if (!anchor.note) return null;
    return (
      <Block title={lang === "ko" ? "왜 바닥인가" : "Why it is the floor"}>
        <p>{t(anchor.note)}</p>
      </Block>
    );
  }
  if (!anchor.fallback) return null;
  return (
    <Block class="fallback-block" title={lang === "ko" ? "장비가 없으면" : "Without the equipment"}>
      <p>{t(anchor.fallback)}</p>
    </Block>
  );
}

function Siblings({ ctx, siblings }) {
  const { lang, url } = ctx;
  if (!siblings.length) return null;
  return (
    <Block
      title={lang === "ko" ? "같은 구성개념" : "Same construct"}
      sub={
        lang === "ko"
          ? "같은 것을 읽지만 서로 변환되지 않는다."
          : "They read the same thing but do not interconvert."
      }
    >
      <div class="anchor-siblings">
        {siblings.map((s) => (
          <WChip key={s.model} href={url(`anchor/${s.model}`)}>
            {s.model}
          </WChip>
        ))}
      </div>
    </Block>
  );
}

function AnchoredSystems({ ctx, systems }) {
  const { t, lang, url } = ctx;
  if (!systems.length) return null;
  return (
    <Block title={lang === "ko" ? "이 앵커를 쓰는 체계" : "Systems anchored on it"}>
      <div class="grid">
        {systems.map((s) => (
          <a key={s.id} class="card sys-card" href={url(`system/${s.id}`)}>
            <div class="card-head">
              <h2>{s.name}</h2>
              <TierBadge ctx={ctx} tier={s.evidence?.tier} />
            </div>
            <p class="bet">{t(s.bet)}</p>
          </a>
        ))}
      </div>
    </Block>
  );
}

function UsingWorkouts({ ctx, workouts }) {
  const { lang, url } = ctx;
  if (!workouts.length) return null;
  return (
    <Block title={lang === "ko" ? "이 앵커를 쓰는 워크아웃" : "Workouts using it"}>
      <div class="anchor-workouts">
        {workouts.map(({ w, primary }) => (
          <WChip key={w.id} href={url(`workout/${w.id}`)}>
            {w.canonical_name}
            {primary && (
              <>
                {" "}
                <span class="primary-flag">{lang === "ko" ? "주앵커" : "primary"}</span>
              </>
            )}
          </WChip>
        ))}
      </div>
    </Block>
  );
}

function InSwitches({ ctx, switches, bySystem }) {
  const { t, lang, url } = ctx;
  if (!switches.length) return null;
  return (
    <Block
      title={lang === "ko" ? "전환에서의 이 앵커" : "This anchor in switches"}
      sub={
        lang === "ko"
          ? "이 앵커가 나가거나 들어오는 체계 전환. 조용함은 용어는 살아남고 뜻만 바뀌는 위험한 경우."
          : "System switches where this anchor leaves or arrives. Silent = the term survives while its meaning changes — the dangerous case."
      }
    >
      <div class="switch-list">
        {switches.map((x, i) => (
          <div class="switch" key={`${x.from}-${x.to}-${i}`}>
            <div class="switch-head">
              <span class="switch-from">
                <a href={url(`system/${x.from}`)}>{bySystem[x.from]?.name || x.from}</a> →{" "}
                <a href={url(`system/${x.to}`)}>{bySystem[x.to]?.name || x.to}</a>
              </span>
              <span class={`switch-flag ${x.side === "in" ? "in" : "out"}`}>
                {x.side === "in" ? (lang === "ko" ? "유입" : "in") : lang === "ko" ? "유출" : "out"}
              </span>
              <span class={`switch-flag ${x.silent ? "silent" : "loud"}`}>
                {x.silent
                  ? lang === "ko"
                    ? "조용함"
                    : "silent"
                  : lang === "ko"
                    ? "드러남"
                    : "overt"}
              </span>
            </div>
            <p>{t(x.note)}</p>
          </div>
        ))}
      </div>
    </Block>
  );
}
