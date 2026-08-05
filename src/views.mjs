// Browse layer for the running-training-dataset.
// Epistemics live in the JSON; this file is convenience only. The one hard rule
// it must honour (README "Known open problems"): the evidence tier goes on the
// browse card, not buried in the detail view — so browsing ten systems can never
// make a `tradition` system look as settled as a `consensus` one.
import systems from "../data/systems.json" with { type: "json" };
import workouts from "../data/workouts.json" with { type: "json" };
import usage from "../data/usage.json" with { type: "json" };
import anchors from "../data/anchors.json" with { type: "json" };
import adaptations from "../data/adaptations.json" with { type: "json" };
import { renderWorkout } from "../scripts/svg.mjs";

const byWorkout = Object.fromEntries(workouts.map((w) => [w.id, w]));
const bySystem = Object.fromEntries(systems.map((s) => [s.id, s]));
const byAnchor = Object.fromEntries(anchors.map((a) => [a.model, a]));
const byAdaptation = Object.fromEntries(adaptations.map((a) => [a.id, a]));

// Reverse indexes so an anchor page can show everything that references it:
// which systems anchor on it, which workouts list it (and where it is primary),
// and every switching_cost whose anchor_change touches it on either side.
const systemsByAnchor = {};
for (const s of systems) (systemsByAnchor[s.intensity_model] ??= []).push(s);
const workoutsByAnchor = {};
for (const w of workouts)
  for (const a of w.intensity.anchors)
    (workoutsByAnchor[a.model] ??= []).push({
      w,
      primary: w.intensity.primary_anchor === a.model,
    });
const switchesByAnchor = {};
for (const s of systems)
  for (const x of s.switching_cost || []) {
    const [from, to] = (x.anchor_change || "").split("->").map((v) => v.trim());
    const entry = { to: s.id, from: x.from, silent: x.silent, note: x.note, from_anchor: from };
    for (const m of new Set([from, to]))
      if (byAnchor[m])
        (switchesByAnchor[m] ??= []).push({ ...entry, side: m === to ? "in" : "out" });
  }

// Anchor constructs: the physical quantity each anchor reads. Grouping shows the
// axes; the notes state that sharing a construct does NOT make anchors convert.
const ANCHOR_CONSTRUCTS = [
  {
    id: "perception",
    label: { ko: "지각", en: "Perception" },
    note: {
      ko: "장비 없는 주관 축 — 유일한 보편 교환 축.",
      en: "The subjective, no-equipment axis - the only universal exchange axis.",
    },
  },
  {
    id: "pace",
    label: { ko: "페이스(속도)", en: "Pace (velocity)" },
    note: {
      ko: "같은 속도를 읽어도 서로 변환되지 않는다: VDOT는 측정된 피트니스, 목표 페이스는 희망.",
      en: "Reads velocity, but they do not interconvert: VDOT is measured fitness, goal pace is a wish.",
    },
  },
  {
    id: "heart-rate",
    label: { ko: "심박수", en: "Heart rate" },
    note: {
      ko: "같은 '70%'라도 최대(HRmax)와 예비량(HRR) 기준이면 다른 bpm이다.",
      en: "The same '70%' means different bpm under max (HRmax) vs reserve (HRR).",
    },
  },
  {
    id: "metabolic",
    label: { ko: "대사 측정", en: "Metabolic assay" },
    note: {
      ko: "실험실·측정기 필요. VO2와 젖산은 서로 다른 생리 축이다.",
      en: "Needs a lab or meter. VO2 and lactate are different physiological axes.",
    },
  },
];

// Fixed display order for the adaptation taxonomy's coarse categories.
const ADAPT_CATEGORIES = [
  { id: "central-cardiovascular", label: { ko: "중심 심혈관", en: "Central cardiovascular" } },
  { id: "peripheral-aerobic", label: { ko: "말초 유산소", en: "Peripheral aerobic" } },
  { id: "metabolic", label: { ko: "대사", en: "Metabolic" } },
  { id: "neuromuscular", label: { ko: "신경근", en: "Neuromuscular" } },
  { id: "structural", label: { ko: "구조·내구", en: "Structural" } },
  { id: "skill", label: { ko: "기술", en: "Skill" } },
];

// ---- language / base --------------------------------------------------------
// Module state, set by whichever host is driving: the browser shell (main.js) or
// the prerenderer (scripts/prerender.mjs). Rendering one language at a time keeps
// every view function below unchanged from when they lived in the browser.
let lang = "ko";
let BASE = "/";

export function setLang(next) {
  lang = next;
}
export function setBase(next) {
  BASE = next.endsWith("/") ? next : next + "/";
}
export function currentLang() {
  return lang;
}

// bilingual field -> current-language string, falling back to the other language.
function t(obj) {
  if (obj == null) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] || obj.en || obj.ko || "";
}

export const PLACEHOLDER = {
  ko: '검색: "tempo run", daniels, easy…',
  en: 'search: "tempo run", daniels, easy…',
};

