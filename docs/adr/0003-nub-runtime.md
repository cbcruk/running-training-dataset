# ADR 0003 — Run the scripts under nub

**Status:** accepted · 2026-08-05
**Removes a cost introduced by:** [ADR 0002](0002-component-model.md)

---

## Context

ADR 0002 moved the views to React components and paid for it in two places, both
recorded there at the time:

1. **An intermediate build.** Node cannot parse JSX, so `scripts/prerender.mjs`
   could not import `src/data.tsx`. `vp run pages` first ran
   `vp build --ssr src/data.tsx --outDir .ssr`, and the prerenderer imported the
   built module. One more build step, one more artifact to gitignore, and a copy of
   the views sitting between the source and the output.
2. **`scripts/` stayed JavaScript.** Converting them to TypeScript would have meant
   a build step for `scripts/` too, so they stayed `.mjs` - unchecked by the type
   checker - and `svg.mjs`, which components import, needed a hand-written
   `svg.d.mts` alongside it.

Both are the same problem: the toolchain could not run TypeScript or JSX directly.

## Decision

**Run `scripts/` under [nub](https://github.com/nubjs/nub)** (`@nubjs/nub`), a Node
toolchain CLI that transpiles TS/JSX on the fly via Oxc. Adopt it as a **runtime
only**.

`pnpm` still installs and `vp build` still bundles the browser app. Nub replaces
`node` in the `scripts/` entry points and nothing else. That deliberately avoids
migrating the package manager, which would put `pnpm-workspace.yaml`'s `catalog:`
protocol - the mechanism Vite+ uses to pin itself - on the line for no benefit.

### What it removes

- **The SSR build is gone.** `scripts/prerender.tsx` imports `src/data.tsx`
  directly. No `.ssr/` artifact, no generated copy between source and output. The
  ADR 0001 property that the prerenderer and the browser render from one source is
  now literally true rather than true-via-a-build.
- **`scripts/` is TypeScript**, and type-checked for the first time. That surfaced
  71 errors in code that had never been checked - all of them now fixed.
- **`svg.d.mts` is deleted.** `svg.ts` is typed at the source it is defined in.

### What it does not fix

Worth stating, because the appeal of a consolidated tool is that it looks like it
fixes everything:

- **`vp test` is still broken here** (missing vitest bin). That is a Vite+ packaging
  problem; nub is not a test runner. The view-test gap ADR 0002 names stays open.
- **Bundle size** is untouched - that is the browser build, which is still Vite+.
- **pnpm's substring script matching** (`pnpm run render` also firing a script named
  `prerender`) is still a live hazard, since pnpm still runs the scripts.

## Consequences

**Accepted:**

- One fewer build step, one fewer artifact, and `scripts/` under the type checker.
- CI installs nub (`npm install -g @nubjs/nub`) in both workflows.

**Risks, knowingly taken:**

- **nub is pre-1.0** (v0.7.1, first published 2026-05-27, 124 releases since). It is
  moving fast and its behaviour may change under us. The blast radius is bounded:
  it runs scripts, so a regression breaks the build loudly rather than shipping bad
  data - `validate.ts` and the prerender parity check both still gate.
- **Generated types are runtime-sensitive.** `scripts/types.ts` is deterministic
  under a given runtime, but `json-schema-to-typescript` emits slightly different
  intersections under nub than under node. The committed types are therefore
  nub-generated, and CI must run the same runtime or the drift guard fails on a
  difference that means nothing. This is a real papercut of standardising on nub
  and is the reason the CI step exists at all.

## Do not do

- Do not adopt nub as the package manager without checking `pnpm-workspace.yaml`'s
  `catalog:` entries first - Vite+ pins itself through them.
- Do not regenerate `src/types/` under plain `node`; the output will differ from the
  committed copy for no semantic reason.
