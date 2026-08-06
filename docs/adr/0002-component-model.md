# ADR 0002 — Move the view layer to a component model (React + TypeScript + Astryx)

**Status:** accepted · 2026-08-05
**Amends:** [ADR 0001](0001-dictionary-shape.md), which rejected adopting a web
framework. That decision stands on its own terms; this one adds an axis it did
not weigh.

---

## Context

ADR 0001 evaluated frameworks purely on **problem fit** and concluded, correctly,
that none of the defects it identified needed one. That prediction held: real URLs
took a 98-line prerenderer, offline took a 71-line service worker, and the
keyboard/recently-viewed affordances took about 120 lines in the shell. No
framework would have made any of them meaningfully smaller.

What ADR 0001 never put on the scale was **how it is to work in the code**. That is
a legitimate engineering axis, and by the time the affordances landed the cost had
become concrete rather than aesthetic:

|                 |                                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/views.tsx` | 1,028 lines, single file, no component boundaries                                                                                                                                    |
| Markup          | template literals; structure is not checkable, only readable                                                                                                                         |
| Escaping        | manual `esc()` at every interpolation — one omission is a hole                                                                                                                       |
| View tests      | none. `tests/dataset.test.ts` covers the data scripts only, and `vp test` cannot run in this environment (missing vitest bin) — CI runs validate/render/check/build and never `test` |

ADR 0001 itself predicted this: _"`src/main.js` is ~1,000 lines and will need
splitting on its own merits as affordances land."_

## Decision

**Move the view layer to React components with the Astryx design system,
incrementally, preserving the property that makes the prerenderer trustworthy.**

### The constraint that picks the framework

The load-bearing property of ADR 0001's architecture is that **the browser and the
prerenderer render from one source**, so a prerendered page and a client-rendered
one cannot drift. Any component model here must therefore render to a **string in
Node**. That, plus the resident-corpus decision, rules out most of the field:

- **React — chosen.** `react-dom/server`'s `renderToStaticMarkup` renders to a
  string in Node, which satisfies the constraint. It is the conventional choice:
  the largest ecosystem, the most transferable knowledge, and the prerequisite for
  Astryx below.
- **Preact** was the first spike, at roughly a tenth of React's runtime. It was
  set aside deliberately: the measured saving is real but the conventional stack
  was judged worth more than the bytes. The cost is recorded below rather than
  waved away.
- **Astro / TanStack Start** — still rejected, for ADR 0001's reasons. Neither the
  per-page data splitting nor the server-runtime machinery fits a static dictionary
  whose search needs the whole corpus client-side.

### Astryx as the design system

[Astryx](https://github.com/facebook/astryx) is Meta's open-source design system -
a React component library, **not** a framework. That distinction matters here: it
layers on top of the existing architecture and touches neither the router, the
build model, nor the prerenderer, so nothing in ADR 0001 is disturbed by it.

Compatibility was verified rather than assumed: Astryx components render to a
string in Node through `react-dom/server`, and `variant` props survive into the
prerendered markup as `data-variant` attributes plus StyleX atomic classes. The
package ships a prebuilt `astryx.css` (127 kB), so no build plugin is needed.

### Migration shape

Views keep returning **strings**, so the router, the browser shell, and the
prerenderer are untouched and the migration proceeds **one view at a time** rather
than as a big-bang rewrite. A `ctx` object carries what the module-level closure
used to supply (`t`, `lang`, `url`, the lookup maps, the reverse indexes).

## Consequences

**The real cost, stated plainly:** the prerenderer can no longer `import` the views
directly, because Node cannot parse JSX. `vp run pages` now runs an SSR build
(`vp build --ssr src/views.tsx --outDir .ssr`) and `scripts/prerender.mjs` imports
the built module. One extra build step, and a `.ssr/` artifact to gitignore. This
is the price of the component model and it is worth naming rather than hiding.

Two smaller costs:

- **Bundle: 60.8kB → 122.9kB gzipped (+62kB, roughly double).** Measured, not
  estimated. Preact came in at 69.4kB (+8.6kB) for the same views, so the
  conventional stack costs about 53kB gzipped over the small one. Astryx adds a
  127 kB stylesheet on top. This is a real regression against a bundle whose whole
  point is the corpus, and it is accepted knowingly rather than overlooked.
- **`preact-render-to-string` is gone; `react-dom/server` rides along in the
  client bundle** for the same reason - the browser still renders to a string and
  assigns `innerHTML`. Moving the shell to React DOM rendering removes it.
- **JSX must be configured on `oxc`, not `esbuild`.** Vite+ transforms with oxc;
  `tsconfig.json`'s `jsx` settings inform only the type checker, not the bundler.
- **Astryx needs a build-script allowlist.** pnpm blocks postinstall scripts by
  default and _fails the install_, which breaks `vp build`. `pnpm-workspace.yaml`
  now carries `allowBuilds: {"@astryxdesign/core": true}`. The script itself only
  prints a setup nudge, but note that it reads agent-doc files (`CLAUDE.md`,
  `AGENTS.md`, `.cursorrules`) and that `astryx init` _writes_ into them — worth
  knowing before running init on a repo whose `CLAUDE.md` carries project rules.

**What is gained:**

- Component boundaries, so a view is readable and changeable in isolation.
- Escaping by construction rather than by remembering.
- A unit of testing that did not exist before: a component can be rendered to a
  string and asserted on, without a browser.

**What is explicitly preserved:**

- One source of markup for both hosts — proven, not assumed (below).
- The whole corpus resident client-side (ADR 0001), and with it global instant
  search and offline for never-visited entries.
- The Vite+ toolchain: `vp install` / `vp check` / `vp build` unchanged.

## Verification

The spike converted `renderAnchorDetail` (the anchor entry) and compared the
prerendered `<main>` against a baseline captured from `main` before the change:

- **6,549 characters, identical**, after normalizing `&#39;`/`&quot;` — the old
  `esc()` escaped apostrophes in text nodes, which JSX correctly does not. No
  structural difference at all.
