// Browse layer for the running-training-dataset.
// Epistemics live in the JSON; this file is convenience only. The one hard rule
// it must honour (README "Known open problems"): the evidence tier goes on the
// browse card, not buried in the detail view — so browsing ten systems can never
// make a `tradition` system look as settled as a `consensus` one.
import systemsRaw from "../data/systems.json" with { type: "json" };
import workoutsRaw from "../data/workouts.json" with { type: "json" };
import usageRaw from "../data/usage.json" with { type: "json" };
import anchorsRaw from "../data/anchors.json" with { type: "json" };
import adaptationsRaw from "../data/adaptations.json" with { type: "json" };
import { renderToStaticMarkup } from "react-dom/server";
import type { Adaptation, Anchor, System, Usage, Workout } from "./types/index.d.ts";
import type {
  AdaptCategory,
  AnchorSwitch,
  AnchorUse,
  Construct,
  Lang,
  Translatable,
  ViewContext,
} from "./types/view.ts";
import { AnchorDetail } from "./components/AnchorDetail.tsx";
import { SystemDetail } from "./components/SystemDetail.tsx";
import { WorkoutDetail } from "./components/WorkoutDetail.tsx";
import {
  AnchorList,
  NotFound,
  SearchResults,
  SystemList,
  WorkoutList,
} from "./components/Lists.tsx";

// The schemas are the source of truth for these shapes; the types next to this
// file are generated from them (scripts/types.mjs). The JSON is asserted into
// them rather than inferred, so a schema change surfaces here as a type error.
const systems = systemsRaw as unknown as System[];
const workouts = workoutsRaw as unknown as Workout[];
const usage = usageRaw as unknown as Usage[];
const anchors = anchorsRaw as unknown as Anchor[];
const adaptations = adaptationsRaw as unknown as Adaptation[];

const byWorkout: Record<string, Workout> = Object.fromEntries(workouts.map((w) => [w.id, w]));
const bySystem: Record<string, System> = Object.fromEntries(systems.map((s) => [s.id, s]));
const byAnchor: Record<string, Anchor> = Object.fromEntries(anchors.map((a) => [a.model, a]));
const byAdaptation: Record<string, Adaptation> = Object.fromEntries(
  adaptations.map((a) => [a.id, a]),
);

// Reverse indexes so an anchor page can show everything that references it:
// which systems anchor on it, which workouts list it (and where it is primary),
// and every switching_cost whose anchor_change touches it on either side.
const systemsByAnchor: Record<string, System[]> = {};
for (const s of systems) (systemsByAnchor[s.intensity_model] ??= []).push(s);
const workoutsByAnchor: Record<string, AnchorUse[]> = {};
for (const w of workouts)
  for (const a of w.intensity.anchors)
    (workoutsByAnchor[a.model] ??= []).push({
      w,
      primary: w.intensity.primary_anchor === a.model,
    });
const switchesByAnchor: Record<string, AnchorSwitch[]> = {};
for (const s of systems)
  for (const x of s.switching_cost || []) {
    const [from, to] = (x.anchor_change || "").split("->").map((v: string) => v.trim());
    const entry = { to: s.id, from: x.from, silent: x.silent, note: x.note, from_anchor: from };
    for (const m of new Set([from, to]))
      if (byAnchor[m])
        (switchesByAnchor[m] ??= []).push({ ...entry, side: m === to ? "in" : "out" });
  }

