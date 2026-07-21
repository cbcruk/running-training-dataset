// Browse layer for the running-training-dataset.
// Epistemics live in the JSON; this file is convenience only. The one hard rule
// it must honour (README "Known open problems"): the evidence tier goes on the
// browse card, not buried in the detail view — so browsing ten systems can never
// make a `tradition` system look as settled as a `consensus` one.
import "./style.css";
import systems from "../data/systems.json";
import workouts from "../data/workouts.json";
import usage from "../data/usage.json";
import { renderWorkout } from "../scripts/svg.mjs";

const byWorkout = Object.fromEntries(workouts.map((w) => [w.id, w]));
const bySystem = Object.fromEntries(systems.map((s) => [s.id, s]));

// ---- language ---------------------------------------------------------------
let lang = localStorage.getItem("lang") || "ko";
const app = document.getElementById("app");
const searchInput = document.getElementById("search");
const langToggle = document.getElementById("lang-toggle");

function setLang(next) {
  lang = next;
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang;
  syncChrome();
  route();
}

// bilingual field -> current-language string, falling back to the other language.
function t(obj) {
  if (obj == null) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] || obj.en || obj.ko || "";
}

const PLACEHOLDER = {
  ko: '검색: "tempo run", daniels, easy…',
  en: 'search: "tempo run", daniels, easy…',
};

function syncChrome() {
  langToggle.textContent = lang === "ko" ? "EN" : "한국어";
  searchInput.placeholder = PLACEHOLDER[lang];
  for (const a of document.querySelectorAll("[data-nav]")) {
    a.classList.toggle("active", a.dataset.nav === currentView());
  }
}

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
function currentView() {
  const h = location.hash;
  if (h.startsWith("#/workout")) return "workouts";
  if (h.startsWith("#/system")) return "systems";
  if (h.startsWith("#/workouts")) return "workouts";
  return "systems";
}

function route() {
  const hash = location.hash.slice(1) || "/";
  const [path, query] = hash.split("?");
  const parts = path.split("/").filter(Boolean);
  const q = new URLSearchParams(query || "").get("q") || "";

  if (searchInput.value !== q) searchInput.value = q;

  if (q) return renderSearch(q);
  if (parts[0] === "workouts") return renderWorkoutList();
  if (parts[0] === "workout" && parts[1]) return renderWorkoutDetail(parts[1]);
  if (parts[0] === "system" && parts[1]) return renderSystemDetail(parts[1]);
  return renderSystemList();
  // note: renderSearch/renderWorkoutList etc. all set app.innerHTML
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
      <a class="card sys-card" href="#/system/${esc(s.id)}">
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
  app.innerHTML = `
    <section class="intro">
      <p>${
        lang === "ko"
          ? "체계가 브라우징 단위다. 각 카드는 <b>bet</b>(한 문장 내기)과 <b>실행 조건</b>, 그리고 <b>근거 등급</b>을 앞세운다. 등급이 카드에 있는 이유: 열 개를 훑어도 관행이 정설처럼 보이지 않게."
          : "The system is the unit you browse. Each card leads with its <b>bet</b> (a one-sentence wager), its <b>commitment</b>, and its <b>evidence tier</b> — tier is on the card so browsing ten of them never makes tradition look like consensus."
      }</p>
    </section>
    <div class="grid">${cards}</div>`;
  finishRender();
}

