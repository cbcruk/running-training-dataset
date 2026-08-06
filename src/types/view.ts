// The view layer's own types. The data types next to this file are generated from
// the JSON Schemas; these are not - they describe how views are called, which the
// schemas have nothing to say about.
import type { Adaptation, Anchor, System, Usage, Workout } from "./index.d.ts";

/** A bilingual field as it appears throughout the data. */
export interface I18n {
  ko?: string;
  en?: string;
}

export type Lang = "ko" | "en";

/** A bilingual value, or a plain string that needs no translation. */
export type Translatable = I18n | string | null | undefined;

/** The physical quantity an anchor reads. Grouping shows the axes without bridging them. */
export interface Construct {
  id: string;
  label: I18n;
  note: I18n;
}

export interface AdaptCategory {
  id: string;
  label: I18n;
}

/** A workout that lists a given anchor, and whether it is that workout's primary. */
export interface AnchorUse {
  w: Workout;
  primary: boolean;
}

/** One side of a switching_cost, indexed by the anchor it touches. */
export interface AnchorSwitch {
  to: string;
  from: string;
  silent?: boolean;
  note?: I18n;
  from_anchor?: string;
  side: "in" | "out";
}

/**
 * Everything a view needs, assembled once per render.
 *
 * Views are pure and DOM-free (ADR 0001) so the prerenderer and the browser render
 * from one source; `ctx` is what replaced the module-level closure they used to
 * read from. Passing it explicitly is what makes a component renderable in a test
 * without booting the app.
 */
export interface ViewContext {
  t: (v: Translatable) => string;
  lang: Lang;
  /** Base-prefixed href for an internal path, e.g. `url("anchor/rpe_10")`. */
  url: (path: string) => string;

  byWorkout: Record<string, Workout>;
  bySystem: Record<string, System>;
  byAnchor: Record<string, Anchor>;
  byAdaptation: Record<string, Adaptation>;

  systems: System[];
  workouts: Workout[];
  anchors: Anchor[];
  adaptations: Adaptation[];
  usage: Usage[];

  constructs: Construct[];
  constructLabel: Record<string, I18n>;
  adaptCategories: AdaptCategory[];
  commitTips: Record<"sessions" | "volume" | "weeks" | "track", I18n>;

  fmt: {
    km: (n: number | null | undefined) => string;
    sessions: (sp: { value?: number; min?: number; max?: number } | undefined) => string;
    weeks: (pl: { value?: number; min?: number; max?: number } | undefined) => string;
  };

  /** Reverse indexes, so an anchor page can show everything that references it. */
  indexes: {
    systemsByAnchor: Record<string, System[]>;
    workoutsByAnchor: Record<string, AnchorUse[]>;
    switchesByAnchor: Record<string, AnchorSwitch[]>;
  };
}

/** Every component in this app takes the context; most take one more thing. */
export interface WithCtx {
  ctx: ViewContext;
}
