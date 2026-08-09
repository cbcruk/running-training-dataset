// Every rule the dataset is held to, behind one function.
//
// The rules were a 375-line script with no exports, whose only interface was
// "spawn a process and grep stdout for OK". That made a whole class of question
// unaskable in a test - does *this* rule fire on *this* break - and proving a new
// rule worked meant copying the JSON aside, editing it on disk, running the
// binary, grepping stderr and restoring the file.
//
// So: one entry point, structured findings, no I/O. scripts/validate.ts is now
// the CLI adapter over it, the same arrangement svg.ts already has with
// render.ts and WorkoutDetail.tsx.
//
// Adding a rule means adding one `add(...)` with an id. The id is the contract:
// tests name it, and it is what lets the README's list of violations be checked
// against the code rather than drifting beside it.

// ajv ships its 2020 entry as CJS; the default export is the constructor.
import Ajv2020Module from "ajv/dist/2020.js";
import { assertions, citedWorks } from "./evidence.ts";
import type { Dataset } from "./dataset.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = any;
const Ajv2020 = Ajv2020Module as unknown as new (opts: Row) => any;

export type Layer = "schema" | "ref" | "discipline";

export interface Finding {
  layer: Layer;
  /** Stable kebab-case id. Tests assert on this; the message is for humans. */
  rule: string;
  /** The row the finding is about, or the file when it is about a whole list. */
  row: string;
  /** Dotted path within the row, when the finding is narrower than the row. */
  path?: string;
  message: string;
}

const dupes = (arr: Row[]): Row[] => arr.filter((v: Row, i: number) => arr.indexOf(v) !== i);

