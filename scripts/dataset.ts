// Loading the dataset off disk - the one place that knows where the files are.
//
// Kept apart from rules.ts so the rules stay pure: a test can load once, change
// one field in memory, and ask what breaks, without writing to the repo. That is
// the difference between probing a rule and staging a file, spawning a process
// and grepping its output.
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = any;

export interface Dataset {
  workouts: Row[];
  systems: Row[];
  usage: Row[];
  anchors: Row[];
  adaptations: Row[];
  /** JSON Schemas by file name, e.g. `workout.schema.json`. */
  schemas: Record<string, Row>;
}

export function load(root: string): Dataset {
  const j = (p: string): Row => JSON.parse(readFileSync(resolve(root, p), "utf8"));
  const schemaDir = resolve(root, "data/schema");
  const schemas: Record<string, Row> = {};
  for (const f of readdirSync(schemaDir).filter((f) => f.endsWith(".schema.json")))
    schemas[f] = JSON.parse(readFileSync(resolve(schemaDir, f), "utf8"));

  return {
    workouts: j("data/workouts.json"),
    systems: j("data/systems.json"),
    usage: j("data/usage.json"),
    anchors: j("data/anchors.json"),
    adaptations: j("data/adaptations.json"),
    schemas,
  };
}

/**
 * A copy of the dataset with one row replaced by a patched version of itself.
 *
 * Exists for the rule tests: the way to show a rule fires is to break the real
 * data in exactly one way and see exactly one finding, which needs the break to
 * be cheap and the original left alone.
 */
export function patch(
  data: Dataset,
  list: "workouts" | "systems" | "usage" | "anchors" | "adaptations",
  id: string,
  change: (row: Row) => Row,
): Dataset {
  const key = list === "anchors" ? "model" : "id";
  const rows = data[list].map((r: Row) => {
    if (r[key] !== id) return r;
    const clone = structuredClone(r);
    return change(clone) ?? clone;
  });
  return { ...data, [list]: rows };
}
