# ADR 0002 — Move the view layer to a component model (Preact)

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
| `src/views.jsx` | 1,028 lines, single file, no component boundaries                                                                                                                                    |
| Markup          | template literals; structure is not checkable, only readable                                                                                                                         |
| Escaping        | manual `esc()` at every interpolation — one omission is a hole                                                                                                                       |
| View tests      | none. `tests/dataset.test.ts` covers the data scripts only, and `vp test` cannot run in this environment (missing vitest bin) — CI runs validate/render/check/build and never `test` |

ADR 0001 itself predicted this: _"`src/main.js` is ~1,000 lines and will need
splitting on its own merits as affordances land."_

## Decision

**Move the view layer to Preact components, incrementally, preserving the property
that makes the prerenderer trustworthy.**

### The constraint that picks the framework

The load-bearing property of ADR 0001's architecture is that **the browser and the
prerenderer render from one source**, so a prerendered page and a client-rendered
one cannot drift. Any component model here must therefore render to a **string in
Node**. That, plus the resident-corpus decision, rules out most of the field:

- **Preact — chosen.** `preact-render-to-string` renders to a string in Node.
  Runtime is ~4kB where React's is ~45kB, which matters precisely because the
  bundle is ~85% data: a large view runtime would be a visible regression against
  a corpus that is the point of the download. JSX auto-escapes, retiring the manual
  `esc()` footgun structurally rather than by discipline.
- **React** — same model, ~10× the runtime for no benefit at this size.
- **Astro / TanStack Start** — still rejected, for ADR 0001's reasons. Neither the
  per-page data splitting nor the server-runtime machinery fits a static dictionary
  whose search needs the whole corpus client-side.

### Migration shape

Views keep returning **strings**, so the router, the browser shell, and the
prerenderer are untouched and the migration proceeds **one view at a time** rather
than as a big-bang rewrite. A `ctx` object carries what the module-level closure
used to supply (`t`, `lang`, `url`, the lookup maps, the reverse indexes).

## Consequences

**The real cost, stated plainly:** the prerenderer can no longer `import` the views
directly, because Node cannot parse JSX. `vp run pages` now runs an SSR build
(`vp build --ssr src/views.jsx --outDir .ssr`) and `scripts/prerender.mjs` imports
the built module. One extra build step, and a `.ssr/` artifact to gitignore. This
is the price of the component model and it is worth naming rather than hiding.

Two smaller costs:

- **Bundle: 60.8kB → 69.4kB gzipped (+8.6kB).** About half of that is
  `preact-render-to-string`, which is currently in the _client_ bundle too, because
  the browser still renders to a string and assigns `innerHTML`. Switching the
  shell to Preact's DOM render (`render(<App/>, container)`) drops it and recovers
  roughly half. That is the natural next step, not part of this decision.
- **JSX must be configured on `oxc`, not `esbuild`.** Vite+ transforms with oxc;
  without `importSource` there, JSX resolves to `react/jsx-runtime` and the build
  fails. `tsconfig.json`'s `jsx` settings inform only the type checker.

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

## Do not do

- Do not convert views without checking prerender parity against a baseline. It is
  the cheap proof that the one-source property still holds.
- Do not let a converted view reach for browser globals. `views.jsx` stays pure;
  DOM work belongs in `src/main.js`.
- Do not add a router, a state library, or a data-fetching layer along with the
  component model. Nothing in ADR 0001's analysis of those changed.

## Remaining work

1. Convert the other views (`system` detail, `workout` detail, lists, search) the
   same way, one at a time, each with a parity check.
2. Switch the browser shell from `innerHTML` to Preact DOM rendering, which drops
   `preact-render-to-string` from the client bundle.
3. Get `vp test` running and put component render tests behind it in CI — the gap
   this ADR names and does not itself close.
