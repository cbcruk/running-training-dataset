# ADR 0004 — Settle the browse layer on TanStack Router

**Status:** accepted · 2026-08-06
**Supersedes the routing parts of:** [ADR 0001](0001-dictionary-shape.md) (which
rejected TanStack) and [ADR 0002](0002-component-model.md)

---

## Context

The toolchain question kept reopening — vanilla, Preact, React, Astryx, nub — and
each round moved the app layer while the data roadmap (the actual point of this
project) stood still. This ADR exists to **stop that**, by naming a destination
rather than another increment.

The trigger was a real concern: the hand-rolled browser shell keeps growing.
`main.ts` had reached 270 lines of routing, link interception, keyboard handling,
recently-viewed and service-worker wiring, and every new affordance lands there.

ADR 0001 rejected TanStack, but on a narrower reading than the name suggests: it
was rejecting **TanStack Query** (fetching, caching, mutations — none of which this
project has) and **TanStack Start** (a server runtime). A _router_ was never
weighed on its own, and now that the views are React it is a fair question.

## Decision

**Adopt `@tanstack/react-router` for routing. Keep prerendering.**

### Router, not Start

`@tanstack/react-start` was considered and declined. Its headline SPA mode ships a
single `_shell.html`, and its own documentation states the two costs:

> "Slower time to content: all JS must download and execute before anything below
> the shell can be rendered"
> "SEO challenges: Robots, crawlers and **link unfurlers** may have a harder time
> indexing your application"

Both were measured here before the docs were read, and they agree:

|             | entry visible (Fast 3G, 4× CPU) | what a link unfurler sees                                     |
| ----------- | ------------------------------- | ------------------------------------------------------------- |
| prerendered | **~400 ms**                     | per-entry title, description, OG tags, 1,849 chars of content |
| SPA shell   | **2,942 ms**                    | one generic title, no OG tags, **0 chars**                    |

Start would mean adopting a framework that owns the build in order to decline its
main mode. The router alone replaces the hand-rolled routing without touching what
was measured to work.

### Prerendering survives, and is now expressed through the router

`scripts/prerender.tsx` builds one router per route with a memory history and
renders it with `renderToStaticMarkup`. The browser builds the same tree with a
browser history. ADR 0001's load-bearing property — both hosts render from one
source — is unchanged; it is now a route tree instead of a hand-rolled switch.

## Consequences

**What this removed:** the hand-rolled `route()`/`navigate()`/`currentPath()`
switch, the click interceptor, the popstate wiring, and the per-view
`renderSystemDetail`-style wrappers. `src/views.tsx` shrank to `src/data.tsx`
(332 lines) — data access and route metadata only. The shell also moved from
`innerHTML` to a React root, closing ADR 0002's remaining item 1.

**What it cost, measured:**

- **Bundle: 122.9 → 147.6 kB gzipped (+25 kB).** Less than the +82 kB the router
  first added, because retiring the hand-rolled render path took most of it back.
  Against the original vanilla build (60.8 kB) the browse layer is now 2.4×. ADR
  0001 argued the bundle is mostly corpus and that this is the point; the corpus is
  now roughly half of it. This is the price of the conventional stack, accepted
  knowingly.
- **Time to entry: ~374 ms → ~405 ms.** Still ~7× better than the SPA variant.

**Two things the router did not fix, and one trap it set:**

- Plain `<a href>` is **not** intercepted by TanStack Router. The first integration
  passed every functional check while silently doing a **full page reload on every
  navigation** — the "app for use" half of the dictionary, gone, with no error to
  show for it. Fixed by routing every internal link through one `EntryLink`
  adapter over TanStack's `Link`. **Any new internal link must use it**; a raw
  anchor will look correct and quietly regress navigation.
- Keyboard lookup, recently-viewed and the service worker are not routing concerns
  and stayed hand-written in `src/main.tsx`.

## Verification

Every step was checked against the 44-route prerender snapshot. The comparison now
normalizes **attribute order**, because `Link` emits `href` before `class` where
the hand-written anchors emitted `class` first; attribute order is not semantic in
HTML, and text content was identical throughout. Final state: **44/44 identical**,
0 full reloads across card / cross-reference / back navigation, and keyboard,
recently-viewed and offline (cached _and_ never-visited entries) all still pass.

## This closes the toolchain question

The browse layer is settled: **React components, TypeScript with schema-generated
data types, TanStack Router, prerendered entries, nub for scripts, Vite+ for the
bundle.** Reopen it only if one of these actually breaks:

- Routing needs data loading, code-splitting per route, or nested layouts — the
  things TanStack Router has that this does not yet use.
- The bundle becomes a measured problem for real readers, not a number that looks
  large.
- The prerender parity check fails and cannot be made to pass.

Otherwise the work is in `docs/TODO.md`: verification (§1b), distribution depth
(§3b/3c), and growing the corpus. Every row is still `status: draft`, which is the
thing this project is actually about.