// ---- html helpers -----------------------------------------------------------
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// Tier is deliberately given distinct visual weight: consensus reads as settled,
// tradition reads as unproven. Flattening these is the exact failure the README bans.
const TIER_LABEL = {
  consensus: { ko: "정설", en: "consensus" },
  plausible: { ko: "유력", en: "plausible" },
  tradition: { ko: "관행", en: "tradition" },
};
function tierBadge(tier) {
  if (!tier) return "";
  const l = TIER_LABEL[tier] || { ko: tier, en: tier };
  return `<span class="tier tier-${tier}" title="evidence tier: ${tier}">${esc(t(l))}</span>`;
}

// A raw intensity_model / anchor.model code, made hoverable: the tooltip pulls
// label + construct + what-it-takes-to-measure from anchors.json so a slug like
// "lactate_mmol" explains itself in place.
const CONSTRUCT_LABEL = Object.fromEntries(ANCHOR_CONSTRUCTS.map((c) => [c.id, c.label]));
function anchorCode(model) {
  const a = byAnchor[model];
  if (!a) return `<code>${esc(model)}</code>`;
  const tip = [t(a.label), t(CONSTRUCT_LABEL[a.construct]), t(a.requires)]
    .filter(Boolean)
    .join(" · ");
  return `<a class="anchor-code" href="${BASE}anchor/${esc(model)}" title="${esc(tip)}"><code>${esc(model)}</code></a>`;
}

// A commitment chip that explains its dimension on hover - the terse
// "9-13x/wk" / "≥120km" say what, the tooltip says what it means.
function infoChip(text, tip) {
  return `<span class="chip chip-info" title="${esc(t(tip))}">${esc(text)}</span>`;
}
const COMMIT_TIPS = {
  sessions: {
    ko: "주당 훈련 세션 수 — 이 체계를 실행하는 데 필요한 주간 빈도다. 더블(하루 2회)이면 세션 수가 훈련일 수보다 많다.",
    en: "Training sessions per week - the frequency the system needs. With doubles (twice a day) the session count exceeds the number of training days.",
  },
  volume: {
    ko: "권장 최소 주간 주행거리(km). 이 밑으로 내려가면 체계의 전제가 약해진다.",
    en: "Minimum recommended weekly volume (km). Below this the system's premise weakens.",
  },
  weeks: {
    ko: "권장 계획 길이(주).",
    en: "Recommended plan length, in weeks.",
  },
  track: {
    ko: "트랙이 필요한지 여부. 필요하면 정밀한 반복 구간 측정을 위해서다.",
    en: "Whether a track is required - if so, for precise interval measurement.",
  },
};

const KM = (n) => (n == null ? "" : `${n}km`);
function sessionsText(sp) {
  if (!sp) return "";
  if (sp.value != null) return `${sp.value}×`;
  return `${sp.min}–${sp.max}×`;
}
function weeksText(pl) {
  if (!pl) return "";
  if (pl.value != null) return `${pl.value}w`;
  return `${pl.min}–${pl.max}w`;
}

// ---- routing ----------------------------------------------------------------
// Paths are base-relative and base-stripped by the caller: "/", "/workouts",
// "/anchor/rpe_10". Every view function returns an HTML string, so the same call
// serves the browser (assigned to #app) and the prerenderer (written to a file).
export function currentView(path) {
  const p = path || "/";
  if (p.startsWith("/anchor")) return "anchors";
  if (p.startsWith("/workout")) return "workouts";
  if (p.startsWith("/system")) return "systems";
  return "systems";
}

export function renderPath(path, q = "") {
  const parts = (path || "/").split("/").filter(Boolean);
  if (q) return renderSearch(q);
  if (parts[0] === "anchors") return renderAnchorList();
  if (parts[0] === "anchor" && parts[1]) return renderAnchorDetail(parts[1]);
  if (parts[0] === "workouts") return renderWorkoutList();
  if (parts[0] === "workout" && parts[1]) return renderWorkoutDetail(parts[1]);
  if (parts[0] === "system" && parts[1]) return renderSystemDetail(parts[1]);
  return renderSystemList();
}

// Per-entry <title> and description. This is the half of the dictionary that hash
// routing could never serve: a crawler or link preview reads only these.
const SITE = "Running Training Dataset";
export function metaFor(path) {
  const parts = (path || "/").split("/").filter(Boolean);
  const clip = (s, n = 155) => {
    const v = String(s || "")
      .replace(/\s+/g, " ")
      .trim();
    return v.length > n ? v.slice(0, n - 1).trimEnd() + "…" : v;
  };
  if (parts[0] === "anchors")
    return {
      title: `${lang === "ko" ? "앵커" : "Anchors"} · ${SITE}`,
      description: clip(
        lang === "ko"
          ? "강도 앵커 8종을 측정 구성개념(지각·페이스·심박·대사)별로 정리. 같은 구성개념이라도 서로 변환되지 않는다."
          : "The 8 intensity anchors, grouped by the construct they read (perception, pace, heart rate, metabolic). Sharing a construct does not make them interconvert.",
      ),
    };
  if (parts[0] === "anchor" && byAnchor[parts[1]]) {
    const a = byAnchor[parts[1]];
    return {
      title: `${a.model} · ${SITE}`,
      description: clip(`${t(a.label)} — ${t(a.requires)}`),
    };
  }
  if (parts[0] === "workouts")
    return {
      title: `${lang === "ko" ? "워크아웃" : "Workouts"} · ${SITE}`,
      description: clip(
        lang === "ko"
          ? "각 워크아웃은 반증 가능한 주장과 그것을 반증하는 절차를 싣는다. 개선 수치는 없다 — 의도적으로."
          : "Each workout carries a falsifiable claim and the procedure that would falsify it. No expected-improvement number, deliberately.",
      ),
    };
  if (parts[0] === "workout" && byWorkout[parts[1]]) {
    const w = byWorkout[parts[1]];
    return {
      title: `${w.canonical_name} · ${SITE}`,
      description: clip(t(w.claim?.proposition)),
    };
  }
  if (parts[0] === "system" && bySystem[parts[1]]) {
    const s = bySystem[parts[1]];
    return { title: `${s.name} · ${SITE}`, description: clip(t(s.bet)) };
  }
  return {
    title: SITE,
    description: clip(
      lang === "ko"
        ? "러닝 훈련 체계 카탈로그. 각 체계가 무엇에 베팅하는지, 실행 비용은 얼마인지, 실제로 알려진 것은 어디까지인지. 모든 행은 draft다."
        : "A browsable catalog of running training systems: what each bets, what it costs to run, and how much is actually known. Every row is draft.",
    ),
  };
}

