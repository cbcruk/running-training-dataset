# ADR 0001 — The catalog is a dictionary: prerendered entries, client-side index

**Status:** accepted · 2026-08-05 — amended by [ADR 0002](0002-component-model.md),
which adopts a component model for the view layer on an axis this ADR did not weigh
(how it is to work in the code). Everything below still holds; the framework
rejection was about problem fit, and Astro/TanStack remain rejected.
**Decides:** whether to keep the dataset in JSON; whether to adopt a web framework
(Astro, TanStack). Both reduce to one prior judgment — what kind of thing this is —
recorded here.

---

## Context

Two questions came up together:

1. Should the data stay in JSON, or move to a database / YAML / some other format?
2. Should the browse layer adopt a web framework — Astro, TanStack?

They look independent. They are not: both are downstream of a question nobody had
written down yet — **what kind of artifact is this?**

Measured state at the time of writing:

|              |                                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Data         | 5 files, 105 rows, 208 KB (`workouts.json` alone is 105 KB / 20 rows)                                                         |
| Shape        | Deeply nested, heterogeneous — a workout has 15 top-level keys, nested `claim`/`test`/`intensity`, arrays of confound objects |
| Bilingual    | 404 ko/en pairs, all nested objects                                                                                           |
| Validation   | JSON Schema 2020-12 + `scripts/validate.mjs` (226 lines) for invariants a schema cannot express                               |
| Browse layer | 982 lines vanilla JS + 817 lines CSS, hash routing                                                                            |
| Bundle       | 194 KB JS (~60 KB gzipped) — ~85% of it is data, all five files eagerly imported                                              |

---

## The framing: not page vs app — it is a dictionary, which is both

The first pass at this decision asked "is this a page or an app?", answered "page,"
and filed the eager full-corpus load as a defect. That binary was too crude, and the
conclusion it produced was wrong in one specific place.

**This is a dictionary.** A reference work of entries — systems, workouts, anchors —
that are looked up, cross-referenced, and compared. Dictionaries split cleanly by how
a reader arrives and what they then do:

| Mode                                                                                        | Behaves like | Requires                                                                                |
| ------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| **Discovery** — arriving at one entry from a search engine or a shared link                 | a page       | real URLs, crawlable content, fast first paint                                          |
| **Use** — looking things up, jumping entry to entry, comparing, searching across everything | an app       | the whole corpus resident client-side, no reload between entries, keyboard-first search |

This is not a compromise position; it is the established shape of the genre. MDN,
Wiktionary, the Rust docs, and most purely **devdocs.io** are all prerendered
per-entry documents wrapped in a client-side index that turns them into an
instant-search application once loaded.

### What this framing corrects

**Loading the entire corpus up front is a feature, not a defect.** It is precisely
what powers this project's headline capability — the collision search, where
`"tempo run"` resolves to two different workouts across the whole dataset — and it is
what would make offline use possible. devdocs downloads whole documentation sets on
purpose, for the same reason. At ~60 KB gzipped this is not a cost worth engineering
against; the concern only becomes real at roughly ten times the current corpus.

That leaves **exactly one genuine defect**: hash routing means `#/anchor/rpe_10` does
not exist as far as a crawler or a link preview is concerned. A dictionary that
search engines cannot see is failing at the discovery half of its job.

---

## Decision

### 1. The data stays JSON

Rejected alternatives, with reasons:

- **A database (SQLite) is disqualified.** Two reasons, the second decisive:
  - The data is nested and heterogeneous. Putting it in tables means either
    flattening what is meaningfully nested, or storing JSON blobs in columns —
    which buys nothing.
  - **Git-diff review _is_ this project's epistemic workflow.** Every row is
    `status: draft`; the only route to `verified` is human sign-off in a pull
    request (see `docs/TODO.md` §1). A binary format deletes that review path. This
    is not a performance question, it is an identity question.
- **YAML is rejected.** Its headline advantage is comments — and this project
  already promoted rationale from comments into _data_ (`caveat`, `note`,
  `evidence.tier`, `fallback`). That is strictly better: validated, rendered in the
  UI, enforced by schema. YAML's main benefit therefore does not apply here, and
  only the migration cost remains.

JSON also happens to be the right format for the dictionary shape: a static asset
graph that a build step can prerender from and a browser can hold in memory whole.

