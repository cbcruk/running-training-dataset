#!/usr/bin/env node
import Ajv2020 from "ajv/dist/2020.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const j = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));

const workoutSchema = j("data/schema/workout.schema.json");
const systemSchema = j("data/schema/system.schema.json");
const usageSchema = j("data/schema/usage.schema.json");
const anchorSchema = j("data/schema/anchor-model.schema.json");
const adaptationSchema = j("data/schema/adaptation.schema.json");

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addSchema(workoutSchema, "workout.schema.json");
ajv.addSchema(systemSchema, "system.schema.json");
ajv.addSchema(usageSchema, "usage.schema.json");
ajv.addSchema(anchorSchema, "anchor-model.schema.json");
ajv.addSchema(adaptationSchema, "adaptation.schema.json");

const workouts = j("data/workouts.json");
const systems = j("data/systems.json");
const usage = j("data/usage.json");
const anchors = j("data/anchors.json");
const adaptations = j("data/adaptations.json");

const errors = [];
const fail = (m) => errors.push(m);

// ---- L1: schema ----
for (const [name, list, key] of [
  ["workout", workouts, "workout.schema.json"],
  ["system", systems, "system.schema.json"],
  ["usage", usage, "usage.schema.json"],
  ["anchor", anchors, "anchor-model.schema.json"],
  ["adaptation", adaptations, "adaptation.schema.json"],
]) {
  const validate = ajv.getSchema(key);
  list.forEach((row, i) => {
    if (!validate(row)) {
      // ajv reports every non-matching item of a `contains` as its own error. Noise.
      // Keep the `contains` verdict itself and drop the per-item fallout.
      const errs = validate.errors.filter((e) => !/\/contains\//.test(e.schemaPath));
      for (const e of errs) {
        fail(
          `[schema] ${name}[${i}] ${row.id ?? row.model ?? row.calls_it ?? ""} ${e.instancePath} ${e.message}`,
        );
      }
    }
  });
}

// ---- L2: referential integrity ----
const wIds = new Set(workouts.map((w) => w.id));
const sIds = new Set(systems.map((s) => s.id));

const dupes = (arr) => arr.filter((v, i) => arr.indexOf(v) !== i);
for (const d of dupes(workouts.map((w) => w.id))) fail(`[ref] duplicate workout id: ${d}`);
for (const d of dupes(systems.map((s) => s.id))) fail(`[ref] duplicate system id: ${d}`);

// The measurement layer must cover every anchor the data actually uses, so a
// system's intensity_model or a workout's anchor can never lack a "what does it
// take to measure this" answer.
const anchorModels = new Set(anchors.map((a) => a.model));
for (const d of dupes(anchors.map((a) => a.model))) fail(`[ref] duplicate anchor model: ${d}`);
for (const s of systems)
  if (!anchorModels.has(s.intensity_model))
    fail(`[ref] system ${s.id}: intensity_model "${s.intensity_model}" has no anchors.json entry`);
for (const w of workouts)
  for (const a of w.intensity.anchors)
    if (!anchorModels.has(a.model))
      fail(`[ref] ${w.id}: anchor model "${a.model}" has no anchors.json entry`);
// Exactly one equipment-free anchor, and it must be rpe_10 - the same principle
// the workout schema enforces per row (exactly one rpe_10). The universal floor
// is singular by definition; two would mean the fallback is ambiguous.
const free = anchors.filter((a) => a.equipment_free).map((a) => a.model);
if (free.length !== 1 || free[0] !== "rpe_10")
  fail(
    `[discipline] anchors.json: the sole equipment_free anchor must be rpe_10, got [${free.join(", ")}]`,
  );

// The adaptation taxonomy must cover every target_adaptation the data uses, so a
// workout can never target an adaptation the taxonomy does not define/group.
const adaptationIds = new Set(adaptations.map((a) => a.id));
for (const d of dupes(adaptations.map((a) => a.id))) fail(`[ref] duplicate adaptation id: ${d}`);
for (const w of workouts)
  for (const t of w.target_adaptation)
    if (!adaptationIds.has(t))
      fail(`[ref] ${w.id}: target_adaptation "${t}" has no adaptations.json entry`);

const walk = (segs, cb) =>
  segs.forEach((s) => {
    cb(s);
    if (s.children) walk(s.children, cb);
  });

for (const w of workouts) {
  walk(w.structure.segments, (s) => {
    if (s.intensity_ref && s.intensity_ref !== "self" && !wIds.has(s.intensity_ref))
      fail(`[ref] ${w.id}: intensity_ref "${s.intensity_ref}" is not a workout id`);
    if (s.ramp_to && s.ramp_to !== "self" && !wIds.has(s.ramp_to))
      fail(`[ref] ${w.id}: ramp_to "${s.ramp_to}" is not a workout id`);
  });
  for (const r of w.prerequisites?.requires_workouts ?? [])
    if (!wIds.has(r)) fail(`[ref] ${w.id}: requires_workouts "${r}" unknown`);
  if (
    w.intensity.primary_anchor &&
    !w.intensity.anchors.some((a) => a.model === w.intensity.primary_anchor)
  )
    fail(`[ref] ${w.id}: primary_anchor "${w.intensity.primary_anchor}" not in anchors`);
  // One reading per model. Two pct_hrmax anchors is not nuance, it is an unresolved disagreement with itself.
  for (const d of dupes(w.intensity.anchors.map((a) => a.model)))
    fail(`[discipline] ${w.id}: duplicate anchor model "${d}"`);
}
for (const s of systems)
  for (const p of s.phases ?? [])
    for (const e of p.emphasis)
      if (!wIds.has(e)) fail(`[ref] system ${s.id} phase ${p.name}: unknown workout "${e}"`);

for (const u of usage) {
  if (!wIds.has(u.workout)) fail(`[ref] usage "${u.calls_it}": unknown workout "${u.workout}"`);
  if (u.system !== null && !sIds.has(u.system))
    fail(`[ref] usage "${u.calls_it}": unknown system "${u.system}"`);
}

// ---- L3: project-specific discipline ----
// Colloquial names must never leak into the workout row. They belong in usage.json.
const BANNED_IN_ID = ["tempo", "easy-pace", "lt-run", "pickup"];
for (const w of workouts)
  for (const b of BANNED_IN_ID)
    if (w.id.includes(b) || w.canonical_name.toLowerCase().includes(b))
      fail(
        `[discipline] ${w.id}: overloaded colloquial term "${b}" in id/canonical_name. Put it in usage.json.`,
      );

// Every workout must be reachable by at least one name, else it is undiscoverable.
for (const w of workouts)
  if (!usage.some((u) => u.workout === w.id))
    fail(`[discipline] ${w.id}: no usage row - unnameable, therefore unfindable`);

// A bet is one sentence. If it needs a paragraph it is philosophy, and there is a field for that.
for (const s of systems)
  for (const lang of ["ko", "en"]) {
    const b = s.bet[lang];
    if (b.length > 90)
      fail(
        `[discipline] system ${s.id}: bet.${lang} is ${b.length} chars - not a bet, that is philosophy`,
      );
    if ((b.match(/[.!?。]/g) ?? []).length > 1)
      fail(`[discipline] system ${s.id}: bet.${lang} is more than one sentence`);
  }

// switching_cost.anchor_change is derivable from intensity_model, therefore verifiable.
const sysById = Object.fromEntries(systems.map((s) => [s.id, s]));
for (const s of systems)
  for (const sc of s.switching_cost ?? []) {
    if (sc.from === s.id) fail(`[discipline] system ${s.id}: switching_cost from itself`);
    const src = sysById[sc.from];
    if (!src) {
      fail(`[ref] system ${s.id}: switching_cost.from "${sc.from}" unknown`);
      continue;
    }
    const expected = `${src.intensity_model} -> ${s.intensity_model}`;
    if (sc.anchor_change !== expected)
      fail(
        `[discipline] system ${s.id} <- ${sc.from}: anchor_change "${sc.anchor_change}" contradicts intensity_model, expected "${expected}"`,
      );
  }

// A confound acting through the claim's own mechanism is severe by definition.
for (const w of workouts)
  for (const c of w.test.confounds ?? [])
    if (c.shares_mechanism === true && c.severity !== "high")
      fail(
        `[discipline] ${w.id}: confound "${c.factor}" shares_mechanism but severity="${c.severity}" - mechanistic indistinguishability is high by definition`,
      );

// A cite must look like a citation, not a URL or a vibe.
const collectEvidence = (o, path = "") => {
  const out = [];
  if (o && typeof o === "object") {
    if (o.tier) out.push([path, o]);
    for (const [k, v] of Object.entries(o)) out.push(...collectEvidence(v, `${path}/${k}`));
  }
  return out;
};
for (const w of [...workouts, ...systems])
  for (const [path, ev] of collectEvidence(w))
    for (const c of ev.cite ?? [])
      if (!/\(\d{4}\)/.test(c))
        fail(`[discipline] ${w.id}${path}: cite lacks a (year): "${c.slice(0, 50)}"`);

// Nothing ships verified while its citations are unchecked.
for (const w of [...workouts, ...systems])
  if (w.status === "verified")
    fail(`[discipline] ${w.id}: status=verified requires L4 human sign-off, not a generator`);

// ---- report ----
const tiers = {};
for (const w of [...workouts, ...systems])
  for (const [, ev] of collectEvidence(w)) tiers[ev.tier] = (tiers[ev.tier] ?? 0) + 1;

console.log(
  `workouts: ${workouts.length}  systems: ${systems.length}  usage: ${usage.length}  anchors: ${anchors.length}  adaptations: ${adaptations.length}`,
);
console.log(`evidence tiers:`, tiers);
const collisions = {};
for (const u of usage) (collisions[u.calls_it] ??= new Set()).add(u.workout);
const real = Object.entries(collisions).filter(([, v]) => v.size > 1);
for (const [name, set] of real) console.log(`collision: "${name}" -> ${[...set].join(", ")}`);

if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  errors.forEach((e) => console.error("  " + e));
  process.exit(1);
}
console.log("\nOK");