// Every route the prerenderer emits - one file per dictionary entry.
export function allRoutes() {
  return [
    "/",
    "/workouts",
    "/anchors",
    ...systems.map((s) => `/system/${s.id}`),
    ...workouts.map((w) => `/workout/${w.id}`),
    ...anchors.map((a) => `/anchor/${a.model}`),
  ];
}

// ---- system list (the browse entry point) -----------------------------------
function renderSystemList() {
  const cards = systems
    .map((s) => {
      const c = s.commitment || {};
      const chips = [
        sessionsText(c.sessions_per_week) && `${sessionsText(c.sessions_per_week)}/wk`,
        c.min_weekly_km && `≥${KM(c.min_weekly_km)}`,
        weeksText(c.plan_length_weeks),
        c.requires_track ? "track" : null,
      ].filter(Boolean);
      return `
      <a class="card sys-card" href="${BASE}system/${esc(s.id)}">
        <div class="card-head">
          <h2>${esc(s.name)}</h2>
          ${tierBadge(s.evidence?.tier)}
        </div>
        <p class="attribution">${esc(s.attribution || "")}</p>
        <p class="bet">${esc(t(s.bet))}</p>
        <div class="chips">${chips.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div>
      </a>`;
    })
    .join("");
  return `
    <section class="intro">
      <p>${
        lang === "ko"
          ? "체계가 브라우징 단위다. 각 카드는 <b>bet</b>(한 문장 내기)과 <b>실행 조건</b>, 그리고 <b>근거 등급</b>을 앞세운다. 등급이 카드에 있는 이유: 열 개를 훑어도 관행이 정설처럼 보이지 않게."
          : "The system is the unit you browse. Each card leads with its <b>bet</b> (a one-sentence wager), its <b>commitment</b>, and its <b>evidence tier</b> — tier is on the card so browsing ten of them never makes tradition look like consensus."
      }</p>
    </section>
    <div class="grid">${cards}</div>`;
}

// ---- system detail ----------------------------------------------------------
function workoutChip(id) {
  const w = byWorkout[id];
  const label = w ? w.canonical_name : id;
  return `<a class="wchip" href="${BASE}workout/${esc(id)}">${esc(label)}</a>`;
}