- Escaping still correct: no raw `<` in text nodes.
- Browser: cold prerendered load, client-side navigation into the view, and a
  language toggle re-render all produce the same 6 blocks and 6 switch entries,
  with no console errors.

### The tier badge does not map onto a generic variant scale

Astryx's `Badge` offers `neutral / success / warning / danger / info`. The tier
badge is **not** a status indicator on that scale, and forcing it onto one would be
a category error the README explicitly bans:

| tier        | means                          | not     |
| ----------- | ------------------------------ | ------- |
| `consensus` | textbook, settled              | success |
| `plausible` | studied, contested             | warning |
| `tradition` | everyone does it, nobody knows | danger  |

`tradition` is not a failure state; it is an honest admission. Rendering it as
`danger` would say something false, and rendering all three as `neutral` would
flatten exactly the distinction the project exists to preserve — _"browsing ten
systems can never make a `tradition` system look as settled as a `consensus` one."_

**So the tier badge keeps its bespoke styling** even as the rest of the views adopt
Astryx. Cards, text, and layout map cleanly; this one does not, and it is the one
that carries the epistemics.

## Do not do

- Do not convert views without checking prerender parity against a baseline. It is
  the cheap proof that the one-source property still holds.
- Do not replace the tier badge with a generic status variant. See above.
- Do not let a converted view reach for browser globals. `views.jsx` stays pure;
  DOM work belongs in `src/main.js`.
- Do not add a router, a state library, or a data-fetching layer along with the
  component model. Nothing in ADR 0001's analysis of those changed.

### TypeScript, with data types generated from the schemas

The view layer is TypeScript. The decision worth recording is not _that_ but
**where the data types come from**: they are **generated from `data/schema/*.json`**
by `scripts/types.mjs`, not hand-written.

Hand-written interfaces would be a second description of the same shapes, free to
drift from the schemas `validate.mjs` actually enforces. That is the failure the
citation policy exists to prevent (`docs/TODO.md` #1a), applied to types. Generated
output is committed so a fresh clone type-checks immediately, and CI regenerates it
and fails if anything moved - using `git status --porcelain` rather than `git diff`,
so generated files that were never committed cannot pass the check vacuously.

One module per schema: every schema declares its own `$defs/i18n`, so compiling
them into a single file collides on the generated name.

Two things stay plain JS deliberately. `scripts/*.mjs` are Node entry points -
converting them would mean a build step for `scripts/` too - so `svg.mjs`, which
components import, carries a hand-written `svg.d.mts` instead. And `src/types/view.ts`
is hand-written, because it describes how views are _called_, which the schemas
have nothing to say about.

## Migration status

**All views are converted.** `src/views.tsx` went from 1,028 lines of template
literals to 358 lines of routing, metadata, and context assembly; the markup lives
in `src/components/` as five files. Every step was checked against a 44-route
prerender snapshot, and every step came back **44/44 identical** - including the
workout entry, which embeds a generated SVG and the confound/test blocks.

The duplication the template-literal version could not avoid is gone with it: the
system and workout cards were open-coded twice, once for a list and once for
search, and are now one component with a `brief` prop.

`esc()` is deleted. There is no manual escaping left in the view layer.

The whole conversion - components _and_ TypeScript - held 44/44 prerender parity at
every step. Type errors went 209 → 0.

## Remaining work

2. Switch the browser shell from `innerHTML` to React DOM rendering, which drops
   `react-dom/server` from the client bundle.
3. Get `vp test` running and put component render tests behind it in CI — the gap
   this ADR names and does not itself close.
