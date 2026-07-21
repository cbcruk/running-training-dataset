import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "vite-plus/test";

const run = (script: string): string =>
  execFileSync("node", [`scripts/${script}`], { encoding: "utf8" });

const workouts = JSON.parse(readFileSync("data/workouts.json", "utf8")) as unknown[];

test("dataset passes schema, referential integrity and discipline checks", () => {
  expect(run("validate.mjs")).toContain("OK");
});

test("every workout renders to a schematic svg", () => {
  // Data-driven: one SVG line per workout, so adding rows never breaks this.
  expect(run("render.mjs").trim().split("\n")).toHaveLength(workouts.length);
});