function renderSystemDetail(id) {
  const s = bySystem[id];
  if (!s) return notFound(id);

  const sc = (s.switching_cost || [])
    .map((x) => {
      const fromName = bySystem[x.from]?.name || x.from;
      return `
      <div class="switch">
        <div class="switch-head">
          <span class="switch-from">${
            lang === "ko" ? "전환 출발" : "coming from"
          }: <a href="${BASE}system/${esc(x.from)}">${esc(fromName)}</a></span>
          <span class="switch-flag ${x.silent ? "silent" : "loud"}">${
            x.silent ? (lang === "ko" ? "조용함" : "silent") : lang === "ko" ? "드러남" : "overt"
          }</span>
        </div>
        <code class="anchor">${esc(x.anchor_change)}</code>
        <p>${esc(t(x.note))}</p>
      </div>`;
    })
    .join("");

  const phases = (s.phases || [])
    .map(
      (p) => `
      <div class="phase">
        <span class="phase-name">${esc(p.name)}</span>
        <div class="wchips">${(p.emphasis || []).map(workoutChip).join("")}</div>
      </div>`,
    )
    .join("");

  const caps = (s.volume_caps || [])
    .map(
      (v) => `
      <tr>
        <td><code>${esc(v.zone)}</code></td>
        <td>${esc(t(v.rule))}</td>
        <td>${tierBadge(v.evidence?.tier)}</td>
      </tr>`,
    )
    .join("");

  const dist = s.distribution;
  const distZones = dist?.zones
    ? `<ul class="zones">${dist.zones
        .map((z) => `<li><span>${esc(z.label)}</span><b>${z.pct_sessions}%</b></li>`)
        .join("")}</ul>`
    : "";

  const caveats = (s.caveats || []).map((c) => `<li>${esc(t(c))}</li>`).join("");

  const c = s.commitment || {};
  return `
    <a class="back" href="${BASE}">← ${lang === "ko" ? "체계 목록" : "systems"}</a>
    <article class="detail">
      <div class="detail-head">
        <div>
          <h1>${esc(s.name)}</h1>
          <p class="attribution">${s.attribution ? `${esc(s.attribution)} · ` : ""}${anchorCode(s.intensity_model)}</p>
        </div>
        ${tierBadge(s.evidence?.tier)}
      </div>
      <p class="bet big">${esc(t(s.bet))}</p>

      <section class="block">
        <h3>${lang === "ko" ? "철학" : "Philosophy"}</h3>
        <p>${esc(t(s.philosophy))}</p>
      </section>

      <section class="block">
        <h3>${lang === "ko" ? "실행 조건" : "Commitment"}</h3>
        <div class="chips">
          ${sessionsText(c.sessions_per_week) ? infoChip(`${sessionsText(c.sessions_per_week)}/wk`, COMMIT_TIPS.sessions) : ""}
          ${c.min_weekly_km ? infoChip(`≥ ${KM(c.min_weekly_km)}`, COMMIT_TIPS.volume) : ""}
          ${weeksText(c.plan_length_weeks) ? infoChip(weeksText(c.plan_length_weeks), COMMIT_TIPS.weeks) : ""}
          ${
            c.requires_track != null
              ? infoChip(
                  c.requires_track
                    ? lang === "ko"
                      ? "트랙 필요"
                      : "track"
                    : lang === "ko"
                      ? "트랙 불필요"
                      : "no track",
                  COMMIT_TIPS.track,
                )
              : ""
          }
        </div>
        ${c.note ? `<p class="note">${esc(t(c.note))}</p>` : ""}
      </section>

      ${measurementBlock([s.intensity_model], { fallbackFor: s.intensity_model })}

      ${
        sc
          ? `<section class="block">
        <h3>${lang === "ko" ? "전환 비용" : "Switching cost"}</h3>
        <p class="sub">${
          lang === "ko"
            ? "다른 체계에서 넘어올 때 강도 앵커가 조용히 바뀐다. anchor_change는 intensity_model에서 유도돼 기계 검증된다."
            : "Switching silently swaps your intensity anchor. anchor_change is derived from intensity_model, so it is machine-verified."
        }</p>
        ${sc}
      </section>`
          : ""
      }

      ${
        dist
          ? `<section class="block">
        <h3>${lang === "ko" ? "강도 분포" : "Distribution"}</h3>
        <p><code>${esc(dist.model)}</code> ${tierBadge(dist.evidence?.tier)}</p>
        ${distZones}
      </section>`
          : ""
      }

      ${
        phases
          ? `<section class="block">
        <h3>${lang === "ko" ? "주기별 강조 워크아웃" : "Phase emphasis"}</h3>
        <div class="phases">${phases}</div>
      </section>`
          : ""
      }

      ${
        caps
          ? `<section class="block">
        <h3>${lang === "ko" ? "볼륨 캡" : "Volume caps"}</h3>
        <table class="caps"><thead><tr><th>zone</th><th>${lang === "ko" ? "규칙" : "rule"}</th><th>tier</th></tr></thead><tbody>${caps}</tbody></table>
      </section>`
          : ""
      }

      ${
        caveats
          ? `<section class="block caveats">
        <h3>${lang === "ko" ? "주의" : "Caveats"}</h3>
        <ul>${caveats}</ul>
      </section>`
          : ""
      }
    </article>`;
}

// ---- anchor (measurement model) list ----------------------------------------
// Anchors are first-class: the axis every workout and system is pinned to. The
// list groups them by construct so the "same construct != interconvertible"
// point is visible at a glance, and each card counts its real references.
function anchorCard(a) {
  const sys = systemsByAnchor[a.model]?.length || 0;
  const wk = workoutsByAnchor[a.model]?.length || 0;
  const floor = a.equipment_free
    ? `<span class="floor-badge">${lang === "ko" ? "장비 불필요" : "no equipment"}</span>`
    : "";
  return `
    <a class="card anchor-card" href="${BASE}anchor/${esc(a.model)}">
      <div class="card-head">
        <h2><code>${esc(a.model)}</code></h2>
        ${floor}
      </div>
      <p class="anchor-label">${esc(t(a.label))}</p>
      <p class="req">${esc(t(a.requires))}</p>
      <div class="chips">
        <span class="chip">${lang === "ko" ? "체계" : "systems"} ${sys}</span>
        <span class="chip">${lang === "ko" ? "워크아웃" : "workouts"} ${wk}</span>
      </div>
    </a>`;
}

function renderAnchorList() {
  const groups = ANCHOR_CONSTRUCTS.map((c) => {
    const items = anchors.filter((a) => a.construct === c.id);
    if (!items.length) return "";
    return `
      <section class="anchor-construct-group">
        <h3 class="construct-h" title="${esc(t(c.note))}">${esc(t(c.label))}</h3>
        <div class="grid">${items.map(anchorCard).join("")}</div>
      </section>`;
  }).join("");
  return `
    <section class="intro">
      <p>${
        lang === "ko"
          ? "앵커(강도 모델)는 모든 워크아웃·체계가 매달리는 축이다. 읽는 <b>구성개념</b>으로 묶여 있지만, 같은 구성개념이라도 서로 변환되지 않는다. 장비가 없으면 결국 <code>rpe_10</code> 하나로 떨어진다 — 변환이 아니라 하강."
          : "Anchors (intensity models) are the axis every workout and system hangs on. They are grouped by the <b>construct</b> they read, but sharing a construct does not make them interconvert. Without equipment they all drop to a single <code>rpe_10</code> — a descent, not a conversion."
      }</p>
    </section>
    ${groups}`;
}