/** Group a reference by first author + year, the key the one-string rule uses. */
const citeKey = (c: string): string | null => {
  const m = c.match(/^([A-Za-z][^(]*?)\s*\((\d{4})\)/);
  return m ? `${m[1].trim().split(/[\s,&]+/)[0]} ${m[2]}` : null;
};

export function check(data: Dataset): Finding[] {
  const { workouts, systems, usage, anchors, adaptations, schemas } = data;
  const found: Finding[] = [];
  const add = (layer: Layer, rule: string, row: string, message: string, path?: string) =>
    found.push(path ? { layer, rule, row, path, message } : { layer, rule, row, message });

  // ---- L1: schema ----
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  for (const [name, schema] of Object.entries(schemas)) ajv.addSchema(schema, name);

  for (const [name, list, key] of [
    ["workout", workouts, "workout.schema.json"],
    ["system", systems, "system.schema.json"],
    ["usage", usage, "usage.schema.json"],
    ["anchor", anchors, "anchor-model.schema.json"],
    ["adaptation", adaptations, "adaptation.schema.json"],
  ] as [string, Row[], string][]) {
    const validate = ajv.getSchema(key);
    list.forEach((row: Row, i: number) => {
      if (validate(row)) return;
      // ajv reports every non-matching item of a `contains` as its own error. Noise.
      // Keep the `contains` verdict itself and drop the per-item fallout.
      for (const e of validate.errors.filter((e: Row) => !/\/contains\//.test(e.schemaPath)))
        add(
          "schema",
          "schema",
          row.id ?? row.model ?? row.calls_it ?? `${name}[${i}]`,
          `${name}[${i}] ${row.id ?? row.model ?? row.calls_it ?? ""} ${e.instancePath} ${e.message}`,
          e.instancePath || undefined,
        );
    });
  }

  // ---- L2: referential integrity ----
  const wIds = new Set(workouts.map((w: Row) => w.id));
  const sIds = new Set(systems.map((s: Row) => s.id));

  for (const d of dupes(workouts.map((w: Row) => w.id)))
    add("ref", "duplicate-id", d, `duplicate workout id: ${d}`);
  for (const d of dupes(systems.map((s: Row) => s.id)))
    add("ref", "duplicate-id", d, `duplicate system id: ${d}`);

  // The measurement layer must cover every anchor the data actually uses, so a
  // system's intensity_model or a workout's anchor can never lack a "what does it
  // take to measure this" answer.
  const anchorModels = new Set(anchors.map((a: Row) => a.model));
  for (const d of dupes(anchors.map((a: Row) => a.model)))
    add("ref", "duplicate-id", d, `duplicate anchor model: ${d}`);
  for (const s of systems)
    if (!anchorModels.has(s.intensity_model))
      add(
        "ref",
        "unknown-anchor",
        s.id,
        `system ${s.id}: intensity_model "${s.intensity_model}" has no anchors.json entry`,
      );
  for (const w of workouts)
    for (const a of w.intensity.anchors)
      if (!anchorModels.has(a.model))
        add(
          "ref",
          "unknown-anchor",
          w.id,
          `${w.id}: anchor model "${a.model}" has no anchors.json entry`,
        );

  // Exactly one equipment-free anchor, and it must be rpe_10 - the same principle
  // the workout schema enforces per row (exactly one rpe_10). The universal floor
  // is singular by definition; two would mean the fallback is ambiguous.
  const free = anchors.filter((a: Row) => a.equipment_free).map((a: Row) => a.model);
  if (free.length !== 1 || free[0] !== "rpe_10")
    add(
      "discipline",
      "equipment-free-anchor",
      "anchors.json",
      `anchors.json: the sole equipment_free anchor must be rpe_10, got [${free.join(", ")}]`,
    );
  // The perception construct is the subjective axis - the same one that is the
  // equipment-free floor. Exactly rpe_10, and nothing else, may claim it.
  const perception = anchors
    .filter((a: Row) => a.construct === "perception")
    .map((a: Row) => a.model);
  if (perception.length !== 1 || perception[0] !== "rpe_10")
    add(
      "discipline",
      "perception-construct",
      "anchors.json",
      `anchors.json: the sole 'perception' construct must be rpe_10, got [${perception.join(", ")}]`,
    );

  // The adaptation taxonomy must cover every target_adaptation the data uses, so a
  // workout can never target an adaptation the taxonomy does not define/group.
  const adaptationIds = new Set(adaptations.map((a: Row) => a.id));
  for (const d of dupes(adaptations.map((a: Row) => a.id)))
    add("ref", "duplicate-id", d, `duplicate adaptation id: ${d}`);
  for (const w of workouts)
    for (const t of w.target_adaptation)
      if (!adaptationIds.has(t))
        add(
          "ref",
          "unknown-adaptation",
          w.id,
          `${w.id}: target_adaptation "${t}" has no adaptations.json entry`,
        );

  const walkSegments = (segs: Row[], cb: (s: Row) => void) =>
    segs.forEach((s: Row) => {
      cb(s);
      if (s.children) walkSegments(s.children, cb);
    });

  for (const w of workouts) {
    walkSegments(w.structure.segments, (s: Row) => {
      if (s.intensity_ref && s.intensity_ref !== "self" && !wIds.has(s.intensity_ref))
        add(
          "ref",
          "unknown-workout-ref",
          w.id,
          `${w.id}: intensity_ref "${s.intensity_ref}" is not a workout id`,
        );
      if (s.ramp_to && s.ramp_to !== "self" && !wIds.has(s.ramp_to))
        add(
          "ref",
          "unknown-workout-ref",
          w.id,
          `${w.id}: ramp_to "${s.ramp_to}" is not a workout id`,
        );
    });
    for (const r of w.prerequisites?.requires_workouts ?? [])
      if (!wIds.has(r))
        add("ref", "unknown-workout-ref", w.id, `${w.id}: requires_workouts "${r}" unknown`);
    if (
      w.intensity.primary_anchor &&
      !w.intensity.anchors.some((a: Row) => a.model === w.intensity.primary_anchor)
    )
      add(
        "ref",
        "primary-anchor-unlisted",
        w.id,
        `${w.id}: primary_anchor "${w.intensity.primary_anchor}" not in anchors`,
      );
    // One reading per model. Two pct_hrmax anchors is not nuance, it is an unresolved disagreement with itself.
    for (const d of dupes(w.intensity.anchors.map((a: Row) => a.model)))
      add("discipline", "duplicate-anchor-model", w.id, `${w.id}: duplicate anchor model "${d}"`);
  }
  for (const s of systems)
    for (const p of s.phases ?? [])
      for (const e of p.emphasis)
        if (!wIds.has(e))
          add(
            "ref",
            "unknown-workout-ref",
            s.id,
            `system ${s.id} phase ${p.name}: unknown workout "${e}"`,
          );

  for (const u of usage) {
    if (!wIds.has(u.workout))
      add(
        "ref",
        "unknown-workout-ref",
        u.calls_it,
        `usage "${u.calls_it}": unknown workout "${u.workout}"`,
      );
    if (u.system !== null && !sIds.has(u.system))
      add(
        "ref",
        "unknown-system-ref",
        u.calls_it,
        `usage "${u.calls_it}": unknown system "${u.system}"`,
      );
  }

  // ---- L3: project-specific discipline ----
  // Colloquial names must never leak into the workout row. They belong in usage.json.
  const BANNED_IN_ID = ["tempo", "easy-pace", "lt-run", "pickup"];
  for (const w of workouts)
    for (const b of BANNED_IN_ID)
      if (w.id.includes(b) || w.canonical_name.toLowerCase().includes(b))
        add(
          "discipline",
          "colloquial-in-id",
          w.id,
          `${w.id}: overloaded colloquial term "${b}" in id/canonical_name. Put it in usage.json.`,
        );

  // Every workout must be reachable by at least one name, else it is undiscoverable.
  for (const w of workouts)
    if (!usage.some((u: Row) => u.workout === w.id))
      add(
        "discipline",
        "unnameable-workout",
        w.id,
        `${w.id}: no usage row - unnameable, therefore unfindable`,
      );

  // A bet is one sentence. If it needs a paragraph it is philosophy, and there is a field for that.
  for (const s of systems)
    for (const lang of ["ko", "en"]) {
      const b = s.bet[lang];
      if (b.length > 90)
        add(
          "discipline",
          "bet-too-long",
          s.id,
          `system ${s.id}: bet.${lang} is ${b.length} chars - not a bet, that is philosophy`,
          `bet.${lang}`,
        );
      if ((b.match(/[.!?。]/g) ?? []).length > 1)
        add(
          "discipline",
          "bet-multi-sentence",
          s.id,
          `system ${s.id}: bet.${lang} is more than one sentence`,
          `bet.${lang}`,
        );
    }

  // switching_cost.anchor_change is derivable from intensity_model, therefore verifiable.
  const sysById = Object.fromEntries(systems.map((s: Row) => [s.id, s]));
  for (const s of systems)
    for (const sc of s.switching_cost ?? []) {
      if (sc.from === s.id)
        add(
          "discipline",
          "switching-cost-self",
          s.id,
          `system ${s.id}: switching_cost from itself`,
        );
      const src = sysById[sc.from];
      if (!src) {
        add(
          "ref",
          "unknown-system-ref",
          s.id,
          `system ${s.id}: switching_cost.from "${sc.from}" unknown`,
        );
        continue;
      }
      const expected = `${src.intensity_model} -> ${s.intensity_model}`;
      if (sc.anchor_change !== expected)
        add(
          "discipline",
          "anchor-change-contradicts",
          s.id,
          `system ${s.id} <- ${sc.from}: anchor_change "${sc.anchor_change}" contradicts intensity_model, expected "${expected}"`,
        );
    }

  // A confound acting through the claim's own mechanism is severe by definition.
  for (const w of workouts)
    for (const c of w.test.confounds ?? [])
      if (c.shares_mechanism === true && c.severity !== "high")
        add(
          "discipline",
          "confound-severity",
          w.id,
          `${w.id}: confound "${c.factor}" shares_mechanism but severity="${c.severity}" - mechanistic indistinguishability is high by definition`,
          "test.confounds",
        );

  const rows = [...workouts, ...systems];

  // A cite must look like a citation, not a URL or a vibe.
  for (const row of rows)
    for (const a of assertions(row))
      for (const c of a.evidence.cite ?? [])
        if (!/\(\d{4}\)/.test(c))
          add(
            "discipline",
            "cite-year",
            row.id,
            `${row.id}: cite lacks a (year): "${c.slice(0, 50)}"`,
            a.path,
          );

  // A `source` is provenance, not evidence, but it is still a citation and is held
  // to the same bar. Workouts carry the field on the same terms as systems: removing
  // a canonical text as *efficacy* evidence must not also erase the record of what
  // the text *prescribes*, which is the split `source` exists to keep.
  for (const row of rows)
    for (const src of row.source ?? [])
      if (!/\(\d{4}\)/.test(src))
        add(
          "discipline",
          "source-year",
          row.id,
          `${row.id}: source lacks a (year): "${src.slice(0, 50)}"`,
        );

  // An empty `source` says nothing on its own, and silence reads as "fine". A row
  // with no recorded text and a row for which no text can exist are different
  // facts, and until `provenance` existed both rendered as the same blank. Tying
  // the two together makes the field a checked statement rather than a label
  // anyone can set: `recorded` has to produce the source it claims, and the other
  // two have to be empty, so the badge can never disagree with the row under it.
  for (const row of rows) {
    const has = !!row.source?.length;
    if (row.provenance === "recorded" && !has)
      add(
        "discipline",
        "provenance-source-mismatch",
        row.id,
        `${row.id}: provenance="recorded" but no source - nothing was recorded`,
      );
    if (row.provenance !== "recorded" && has)
      add(
        "discipline",
        "provenance-source-mismatch",
        row.id,
        `${row.id}: provenance="${row.provenance}" but a source is present - a recorded text makes the row "recorded"`,
      );
  }

  // A workout nobody formalized cannot have an authoritative text describing it, so
  // its blank `source` is "cannot be done", never "not yet done". Deriving the label
  // from `attribution` keeps the two from disagreeing: a folk workout marked
  // `unrecorded` would put a permanently unfillable row on someone's worklist.
  for (const w of workouts)
    if (w.attribution === null && w.provenance !== "uncitable")
      add(
        "discipline",
        "folk-workout-uncitable",
        w.id,
        `${w.id}: attribution=null but provenance="${w.provenance}" - a workout formalized by nobody has no authoritative text to record`,
      );

  // The distinction only holds if the two never collapse. A row citing the same work
  // as both its description and its proof is asserting that a method describing
  // itself demonstrates itself - the conflation `source` was introduced to separate.
  for (const row of rows) {
    const cites = citedWorks(row);
    for (const src of row.source ?? [])
      if (cites.has(src))
        add(
          "discipline",
          "source-and-cite",
          row.id,
          `${row.id}: "${src.slice(0, 45)}..." is both a source and an evidence cite - provenance and efficacy are different claims and must not share a reference on one row`,
        );
  }

  // One reference, one string. The verification pass (docs/TODO.md #1) asks a human
  // to check each source once - which only works if a source reads the same
  // everywhere. Two renderings of one reference (a short form in a test, the full
  // form in a claim) look like two sources and cannot be grepped as one. Billat 2001
  // had drifted into three forms, one with the wrong initials, before this ran.
  // A source is a reference like any other: one work, one string, whether it appears
  // as provenance or as evidence.
  const citeForms: Record<string, Set<string>> = {};
  const noteForm = (c: string) => {
    const key = citeKey(c);
    if (key) (citeForms[key] ??= new Set()).add(c);
  };
  for (const row of rows) {
    for (const src of row.source ?? []) noteForm(src);
    for (const a of assertions(row)) for (const c of a.evidence.cite ?? []) noteForm(c);
  }
  for (const [key, forms] of Object.entries(citeForms))
    if (forms.size > 1)
      add(
        "discipline",
        "one-reference-one-string",
        key,
        `citation "${key}" appears in ${forms.size} renderings - pick one canonical string:\n` +
          [...forms].map((f) => `      - ${f}`).join("\n"),
      );

  // Evidence needs something to be evidence *for*. A system row claiming more than
  // tradition without a claim.proposition is unfalsifiable by construction - the
  // cite sits there with nothing stating what it is supposed to have shown. Found
  // in 6 of 13 rows during the TODO #1b pass; this keeps it from coming back.
  for (const s of systems)
    if (s.evidence && s.evidence.tier !== "tradition" && !s.claim?.proposition)
      add(
        "discipline",
        "claim-proposition-required",
        s.id,
        `${s.id}: evidence.tier="${s.evidence.tier}" needs a claim.proposition - evidence with nothing to be evidence for cannot be checked or falsified`,
      );

  // A test is a procedure derived from the claim, so a source that establishes the
  // claim cannot independently establish the test - reusing it double-counts one
  // reading as two assertions and inflates every tier count. Every cited test in the
  // seed data reused its claim's cite verbatim, all eight of them, which is what a
  // slot carrying no information of its own looks like. The bar is disjointness, not
  // non-containment: the objection is per reference, so a test citing [A, B] against
  // a claim citing [A] still double-counts A. What a test *may* cite is a source
  // about measurement - that one is disjoint by construction.
  for (const w of workouts) {
    const claimCites = new Set<string>(w.claim?.evidence?.cite ?? []);
    for (const c of w.test?.evidence?.cite ?? [])
      if (claimCites.has(c))
        add(
          "discipline",
          "test-cite-duplicates-claim",
          w.id,
          `${w.id}: test cites "${c.slice(0, 45)}..." which its claim already cites - a test's evidence must stand on its own or not exist`,
          "test.evidence",
        );
  }

  // A test is a field-observation heuristic, not a physiological finding, and the
  // dataset says so itself: `confounds` requires at least one, and the worst kind
  // acts through the claim's own mechanism and is inseparable by observation. A
  // signal a row declares mechanistically indistinguishable cannot simultaneously be
  // what the field has settled. `consensus` belongs to claims only.
  for (const w of workouts)
    if (w.test?.evidence?.tier === "consensus")
      add(
        "discipline",
        "test-consensus",
        w.id,
        `${w.id}: test.evidence.tier=consensus - a test is an observation heuristic carrying its own confounds, and the top tier is for claims`,
        "test.evidence",
      );

  // `consensus` asserts that the field agrees, which no single source states and no
  // generator can read off a bibliography. It is the one tier whose bar requires
  // someone to have opened the paper, so it inherits the human-sign-off gate instead
  // of duplicating it: status answers "has a human read this", tier answers "how well
  // is it supported", and only the top tier makes the first a precondition of the
  // second.
  for (const row of rows)
    for (const a of assertions(row))
      if (a.evidence.tier === "consensus" && row.status !== "verified")
        add(
          "discipline",
          "consensus-requires-verified",
          row.id,
          `${row.id}: tier=consensus on a status="${row.status}" row - the top tier requires the human read that status records`,
          a.path,
        );

  // Nothing ships verified while its citations are unchecked.
  for (const row of rows)
    if (row.status === "verified")
      add(
        "discipline",
        "generator-verified",
        row.id,
        `${row.id}: status=verified requires L4 human sign-off, not a generator`,
      );

  return found;
}
