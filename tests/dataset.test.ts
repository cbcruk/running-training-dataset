import { execFileSync } from "node:child_process";
import { expect, test } from "vite-plus/test";

const run = (script: string): string =>
  execFileSync("node", [`scripts/${script}`], { encoding: "utf8" });

test("dataset passes schema, referential integrity and discipline checks", () => {
  expect(run("validate.mjs")).toContain("OK");
});

test("every workout renders to a schematic svg", () => {
  expect(run("render.mjs").trim().split("\n")).toHaveLength(5);
});