// ---- anchor detail ----------------------------------------------------------
function renderAnchorDetail(model) {
  const a = byAnchor[model];
  if (!a) return notFound(model);

  const sys = systemsByAnchor[model] || [];
  const wk = workoutsByAnchor[model] || [];
  const switches = switchesByAnchor[model] || [];
  const siblings = anchors.filter((x) => x.construct === a.construct && x.model !== model);
  const construct = ANCHOR_CONSTRUCTS.find((c) => c.id === a.construct);

  const floor = a.equipment_free
    ? `<span class="floor-badge">${lang === "ko" ? "장비 불필요" : "no equipment"}</span>`
    : "";

  // rpe_10 carries `note` (why it is the floor); every other anchor carries
  // `fallback` (what you lose when the equipment is gone).
  const descent = a.equipment_free
    ? a.note
      ? `<section class="block">
          <h3>${lang === "ko" ? "왜 바닥인가" : "Why it is the floor"}</h3>
          <p>${esc(t(a.note))}</p>
        </section>`
      : ""
    : a.fallback
      ? `<section class="block fallback-block">
          <h3>${lang === "ko" ? "장비가 없으면" : "Without the equipment"}</h3>
          <p>${esc(t(a.fallback))}</p>
        </section>`
      : "";

  const siblingHtml = siblings.length
    ? `<section class="block">
        <h3>${lang === "ko" ? "같은 구성개념" : "Same construct"}</h3>
        <p class="sub">${
          lang === "ko"
            ? "같은 것을 읽지만 서로 변환되지 않는다."
            : "They read the same thing but do not interconvert."
        }</p>
        <div class="anchor-siblings">${siblings
          .map((s) => `<a class="wchip" href="${BASE}anchor/${esc(s.model)}">${esc(s.model)}</a>`)
          .join("")}</div>
      </section>`
    : "";

  const sysHtml = sys.length
    ? `<section class="block">
        <h3>${lang === "ko" ? "이 앵커를 쓰는 체계" : "Systems anchored on it"}</h3>
        <div class="grid">${sys
          .map(
            (s) => `<a class="card sys-card" href="${BASE}system/${esc(s.id)}">
              <div class="card-head"><h2>${esc(s.name)}</h2>${tierBadge(s.evidence?.tier)}</div>
              <p class="bet">${esc(t(s.bet))}</p></a>`,
          )
          .join("")}</div>
      </section>`
    : "";

  const wkHtml = wk.length
    ? `<section class="block">
        <h3>${lang === "ko" ? "이 앵커를 쓰는 워크아웃" : "Workouts using it"}</h3>
        <div class="anchor-workouts">${wk
          .map(
            ({ w, primary }) =>
              `<a class="wchip" href="${BASE}workout/${esc(w.id)}">${esc(w.canonical_name)}${
                primary
                  ? ` <span class="primary-flag">${lang === "ko" ? "주앵커" : "primary"}</span>`
                  : ""
              }</a>`,
          )
          .join("")}</div>
      </section>`
    : "";

  const switchHtml = switches.length
    ? `<section class="block">
        <h3>${lang === "ko" ? "전환에서의 이 앵커" : "This anchor in switches"}</h3>
        <p class="sub">${
          lang === "ko"
            ? "이 앵커가 나가거나 들어오는 체계 전환. 조용함은 용어는 살아남고 뜻만 바뀌는 위험한 경우."
            : "System switches where this anchor leaves or arrives. Silent = the term survives while its meaning changes — the dangerous case."
        }</p>
        <div class="switch-list">${switches
          .map((x) => {
            const toName = bySystem[x.to]?.name || x.to;
            const fromName = bySystem[x.from]?.name || x.from;
            const dir =
              x.side === "in"
                ? `${lang === "ko" ? "유입" : "in"}`
                : `${lang === "ko" ? "유출" : "out"}`;
            return `<div class="switch">
              <div class="switch-head">
                <span class="switch-from"><a href="${BASE}system/${esc(x.from)}">${esc(fromName)}</a> → <a href="${BASE}system/${esc(x.to)}">${esc(toName)}</a></span>
                <span class="switch-flag ${x.side === "in" ? "in" : "out"}">${dir}</span>
                <span class="switch-flag ${x.silent ? "silent" : "loud"}">${
                  x.silent
                    ? lang === "ko"
                      ? "조용함"
                      : "silent"
                    : lang === "ko"
                      ? "드러남"
                      : "overt"
                }</span>
              </div>
              <p>${esc(t(x.note))}</p>
            </div>`;
          })
          .join("")}</div>
      </section>`
    : "";

  return `
    <a class="back" href="${BASE}anchors">← ${lang === "ko" ? "앵커 목록" : "anchors"}</a>
    <article class="detail">
      <div class="detail-head">
        <h1><code>${esc(a.model)}</code></h1>
        ${floor}
      </div>
      <p class="bet big">${esc(t(a.label))}</p>
      <div class="chips">
        <span class="chip" title="${esc(t(construct?.note))}">${esc(t(construct?.label))}</span>
      </div>

      <section class="block">
        <h3>${lang === "ko" ? "무엇을 읽나" : "What it reads"}</h3>
        <p>${esc(t(construct?.note))}</p>
      </section>

      <section class="block">
        <h3>${lang === "ko" ? "측정 요건" : "Requirements"}</h3>
        <p>${esc(t(a.requires))}</p>
      </section>

      ${descent}
      ${siblingHtml}
      ${sysHtml}
      ${wkHtml}
      ${switchHtml}
    </article>`;
}