// ---- system detail ----------------------------------------------------------
function workoutChip(id) {
  const w = byWorkout[id];
  const label = w ? w.canonical_name : id;
  return `<a class="wchip" href="#/workout/${esc(id)}">${esc(label)}</a>`;
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
          }: <a href="#/system/${esc(x.from)}">${esc(fromName)}</a></span>
          <span class="switch-flag ${x.silent ? "silent" : "loud"}">${
            x.silent
              ? lang === "ko"
                ? "조용함"
                : "silent"
              : lang === "ko"
                ? "드러남"
                : "not silent"
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
  app.innerHTML = `
    <a class="back" href="#/">← ${lang === "ko" ? "체계 목록" : "systems"}</a>
    <article class="detail">
      <div class="detail-head">
        <div>
          <h1>${esc(s.name)}</h1>
          <p class="attribution">${esc(s.attribution || "")} · <code>${esc(s.intensity_model)}</code></p>
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
          ${sessionsText(c.sessions_per_week) ? `<span class="chip">${esc(sessionsText(c.sessions_per_week))}/wk</span>` : ""}
          ${c.min_weekly_km ? `<span class="chip">≥ ${esc(KM(c.min_weekly_km))}</span>` : ""}
          ${weeksText(c.plan_length_weeks) ? `<span class="chip">${esc(weeksText(c.plan_length_weeks))}</span>` : ""}
          ${c.requires_track != null ? `<span class="chip">${c.requires_track ? (lang === "ko" ? "트랙 필요" : "track") : lang === "ko" ? "트랙 불필요" : "no track"}</span>` : ""}
        </div>
        ${c.note ? `<p class="note">${esc(t(c.note))}</p>` : ""}
      </section>

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
  finishRender();
}

// ---- workout list -----------------------------------------------------------
function renderWorkoutList() {
  const cards = workouts
    .map((w) => {
      const tier = w.claim?.evidence?.tier;
      return `
      <a class="card wk-card" href="#/workout/${esc(w.id)}">
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
  app.innerHTML = `
    <section class="intro">
      <p>${
        lang === "ko"
          ? "워크아웃은 디테일 뷰다. 각 행은 <b>주장</b>(반증 가능한 한 문장)과 그것을 <b>반증하는 절차</b>를 싣는다. 개선 수치는 없다 — 의도적으로."
          : "Workouts are the detail view. Each row carries a falsifiable <b>claim</b> and the <b>procedure that would falsify it</b>. No expected-improvement number, deliberately."
      }</p>
    </section>
    <div class="grid">${cards}</div>`;
  finishRender();
}

// ---- workout detail ---------------------------------------------------------
function anchorRow(a) {
  const val = a.range ? `${a.range[0]}–${a.range[1]}` : a.zone != null ? a.zone : a.value;
  return `<tr>
    <td><code>${esc(a.model)}</code></td>
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
        <td>${u.system ? `<a href="#/system/${esc(u.system)}">${esc(sysName)}</a>` : `<span class="nosys">${esc(sysName)}</span>`}</td>
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

  app.innerHTML = `
    <a class="back" href="#/workouts">← ${lang === "ko" ? "워크아웃 목록" : "workouts"}</a>
    <article class="detail">
      <div class="detail-head">
        <h1>${esc(w.canonical_name)}</h1>
        ${tierBadge(w.claim?.evidence?.tier)}
      </div>
      <div class="chips">${meta}</div>

      <figure class="chart">${svg}</figure>

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
  finishRender();
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
          return `<a href="#/workout/${esc(id)}" class="collision-item">
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
        (s) => `<a class="card sys-card" href="#/system/${esc(s.id)}">
          <div class="card-head"><h2>${esc(s.name)}</h2>${tierBadge(s.evidence?.tier)}</div>
          <p class="bet">${esc(t(s.bet))}</p></a>`,
      )
      .join("")}</div>`;
  }

  if (wkHits.length) {
    html += `<h3 class="search-h">${lang === "ko" ? "워크아웃" : "Workouts"}</h3><div class="grid">${wkHits
      .map(
        (w) => `<a class="card wk-card" href="#/workout/${esc(w.id)}">
          <div class="card-head"><h2>${esc(w.canonical_name)}</h2>${tierBadge(w.claim?.evidence?.tier)}</div>
          <p class="bet">${esc(t(w.claim?.proposition))}</p></a>`,
      )
      .join("")}</div>`;
  }

  if (!html) {
    html = `<p class="empty">${lang === "ko" ? "결과 없음" : "No results"}: “${esc(rawQ)}”</p>`;
  }

  app.innerHTML = html;
  finishRender();
}

// ---- misc -------------------------------------------------------------------
function notFound(id) {
  app.innerHTML = `<p class="empty">${lang === "ko" ? "없음" : "Not found"}: <code>${esc(id)}</code></p>
    <a class="back" href="#/">← ${lang === "ko" ? "홈" : "home"}</a>`;
  finishRender();
}

function finishRender() {
  syncChrome();
  window.scrollTo(0, 0);
}

// ---- wiring -----------------------------------------------------------------
let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = searchInput.value.trim();
    const base = location.hash.startsWith("#/workouts") ? "#/workouts" : "#/";
    location.hash = q ? `${base}?q=${encodeURIComponent(q)}` : base;
  }, 120);
});

langToggle.addEventListener("click", () => setLang(lang === "ko" ? "en" : "ko"));
window.addEventListener("hashchange", route);

document.documentElement.lang = lang;
syncChrome();
route();
