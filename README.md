# Running Training Dataset

[![CI](https://github.com/cbcruk/running-training-dataset/actions/workflows/ci.yml/badge.svg)](https://github.com/cbcruk/running-training-dataset/actions/workflows/ci.yml)
[![Pages](https://github.com/cbcruk/running-training-dataset/actions/workflows/pages.yml/badge.svg)](https://github.com/cbcruk/running-training-dataset/actions/workflows/pages.yml)

A browsable catalog of running training **systems** — what each one bets, what it costs to run, what happens when you switch, and how much of it is actually known.

**Browse it live: [cbcruk.github.io/running-training-dataset](https://cbcruk.github.io/running-training-dataset/)**

For people who like trying different methods. Light to browse, honest underneath.

Modeled on the shape of [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset), but the atoms are different, so the schema is too.

**Status: early.** 14 systems, 22 workouts. Every row is `status: draft` — no citation has been human-verified. All eight `intensity_model` anchors are now represented by at least one system, and all nine workout families are populated.

---

## Systems are the entry point, workouts are the detail view

Nobody tries `threshold-continuous`. People try **Hansons**. The browsable unit is the system; workouts are supporting cast.

Each system row leads with a **`bet`** — one sentence, what it wagers that others do not:

| system            | bet                                                        |
| ----------------- | ---------------------------------------------------------- |
| `daniels`         | Correct intensity matters more than effort.                |
| `hansons`         | Cap the long run and keep the whole week fatigued instead. |
| `polarized-80-20` | Moderate intensity is wasted work.                         |

One sentence, clickable, and honest — because a bet is not a fact claim. Enforced: over 90 chars or more than one sentence is a validation error. If it needs a paragraph it is `philosophy`, and there is a field for that.

**`commitment`** is the first filter for someone shopping methods: can I even run this? Hansons is 6 days/week and ~60km — non-negotiable, because cumulative fatigue is the premise. 80/20 needs ≥5 sessions/week or the ratio stops meaning anything (at 3 sessions it is 2.4 vs 0.6, an unrepresentable number). Almost nobody states that constraint.

**`switching_cost`** exists for exactly this persona and exists nowhere else. Changing systems silently swaps your intensity anchor:

- daniels → hansons: `daniels-vdot -> race_pace_ref`, **silent**. "Tempo" survives the switch while its meaning flips from threshold to marathon pace. Worse, the anchor moves from _measured fitness_ to _a wish_.
- daniels → polarized: Daniels' T session sits exactly in the zone polarized tells you to vacate. Your favourite session becomes forbidden, and both systems claim evidence.

`anchor_change` is derivable from `intensity_model`, therefore **machine-verified**. You cannot write a switching cost that contradicts the systems it connects.

---

## Why the workout schema is not exercises-dataset's

**The atom is a session, not a movement.** exercises-dataset has no sets/reps/load — deliberately. A bench press is a bench press regardless of program; the movement _is_ the content. Running has one movement. The atom has to be _structure_, which puts prescription inside the row. Forced, not chosen.

**Naming is a join, not a field.** Daniels' "tempo run" is threshold. Hansons' "tempo run" is _marathon pace_. Putting `name: "tempo run"` on a workout row makes the dataset wrong on arrival. Workout rows carry system-neutral ids; `usage.json` maps `(system, workout) -> calls_it`. Searching "tempo run" returns several rows and shows _why_ they differ.

**Intensity is an array, and `rpe_10` is mandatory.** Anchors do not convert cleanly, so each carries its own `confidence`. Minimum two, enforced — a single anchor hides that the anchors disagree. Exactly one must be `rpe_10`: it is the only anchor requiring no equipment, no test, no model, and no system membership, which makes it the sole universal exchange currency between systems and the only axis every row can be rendered on. `maxContains: 1` keeps the renderer deterministic; duplicate models of any kind are a validation error, since two readings for one model is not nuance, it is a row disagreeing with itself.

The cost is real and worth stating: **RPE is the least precise anchor**, so mandating it as the universal axis means the chart's y-axis is subjective by construction. Both axes of the rendered SVG are schematic — x fakes a nominal pace, y is perceived effort. The label says so.

**Vocabularies are taxonomies, not flat lists.** The reference files (`anchors.json`, `adaptations.json`) are the project's answer to "should this be an ontology?" — yes, but a lightweight, descriptive one, not RDF/OWL. `data/adaptations.json` groups the flat `target_adaptation` enum under coarse physiological categories (central-cardiovascular, peripheral-aerobic, metabolic, neuromuscular, structural, skill) with a definition each. It is **descriptive only**: it names and groups what a workout is claimed to _target_, never asserts that the workout _produces_ an outcome — inference of that kind would reopen the `expected_improvement` trap. `validate.ts` requires every `target_adaptation` a workout uses to have an entry.

**The measurement layer is a descent, not a conversion.** `data/anchors.json` records, per `intensity_model`, what it takes to measure (`daniels-vdot` → a race/TT + pace; `lactate_mmol` → a lactate meter) and the honest `fallback` when you cannot — which drops toward `rpe_10` and _names what is lost_, never a numeric substitution. That the anchors don't convert is the reason there is no lactate→HR table: a runner without a meter falls to RPE and loses the lactate-based system's defining control (its own row says so). Each anchor also carries a `construct` — the physical quantity it reads (`perception` / `pace` / `heart-rate` / `metabolic`) — which groups the anchors _and makes the non-convertibility legible_: two `pace` anchors (`daniels-vdot` = measured fitness, `race_pace_ref` = a goal) don't interconvert, and the same "70%" on the two `heart-rate` anchors (max vs reserve) is different bpm. Grouping shows the axes; it does not bridge them. `validate.ts` requires every anchor a system or workout uses to have an entry, and enforces that exactly one entry — `rpe_10` — is both `equipment_free` and the sole `perception` construct. This is the equipment axis exercises-dataset draws with `equipment`.

**Media is free here.** exercises-dataset's real asset is 1,324 GIFs licensed from Gym visual; the license debt is central. Running has no animation to show. The visual is the pace/intensity profile, a pure function of `structure`. `scripts/render.ts` generates it.

**~20 workouts and ~12 systems, not 1,324 rows.** Lifting has combinatorial explosion (movement × equipment × angle × grip). Running does not. Deep rows beat shallow rows.

---

## Claims, not guides

Nobody in this domain has ever had proof. An n=1 has no counterfactual: a runner who got faster over 12 weeks cannot separate "the training worked" from "I was going to improve anyway." They hold an uncontrolled correlation, not a demonstration.

So rows are hypotheses. `claim.proposition` is one falsifiable sentence; `test` is the procedure that would falsify it.

### The evidence tier is machine-enforced

| tier        | meaning                        | `cite`        | also                            |
| ----------- | ------------------------------ | ------------- | ------------------------------- |
| `consensus` | the field agrees               | **≥2**        | `status: verified`, claims only |
| `plausible` | studied, contested             | **required**  |                                 |
| `tradition` | everyone does it, nobody knows | **forbidden** |                                 |

**`consensus` is the one tier a generator cannot reach.** The others describe how well a source supports a sentence, which is checkable against the sources in hand. `consensus` asserts something no single source states — that the field agrees — so it takes at least two independent references, one of them a review or textbook reporting that agreement, and it is gated behind the human read that `status: verified` records. That interlock is deliberate: `status` answers _has a human read this_, tier answers _how well is it supported_, and only the top tier makes the first a precondition of the second. It is also closed to `test` slots, for the reason in the next section.

"Textbook" used to be the whole definition, which was too loose in both directions: it admitted a coach's book describing that coach's own method, and it invited a tier to be read off a bibliography without opening anything. The bar now names what has to be true rather than what the reference looks like.

**`source` is provenance; `cite` is efficacy.** These are different claims and the schema keeps them apart. A canonical text — Daniels' _Running Formula_, Lydiard's _Running to the Top_ — is the authoritative record of what a method **prescribes**; that it **works** is a separate question, and a method describing itself does not answer it. So `source` sits beside `attribution`, is allowed at any tier including `tradition`, and never justifies one. Systems and workouts both carry it: stripping a book's efficacy cite off a workout must not also erase the record of who defined that workout and where. `validate.ts` holds `source` to the same citation bar as `cite`, folds it into the one-reference-one-string rule, and rejects a row that lists the same work as both — that collapse is exactly what the split exists to prevent.

**Self-description is judged per proposition, not per source.** A book is not disqualified as evidence because its author has a method; it is disqualified where the sentence it is backing cannot be asked without adopting that method. The test is whether the proposition survives the author's vocabulary. _Sustained running near lactate steady state shifts the steady state upward_ does — lactate steady state is not Daniels' concept, and the claim can be false. _Splitting threshold volume into cruise intervals accumulates more time at threshold_ does not: it presupposes the very structure being recommended, so the book cannot be evidence for it and becomes its `source` instead.

**An empty `source` has to say which kind of empty it is.** `source` renders when present and says nothing when absent, so a documented system and an undocumented one looked the same while browsing — and one blank covered two unlike facts: a text nobody has recorded yet, versus a system for which no citable text exists at all. A required **`provenance`** enum states it instead: `recorded` (the text is in `source`), `unrecorded` (a text exists, not recorded here), `uncitable` (there is none, so the slot will stay empty). `validate.ts` ties it to `source` — `recorded` must produce one, the other two must not have one — so the label cannot disagree with the row beneath it. It is rendered as a badge beside the tier, deliberately unlike one: sharing a colour scale would merge two independent questions into a single verdict. On a workout the label is partly derivable and therefore checked: `attribution: null` means nobody formalized it, so no authoritative text can exist and the row must be `uncitable` — marking it `unrecorded` would put a permanently unfillable job on someone's worklist.

**Every count lives in [`docs/counts.md`](docs/counts.md), generated from the data.** Tier distribution, provenance, falsifiability. Nothing here quotes a number, because the hand-written ones had already gone stale — this file once described two undetectable tests when there were thirteen. What is worth saying in prose is the shape rather than the totals: `tradition` dominates, and forcing the ratio the other way kills the project.

Enforced at the schema/CI layer, not in a contributor guideline. Each rule below is
one `add(...)` in [`scripts/rules.ts`](scripts/rules.ts) carrying a stable id, and
the ones argued into existence are named by a test that breaks the data in exactly
the way they exist to catch:

- `tier: tradition` + `cite` → violation. If you have a citation, it is not tradition.
- `cite` without a `(year)` → violation. A URL is not a citation.
- one reference written two ways → violation. A source must read identically in every row, or a verifier checking it once cannot tell it is the same source.
- a system claiming more than `tradition` without a `claim.proposition` → violation. Evidence with nothing to be evidence _for_ cannot be checked or falsified, so the cite would sit there unfalsifiable.
- the same reference as both `source` and `cite` on one row → violation. Provenance and efficacy are different claims.
- a `test` citing a reference its own `claim` already cites → violation. A test is a procedure derived from the claim, so reusing the claim's source counts one reading as two assertions. The bar is disjointness, not non-containment — the objection is per reference.
- `tier: consensus` on a `test` → violation. A test is a field-observation heuristic carrying its own confounds, not a settled finding.
- `tier: consensus` on a row that is not `status: verified` → violation. The top tier requires the human read that `status` records.
- a workout with `attribution: null` not marked `provenance: uncitable` → violation. Formalized by nobody means no authoritative text can exist.
- `status: verified` from a generator → violation. Requires human sign-off.
- colloquial term in `id`/`canonical_name` → violation. It belongs in `usage.json`.
- `bet` longer than one sentence → violation.
- `switching_cost.anchor_change` contradicting `intensity_model` → violation.
- `intensity.anchors` without exactly one `rpe_10`, or with duplicate models → violation.

### `test`, not `expected_improvement`

The tempting field is "do this → get that." It is the one field that would discredit the project.

You cannot attribute improvement to a workout. A novice improves on _any_ stimulus; the counterfactual is not zero. Response variance swamps the mean — standardized programs produce anywhere from ~0% to +40%+ VO2max change on the _same_ protocol, so publishing the mean lies to both tails. And the caveat does not survive the JSON boundary: the endpoint here is tool-calling, and `expected_improvement: "-2min"` becomes a grounded fact downstream. Models read fields, not hedges. It would be a hallucination _source_.

Instead, each row carries a falsification procedure:

```json
"test": {
  "detectable": true,
  "what":        { "ko": "같은 페이스에서 평균 HR 5~10bpm 하락", "en": "..." },
  "when_weeks":  { "min": 2, "max": 4 },
  "confounds":   [ { "factor": "heat-acclimation", "severity": "high",
                     "shares_mechanism": true, "note": {} } ],
  "if_absent":   { "ko": "4주 무변화는 실패가 아니다...", "en": "..." },
  "evidence":    { "tier": "tradition" }
}
```

**`if_absent`** is required when `detectable: true`. Without a null interpretation the claim is unfalsifiable, i.e. not a claim.

**`confounds`** requires `minItems: 1` as a forcing function. Every real-world signal has at least one confound; if you cannot name one, you have not looked. `shares_mechanism: true` marks the worst kind — a confound acting through the _same physiology_ as the claim, inseparable by observation. The dataset's most reliable signal has one: **easy-run's HR drop is plasma volume expansion, and so is heat acclimation.** Start in spring, measure in summer, and season and training have pushed the same mechanism the same direction on the same timescale. Invisible under a guide framing ("HR down = good"); only the hypothesis framing forces the question "what else could produce this?"

`shares_mechanism: true` with `severity` below `high` is a violation — mechanistic indistinguishability is severe by definition. _(This rule caught the seed data's own inconsistency on first run, which is the point.)_

**A `test` slot has to earn its own evidence.** In the seed data not one of them did: every cited test reused its claim's reference verbatim, all eight, so the tier said nothing the claim had not already said and every count came out doubled. A test is a procedure _derived_ from the claim — its standing is the claim's standing, minus whatever `confounds` already subtracts. What a test may cite is a source about **measurement**, which is disjoint from the claim's source by construction, and `validate.ts` now requires that disjointness. The top tier is closed to tests outright: a signal a row itself declares mechanistically indistinguishable from a confound cannot also be what the field has settled.

`detectable: false` rows — **13 of 22**, see [`docs/counts.md`](docs/counts.md) — **cannot** carry `what`, `when_weeks`, `confounds`, or `if_absent`. An unobservable null cannot be interpreted. They carry a `mechanism` saying why no field observation would settle the question, and all the dataset can offer there is: this is a belief — decide how many weekly minutes to spend on it.

---

## Non-goals

**Collecting user results.** The natural next step from hypothesis framing is "let users run the experiment, aggregate the outcomes." That reinvents `expected_improvement` and is _worse_ than literature-based: self-selected, uncontrolled, and survivorship-biased — people who improve keep logging, people who quit stop logging. n=10,000 looks like science while being pure high-responder amplification, and now it carries your name instead of Jack Daniels'. Running is especially hostile to n-of-1 rigor: no washout, no blinding, the subject changes irreversibly, and the outcome metric is contaminated by pacing skill learned from testing.

**Formulas and prediction.** Riegel, VDOT, TRIMP, CS/D-prime are a different project with a different shape (functions with domains, not catalog rows). The renderer fakes a nominal pace for distance segments and labels output "schematic" precisely to avoid opening this door.

**Being a guide.** Data is hypothesis; the presentation layer can be a lookup. Epistemics in the JSON, convenience in the UI. Never the reverse.

## Layout

```
data/
  systems.json       # 14 - the browsing entity. bet / commitment / switching_cost
  workouts.json      # 22 - detail view. claim / test / structure / intensity
  usage.json         # 54 - (system, workout) -> calls_it. The collision table.
  anchors.json       # 8  - measurement layer. per intensity_model: requires + fallback (-> RPE)
  adaptations.json   # 15 - taxonomy over target_adaptation: coarse category + definition
  schema/*.json      # JSON Schema 2020-12
scripts/
  rules.ts           # check(data) -> Finding[]. Every rule, no I/O. Tests name rule ids
  evidence.ts        # the one walker over a row's evidence graph (pure)
  dataset.ts         # load(root) -> Dataset, and patch() for breaking one row in a test
  validate.ts        # CLI over rules.ts: read, check, print, exit code
  types.ts           # data/schema/*.json -> src/types/ (generated, committed, CI-verified)
  verify.ts          # data -> docs/verification.md (the §1b worksheet) + docs/counts.md
  svg.ts             # structure -> schematic SVG (pure; the single source of the visual)
  render.ts          # writes the SVGs to out/ using svg.ts
  prerender.tsx      # writes one real HTML file per entry into dist/, via the router
index.html           # the browse UI shell
public/
  sw.js              # service worker: the catalog stays consultable offline
src/
  types/             # GENERATED from the schemas + the hand-written view contract
  data.tsx           # JSON -> typed rows, reverse indexes, per-entry page metadata
  router.tsx         # the route tree, driven by both the browser and the prerenderer
  components/        # React components (ADR 0002); render to a string in Node too
  main.tsx           # browser shell: chrome, keyboard lookup, recently viewed, SW
  style.css          # tier badges carry visual weight; tradition must not read as consensus
docs/
  TODO.md            # the worklist: verification, symmetry, depth
  verification.md    # GENERATED - what each source has to support, per row
  counts.md          # GENERATED - tiers, provenance, falsifiability. Prose links here
  adr/               # architecture decisions, with the reasoning that produced them
```

```
vp install
vp run validate && vp run render   # check + write SVGs
vp dev                             # browse UI (systems -> workout detail, "tempo run" collision search)
vp run build                       # static bundle in dist/, one HTML file per entry
```

The browse UI reads the JSON directly and renders the schematic chart through the
same `scripts/svg.mjs` the CLI uses, so the visual can never drift from the data.
Bilingual (ko/en) via the header toggle.

Every entry is also a real document. `scripts/prerender.mjs` writes one HTML file
per system, workout, and anchor — with its own `<title>`, description, canonical
URL, and the entry's content in the markup — from the same `src/views.mjs` the
browser renders. So a cold hit on `/anchor/rpe_10` is readable with no JavaScript
and needs no server rewrites, while the client bundle upgrades navigation to
instant, no-reload lookups. That split is the subject of
[ADR 0001](docs/adr/0001-dictionary-shape.md).

It reads like a dictionary once loaded: `/` (or `s`) jumps to the search box,
`↑`/`↓` walk the hits, `Enter` opens one, `Esc` clears. The last eight entries you
opened sit on the home page. And because the whole corpus ships in the bundle, a
service worker makes the catalog consultable offline — including entries you have
never opened, since the client can render any of them from data already on the
device.

## Known open problems

The near-term worklist — verification (`draft` → `verified`), `switching_cost` symmetry, and depth on shallow fields — is tracked concretely in [`docs/TODO.md`](docs/TODO.md).

Architecture decisions and the reasoning behind them live in [`docs/adr/`](docs/adr/).
[ADR 0004](docs/adr/0004-tanstack-router.md) settles the browse layer on TanStack
Router and closes the toolchain question.
[ADR 0003](docs/adr/0003-nub-runtime.md) records running the scripts under nub, which
removed the intermediate SSR build.
[ADR 0002](docs/adr/0002-component-model.md) records the move to React components.
[ADR 0001](docs/adr/0001-dictionary-shape.md) records why this is treated as a
dictionary — prerendered entries wrapped in a client-side index — and therefore why
the data stays JSON, why the whole corpus is loaded up front on purpose, and why no
web framework is adopted.

- ~~**The card view flattens the tier.**~~ Addressed. `index.html` puts the tier badge on every system and workout card, and `consensus` / `plausible` / `tradition` are given deliberately different visual weight — a solid fill, an outline, and a faint dashed outline respectively — so browsing cannot make `tradition` read as settled. The constraint stands for any future card added.
- **Nothing is verified yet.** All 14 systems and 22 workouts are `status: draft`. Citations are now normalized and machine-enforced (one reference, one string), but that says only that a source _reads_ the same everywhere — not that it supports the claim it is attached to. The verification checklist is in [`docs/TODO.md`](docs/TODO.md#1-verification-draft--verified).
- **Daniels' volume caps are from memory**, marked `tradition` + draft. Verify against the source text.
- **VDOT tables are a compiled work.** Do not scrape. Re-derive from the published equations in Daniels & Gilbert (1979), _Oxygen Power_. VDOT is a trademark. Same trap for Purdy Points and WMA age-grading tables.
- **Prior art unverified.** GoldenCheetah is the reference implementation for the analysis side, but it is an engine, not a knowledge base. Confirm nothing like this catalog exists.

## License

Code and data: MIT. No media dependency, therefore no media license.