// ---- workout list -----------------------------------------------------------
function renderWorkoutList() {
  const cards = workouts
    .map((w) => {
      const tier = w.claim?.evidence?.tier;
      return `
      <a class="card wk-card" href="${BASE}workout/${esc(w.id)}">
        <div class="card-head">
          <h2>${esc(w.canonical_name)}</h2>
          ${tierBadge(tier)}
        </div>
        <p class="family"><code>${esc(w.family)}</code>${
          w.test?.detectable === false
            ? ` · <span class="undetectable">${lang === "ko" ? "관찰 불가" : "unobservable"}</span>`
            : ""
        }</p>
        <p class="bet">${esc(t(w.claim?.proposition))}</p>
      </a>`;
    })
    .join("");
  return `
    <section class="intro">
      <p>${
        lang === "ko"
          ? "워크아웃은 디테일 뷰다. 각 행은 <b>주장</b>(반증 가능한 한 문장)과 그것을 <b>반증하는 절차</b>를 싣는다. 개선 수치는 없다 — 의도적으로."
          : "Workouts are the detail view. Each row carries a falsifiable <b>claim</b> and the <b>procedure that would falsify it</b>. No expected-improvement number, deliberately."
      }</p>
    </section>
    <div class="grid">${cards}</div>`;
}

// ---- workout detail ---------------------------------------------------------
function anchorRow(a) {
  const val = a.range ? `${a.range[0]}–${a.range[1]}` : a.zone != null ? a.zone : a.value;
  return `<tr>
    <td>${anchorCode(a.model)}</td>
    <td>${esc(val)}</td>
    <td><span class="conf conf-${esc(a.confidence)}">${esc(a.confidence)}</span></td>
    <td class="anchor-note">${a.note ? esc(t(a.note)) : ""}</td>
  </tr>`;
}

function confoundRow(c) {
  return `<div class="confound sev-${esc(c.severity)}">
    <div class="confound-head">
      <code>${esc(c.factor)}</code>
      <span class="sev">${esc(c.severity)}</span>
      ${c.shares_mechanism ? `<span class="shares" title="acts through the same physiology as the claim">${lang === "ko" ? "같은 기전" : "shares mechanism"}</span>` : ""}
    </div>
    ${c.note ? `<p>${esc(t(c.note))}</p>` : ""}
  </div>`;
}

function citeList(ev) {
  if (!ev?.cite?.length) return "";
  return `<ul class="cites">${ev.cite.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`;
}

// The measurement layer (data/anchors.json): what each anchor takes to measure,
// and the honest floor when you cannot. It points down to RPE and names what is
// lost - never a numeric conversion, because anchors do not convert cleanly.
function measurementBlock(models, { fallbackFor = null } = {}) {
  const uniq = [...new Set(models.filter((m) => byAnchor[m]))];
  const groups = ANCHOR_CONSTRUCTS.map((c) => {
    const items = uniq.filter((m) => byAnchor[m].construct === c.id);
    if (!items.length) return "";
    const rows = items
      .map((m) => {
        const a = byAnchor[m];
        const floor = a.equipment_free
          ? `<span class="floor-badge">${lang === "ko" ? "장비 불필요" : "no equipment"}</span>`
          : "";
        const note = a.note ? `<span class="measure-note">${esc(t(a.note))}</span>` : "";
        return `<li><code>${esc(m)}</code><span class="req">${esc(t(a.requires))}</span>${floor}${note}</li>`;
      })
      .join("");
    return `<div class="measure-group"><span class="measure-construct" title="${esc(t(c.note))}">${esc(t(c.label))}</span><ul class="measure">${rows}</ul></div>`;
  }).join("");
  const fa = fallbackFor && byAnchor[fallbackFor];
  const fb =
    fa && !fa.equipment_free
      ? `<p class="note fallback-note">${lang === "ko" ? "없으면 → " : "if unavailable → "}${esc(t(fa.fallback))}</p>`
      : "";
  return `
      <section class="block">
        <h3>${lang === "ko" ? "측정 요건" : "Measurement"}</h3>
        <p class="sub">${
          lang === "ko"
            ? "앵커는 읽는 구성개념(지각·페이스·심박·대사)으로 묶인다. 같은 구성개념이라도 서로 변환되지 않으며, 장비가 없으면 결국 장비 없이 누구나 쓸 수 있는 유일한 기준인 RPE로 떨어진다 — 변환이 아니라 하강이다."
            : "Anchors are grouped by the construct they read (perception, pace, heart rate, metabolic). Even within a construct they do not interconvert, and without the equipment you ultimately drop to RPE - the one standard anyone can use with no equipment - a descent, not a conversion."
        }</p>
        <div class="measure-groups">${groups}</div>
        ${fb}
      </section>`;
}