// Anchor constructs: the physical quantity each anchor reads. Grouping shows the
// axes; the notes state that sharing a construct does NOT make anchors convert.
const ANCHOR_CONSTRUCTS: Construct[] = [
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
const ADAPT_CATEGORIES: AdaptCategory[] = [
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
let lang: Lang = "ko";
let BASE = "/";

export function setLang(next: Lang) {
  lang = next;
}
export function setBase(next: string) {
  BASE = next.endsWith("/") ? next : next + "/";
}
export function currentLang(): Lang {
  return lang;
}

// bilingual field -> current-language string, falling back to the other language.
function t(obj: Translatable): string {
  if (obj == null) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] || obj.en || obj.ko || "";
}

export const PLACEHOLDER = {
  ko: '검색: "tempo run", daniels, easy…',
  en: 'search: "tempo run", daniels, easy…',
};

// A raw intensity_model / anchor.model code, made hoverable: the tooltip pulls
// label + construct + what-it-takes-to-measure from anchors.json so a slug like
// "lactate_mmol" explains itself in place.
const CONSTRUCT_LABEL = Object.fromEntries(ANCHOR_CONSTRUCTS.map((c) => [c.id, c.label]));

// A commitment chip that explains its dimension on hover - the terse
// "9-13x/wk" / "≥120km" say what, the tooltip says what it means.
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

const KM = (n: number | null | undefined) => (n == null ? "" : `${n}km`);
function sessionsText(sp?: { value?: number; min?: number; max?: number }) {
  if (!sp) return "";
  if (sp.value != null) return `${sp.value}×`;
  return `${sp.min}–${sp.max}×`;
}
function weeksText(pl?: { value?: number; min?: number; max?: number }) {
  if (!pl) return "";
  if (pl.value != null) return `${pl.value}w`;
  return `${pl.min}–${pl.max}w`;
}

// ---- routing ----------------------------------------------------------------
// Paths are base-relative and base-stripped by the caller: "/", "/workouts",
// "/anchor/rpe_10". Every view function returns an HTML string, so the same call
// serves the browser (assigned to #app) and the prerenderer (written to a file).
export function currentView(path: string): string {
  const p = path || "/";
  if (p.startsWith("/anchor")) return "anchors";
  if (p.startsWith("/workout")) return "workouts";
  if (p.startsWith("/system")) return "systems";
  return "systems";
}

export function renderPath(path: string, q = ""): string {
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
export function metaFor(path: string): { title: string; description: string } {
  const parts = (path || "/").split("/").filter(Boolean);
  const clip = (s: string | undefined, n = 155) => {
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

// Name an entry from its path. Used by the browser shell's recently-viewed strip,
// which is per-reader and therefore never prerendered - the files on disk have to
// stay identical for everyone.
export function entryLabel(path: string): { kind: string; label: string } | null {
  const parts = (path || "/").split("/").filter(Boolean);
  if (parts[0] === "system" && bySystem[parts[1]])
    return { kind: "system", label: bySystem[parts[1]].name };
  if (parts[0] === "workout" && byWorkout[parts[1]])
    return { kind: "workout", label: byWorkout[parts[1]].canonical_name };
  if (parts[0] === "anchor" && byAnchor[parts[1]])
    return { kind: "anchor", label: byAnchor[parts[1]].model };
  return null;
}

export const RECENT_LABEL = {
  ko: "최근 본 항목",
  en: "Recently viewed",
};

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
  return renderToStaticMarkup(<SystemList ctx={viewContext()} />);
}

// ---- system detail ----------------------------------------------------------

function renderSystemDetail(id: string): string {
  if (!bySystem[id]) return notFound(id);
  return renderToStaticMarkup(<SystemDetail ctx={viewContext()} id={id} />);
}

// ---- anchor (measurement model) list ----------------------------------------
// Anchors are first-class: the axis every workout and system is pinned to. The
// list groups them by construct so the "same construct != interconvertible"
// point is visible at a glance, and each card counts its real references.

function renderAnchorList() {
  return renderToStaticMarkup(<AnchorList ctx={viewContext()} />);
}

// ---- anchor detail ----------------------------------------------------------
// Migrated to components (src/components/AnchorDetail.jsx). It still returns a
// string, so the router, the browser shell, and the prerenderer are unchanged -
// which is what lets the migration run one view at a time instead of as a
// big-bang rewrite. `ctx` carries what the module-level closure used to supply.
function viewContext(): ViewContext {
  return {
    t,
    lang,
    url: (path: string) => `${BASE}${path}`,
    byWorkout,
    bySystem,
    byAnchor,
    byAdaptation,
    systems,
    workouts,
    anchors,
    adaptations,
    usage,
    constructs: ANCHOR_CONSTRUCTS,
    constructLabel: CONSTRUCT_LABEL,
    adaptCategories: ADAPT_CATEGORIES,
    commitTips: COMMIT_TIPS,
    fmt: { km: KM, sessions: sessionsText, weeks: weeksText },
    indexes: { systemsByAnchor, workoutsByAnchor, switchesByAnchor },
  };
}

function renderAnchorDetail(model: string): string {
  if (!byAnchor[model]) return notFound(model);
  return renderToStaticMarkup(<AnchorDetail ctx={viewContext()} model={model} />);
}

// ---- workout list -----------------------------------------------------------
function renderWorkoutList() {
  return renderToStaticMarkup(<WorkoutList ctx={viewContext()} />);
}

// ---- workout detail ---------------------------------------------------------

// The measurement layer (data/anchors.json): what each anchor takes to measure,
// and the honest floor when you cannot. It points down to RPE and names what is
// lost - never a numeric conversion, because anchors do not convert cleanly.

// The adaptation taxonomy (data/adaptations.json): group a workout's flat
// target_adaptation slugs under their coarse physiological category, with the
// definition on hover. Descriptive - it names what the workout targets, not what
// it produces.

function renderWorkoutDetail(id: string): string {
  if (!byWorkout[id]) return notFound(id);
  return renderToStaticMarkup(<WorkoutDetail ctx={viewContext()} id={id} />);
}

// ---- search (the naming-join headline: "tempo run" -> two workouts) ---------
function renderSearch(rawQ: string): string {
  return renderToStaticMarkup(<SearchResults ctx={viewContext()} rawQ={rawQ} />);
}

// ---- misc -------------------------------------------------------------------
function notFound(id: string): string {
  return renderToStaticMarkup(<NotFound ctx={viewContext()} id={id} />);
}