The one genuine JSON pain is **not the format — it is one-file-per-collection**.
`workouts.json` is 105 KB in a single file, so every edit touches it: concurrent
work collides, and a data change is hard to locate in a PR diff.

The fix, when it is time, is **one file per row** (`data/workouts/easy-run.json`).
Loader changes only; schema and `validate.mjs` are unaffected. At 20 rows it is
premature.

> **Revisit trigger:** workouts exceed ~40 rows, **or** the first real merge conflict
> in a data file. Whichever comes first.

### 2. No web framework — the dictionary framing weakens the case rather than strengthening it

Being "an app" here means a set of reader affordances, not a runtime. Each is small,
and none needs a framework:

| Affordance                                                    | Status                                        | Rough cost |
| ------------------------------------------------------------- | --------------------------------------------- | ---------- |
| Instant search across the whole corpus                        | **already built** (collision search)          | —          |
| Dense cross-referencing between entries                       | **already built** (anchor ↔ system ↔ workout) | —          |
| Keyboard-first navigation (`/` to search, arrows, Enter, Esc) | missing                                       | ~40 lines  |
| Offline use (service worker)                                  | missing                                       | ~30 lines  |
| Recently-viewed history                                       | missing                                       | ~30 lines  |

On the two candidates:

- **TanStack is rejected outright, now and later.** TanStack Query exists for data
  fetching, caching, mutations, and server-state synchronisation. This project has
  zero of each — every byte is known at build time. TanStack Router would leave it a
  client SPA with no real URLs, fixing the one defect not at all.
- **Astro is deferred, and the dictionary framing makes its case weaker, not
  stronger.** Astro's central benefit is shipping each page only its own data — which
  is directly at odds with the global instant search that requires the entire corpus
  client-side anyway. Adopting it means paying its cost while forfeiting its main
  advantage. Two further points stand:
  - **Astro is absent from the Vite+ documentation entirely**, while `vp create`
    ships templates for `@tanstack/start`, svelte, nuxt, next-app, react-router, and
    vue. Adopting it means leaving the toolchain that `CLAUDE.md`, CI, and
    `vp check` / `vp build` all assume.
  - The prerender step it would provide is ~50 lines to write directly (below).

### 3. Build toward the dictionary shape, inside the current stack

- **Prerender one HTML file per entry, plus History API routing.** This is the fix
  for the single real defect. `scripts/render.mjs` already walks the data; a sibling
  script emitting per-route HTML yields crawlable, shareable URLs. The client index
  then takes over on load — discovery and use, both served, no framework involved.
- **Keep the full corpus client-side.** It is the feature, not the cost.
- **Add the missing dictionary affordances** (keyboard-first search, offline,
  recently viewed) as small, independent increments.

---

## Consequences

**Accepted:**

- Data review stays a plain-text diff — the property the verification roadmap
  depends on.
- The toolchain stays uniform: `vp install` / `vp check` / `vp test` / `vp build`,
  exactly as `CLAUDE.md` documents.
- The browse layer stays dependency-free. Nothing to keep upgrading.
- Both dictionary modes get served, with prerendering as the only structural work.

**Given up, knowingly:**

- No component model, no typed routing, no MDX. `src/main.js` is ~1,000 lines and
  will need splitting on its own merits as affordances land.
- `workouts.json` stays a merge-conflict magnet until the split trigger fires.
- Until prerendering lands, the catalog remains invisible to search engines.

---

## Do not do

Recorded so these are not re-proposed without new information:

- Do not migrate the dataset to SQLite or any binary/tabular store.
- Do not convert the dataset to YAML for the sake of comments.
- Do not adopt TanStack Query or TanStack Router for this codebase.
- Do not adopt a framework to fix URLs — prerendering is ~50 lines here.
- Do not split the corpus per-route to shrink the bundle. It would break global
  instant search, which is the point of the thing.

## Revisit this ADR when

- The site acquires **content** (method essays, long-form write-ups) rather than
  data rows — that is when MDX and content collections start earning their cost,
  and when Astro should be reconsidered on its merits.
- The corpus passes roughly ten times its current size, making the resident-corpus
  tradeoff worth re-measuring.
- Data files exceed ~40 rows each (triggers the file-split question, not a format
  change).