// The adaptation taxonomy (data/adaptations.json): group a workout's flat
// target_adaptation slugs under their coarse physiological category, with the
// definition on hover. Descriptive - it names what the workout targets, not what
// it produces.
function adaptationsBlock(ids) {
  const present = ADAPT_CATEGORIES.map((cat) => {
    const items = ids.map((id) => byAdaptation[id]).filter((a) => a && a.category === cat.id);
    if (!items.length) return "";
    const chips = items
      .map((a) => `<span class="adapt" title="${esc(t(a.definition))}">${esc(t(a.label))}</span>`)
      .join("");
    return `<div class="adapt-group"><span class="adapt-cat">${esc(t(cat.label))}</span><div class="adapt-chips">${chips}</div></div>`;
  }).join("");
  if (!present) return "";
  return `
      <section class="block">
        <h3>${lang === "ko" ? "표적 적응" : "Target adaptations"}</h3>
        <p class="sub">${
          lang === "ko"
            ? "이 워크아웃이 노린다고 주장하는 생리적 적응 — 결과가 아니라 표적이다. 정의는 마우스를 올려서."
            : "The physiological adaptations this workout is claimed to target - a target, not an outcome. Hover for the definition."
        }</p>
        <div class="adapt-groups">${present}</div>
      </section>`;
}

function renderWorkoutDetail(id) {
  const w = byWorkout[id];
  if (!w) return notFound(id);

  const svg = renderWorkout(w, byWorkout);
  const anchors = w.intensity.anchors.map(anchorRow).join("");

  const test = w.test;
  let testHtml;
  if (test.detectable) {
    const confounds = (test.confounds || []).map(confoundRow).join("");
    testHtml = `
      <p class="detectable yes">${lang === "ko" ? "관찰 가능" : "detectable"}</p>
      <div class="kv"><span>${lang === "ko" ? "무엇이" : "what"}</span><p>${esc(t(test.what))}</p></div>
      ${
        test.when_weeks
          ? `<div class="kv"><span>${lang === "ko" ? "언제" : "when"}</span><p>${test.when_weeks.min}–${test.when_weeks.max} ${lang === "ko" ? "주" : "weeks"}</p></div>`
          : ""
      }
      ${test.mechanism ? `<div class="kv"><span>${lang === "ko" ? "기전" : "mechanism"}</span><p>${esc(t(test.mechanism))}</p></div>` : ""}
      ${
        confounds
          ? `<div class="kv"><span>${lang === "ko" ? "교란" : "confounds"}</span><div class="confounds">${confounds}</div></div>`
          : ""
      }
      ${
        test.if_absent
          ? `<div class="kv if-absent"><span>${lang === "ko" ? "변화 없으면" : "if absent"}</span><p>${esc(t(test.if_absent))}</p></div>`
          : ""
      }
      ${citeList(test.evidence)}`;
  } else {
    testHtml = `
      <p class="detectable no">${lang === "ko" ? "관찰 불가" : "not detectable"} ${tierBadge(test.evidence?.tier)}</p>
      ${test.mechanism ? `<p>${esc(t(test.mechanism))}</p>` : ""}
      <p class="belief-note">${
        lang === "ko"
          ? "관찰 불가능한 null은 해석할 수 없다. 이건 믿음이다 — 주당 몇 분을 쓸지 결정하는 문제일 뿐."
          : "An unobservable null cannot be interpreted. This is a belief — the only question is how many weekly minutes to spend on it."
      }</p>`;
  }

  // usage rows for THIS workout: the collision table, from the workout's side.
  const uses = usage.filter((u) => u.workout === id);
  const usageHtml = uses
    .map((u) => {
      const sysName = u.system
        ? bySystem[u.system]?.name || u.system
        : lang === "ko"
          ? "체계 밖"
          : "no system";
      const aka = u.also_known_as?.length
        ? ` <span class="aka">(${u.also_known_as.map(esc).join(", ")})</span>`
        : "";
      return `<tr class="${u.collides ? "collides" : ""}">
        <td>${u.system ? `<a href="${BASE}system/${esc(u.system)}">${esc(sysName)}</a>` : `<span class="nosys">${esc(sysName)}</span>`}</td>
        <td><b>${esc(u.calls_it)}</b>${aka}${u.collides ? ` <span class="collision-flag">${lang === "ko" ? "충돌" : "collision"}</span>` : ""}</td>
        <td class="usage-note">${u.note ? esc(t(u.note)) : ""}</td>
      </tr>`;
    })
    .join("");

  const errors = (w.common_errors || []).map((e) => `<li>${esc(t(e))}</li>`).join("");
  const meta = [
    w.family && `<span class="chip"><code>${esc(w.family)}</code></span>`,
    w.attribution && `<span class="chip">${esc(w.attribution)}</span>`,
    w.safety?.injury_risk &&
      `<span class="chip">${lang === "ko" ? "부상 위험" : "injury"}: ${esc(w.safety.injury_risk)}</span>`,
  ]
    .filter(Boolean)
    .join("");

  return `
    <a class="back" href="${BASE}workouts">← ${lang === "ko" ? "워크아웃 목록" : "workouts"}</a>
    <article class="detail">
      <div class="detail-head">
        <h1>${esc(w.canonical_name)}</h1>
        ${tierBadge(w.claim?.evidence?.tier)}
      </div>
      <div class="chips">${meta}</div>

      <figure class="chart">${svg}</figure>

      ${adaptationsBlock(w.target_adaptation)}

      <section class="block">
        <h3>${lang === "ko" ? "지시" : "Instructions"}</h3>
        <p>${esc(t(w.instructions))}</p>
      </section>

      <section class="block">
        <h3>${lang === "ko" ? "강도 앵커" : "Intensity anchors"}</h3>
        <p class="sub">${
          lang === "ko"
            ? "앵커는 깔끔히 변환되지 않아 각자 confidence를 갖는다. rpe_10은 정확히 하나여야 한다 — 유일한 보편 교환 축."
            : "Anchors do not convert cleanly, so each carries its own confidence. Exactly one must be rpe_10 — the only universal exchange axis."
        }</p>
        <table class="anchors"><thead><tr><th>model</th><th>value</th><th>conf.</th><th></th></tr></thead><tbody>${anchors}</tbody></table>
      </section>

      ${measurementBlock(
        w.intensity.anchors.map((a) => a.model),
        { fallbackFor: w.intensity.primary_anchor },
      )}

      <section class="block claim">
        <h3>${lang === "ko" ? "주장" : "Claim"} ${tierBadge(w.claim?.evidence?.tier)}</h3>
        <p class="proposition">${esc(t(w.claim?.proposition))}</p>
        ${w.claim?.mechanism ? `<p>${esc(t(w.claim.mechanism))}</p>` : ""}
        ${citeList(w.claim?.evidence)}
      </section>

      <section class="block test">
        <h3>${lang === "ko" ? "반증 절차" : "Falsification test"}</h3>
        ${testHtml}
      </section>

      ${
        usageHtml
          ? `<section class="block">
        <h3>${lang === "ko" ? "체계별 명칭 (충돌 표)" : "What systems call it (collision table)"}</h3>
        <table class="usage"><tbody>${usageHtml}</tbody></table>
      </section>`
          : ""
      }

      ${
        errors
          ? `<section class="block caveats">
        <h3>${lang === "ko" ? "흔한 실수" : "Common errors"}</h3>
        <ul>${errors}</ul>
      </section>`
          : ""
      }
    </article>`;
}

// ---- search (the naming-join headline: "tempo run" -> two workouts) ---------
function renderSearch(rawQ) {
  const q = rawQ.trim().toLowerCase();

  // Which workouts does a colloquial term resolve to? >1 distinct => collision.
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

  let html = "";

  if (termWorkouts.length > 1) {
    html += `<div class="collision-banner">
      <b>“${esc(rawQ)}”</b> ${
        lang === "ko"
          ? `는 서로 다른 워크아웃 ${termWorkouts.length}개를 가리킨다 — 이름은 필드가 아니라 조인이다.`
          : `maps to ${termWorkouts.length} different workouts — naming is a join, not a field.`
      }
      <div class="collision-list">${termWorkouts
        .map((id) => {
          const w = byWorkout[id];
          const who = termHits
            .filter((u) => u.workout === id)
            .map((u) => (u.system ? bySystem[u.system]?.name || u.system : "—"))
            .join(", ");
          return `<a href="${BASE}workout/${esc(id)}" class="collision-item">
            <b>${esc(w?.canonical_name || id)}</b>
            <span>${esc(who)}</span>
          </a>`;
        })
        .join("")}</div>
    </div>`;
  }

  if (sysHits.length) {
    html += `<h3 class="search-h">${lang === "ko" ? "체계" : "Systems"}</h3><div class="grid">${sysHits
      .map(
        (s) => `<a class="card sys-card" href="${BASE}system/${esc(s.id)}">
          <div class="card-head"><h2>${esc(s.name)}</h2>${tierBadge(s.evidence?.tier)}</div>
          <p class="bet">${esc(t(s.bet))}</p></a>`,
      )
      .join("")}</div>`;
  }

  if (wkHits.length) {
    html += `<h3 class="search-h">${lang === "ko" ? "워크아웃" : "Workouts"}</h3><div class="grid">${wkHits
      .map(
        (w) => `<a class="card wk-card" href="${BASE}workout/${esc(w.id)}">
          <div class="card-head"><h2>${esc(w.canonical_name)}</h2>${tierBadge(w.claim?.evidence?.tier)}</div>
          <p class="bet">${esc(t(w.claim?.proposition))}</p></a>`,
      )
      .join("")}</div>`;
  }

  if (anchorHits.length) {
    html += `<h3 class="search-h">${lang === "ko" ? "앵커" : "Anchors"}</h3><div class="grid">${anchorHits
      .map(anchorCard)
      .join("")}</div>`;
  }

  if (!html) {
    html = `<p class="empty">${lang === "ko" ? "결과 없음" : "No results"}: “${esc(rawQ)}”</p>`;
  }

  return html;
}

// ---- misc -------------------------------------------------------------------
function notFound(id) {
  return `<p class="empty">${lang === "ko" ? "없음" : "Not found"}: <code>${esc(id)}</code></p>
    <a class="back" href="${BASE}">← ${lang === "ko" ? "홈" : "home"}</a>`;
}
