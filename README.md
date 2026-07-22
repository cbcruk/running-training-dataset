# Running Training Dataset

[![CI](https://github.com/cbcruk/running-training-dataset/actions/workflows/ci.yml/badge.svg)](https://github.com/cbcruk/running-training-dataset/actions/workflows/ci.yml)
[![Pages](https://github.com/cbcruk/running-training-dataset/actions/workflows/pages.yml/badge.svg)](https://github.com/cbcruk/running-training-dataset/actions/workflows/pages.yml)

A browsable catalog of running training **systems** — what each one bets, what it costs to run, what happens when you switch, and how much of it is actually known.

**Browse it live: [cbcruk.github.io/running-training-dataset](https://cbcruk.github.io/running-training-dataset/)**

For people who like trying different methods. Light to browse, honest underneath.

Modeled on the shape of [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset), but the atoms are different, so the schema is too.

**Status: early.** 12 systems, 20 workouts. Every row is `status: draft` — no citation has been human-verified. All eight `intensity_model` anchors are now represented by at least one system, and all nine workout families are populated.

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

**Media is free here.** exercises-dataset's real asset is 1,324 GIFs licensed from Gym visual; the license debt is central. Running has no animation to show. The visual is the pace/intensity profile, a pure function of `structure`. `scripts/render.mjs` generates it.

**~20 workouts and ~12 systems, not 1,324 rows.** Lifting has combinatorial explosion (movement × equipment × angle × grip). Running does not. Deep rows beat shallow rows.

---

## Claims, not guides

Nobody in this domain has ever had proof. An n=1 has no counterfactual: a runner who got faster over 12 weeks cannot separate "the training worked" from "I was going to improve anyway." They hold an uncontrolled correlation, not a demonstration.

So rows are hypotheses. `claim.proposition` is one falsifiable sentence; `test` is the procedure that would falsify it.

### The evidence tier is machine-enforced

| tier        | meaning                        | `cite`        |
| ----------- | ------------------------------ | ------------- |
| `consensus` | textbook                       | **required**  |
| `plausible` | studied, contested             | **required**  |
| `tradition` | everyone does it, nobody knows | **forbidden** |

Current distribution: **consensus 3 / plausible 23 / tradition 45.** Tradition dominates. That is the honest shape of running knowledge; forcing the ratio the other way kills the project.

Enforced at the schema/CI layer, not in a contributor guideline:

- `tier: tradition` + `cite` → violation. If you have a citation, it is not tradition.
- `cite` without a `(year)` → violation. A URL is not a citation.
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
  "evidence":    { "tier": "consensus", "cite": ["..."] }
}
```

**`if_absent`** is required when `detectable: true`. Without a null interpretation the claim is unfalsifiable, i.e. not a claim.

**`confounds`** requires `minItems: 1` as a forcing function. Every real-world signal has at least one confound; if you cannot name one, you have not looked. `shares_mechanism: true` marks the worst kind — a confound acting through the _same physiology_ as the claim, inseparable by observation. The dataset's most reliable signal has one: **easy-run's HR drop is plasma volume expansion, and so is heat acclimation.** Start in spring, measure in summer, and season and training have pushed the same mechanism the same direction on the same timescale. Invisible under a guide framing ("HR down = good"); only the hypothesis framing forces the question "what else could produce this?"

`shares_mechanism: true` with `severity` below `high` is a violation — mechanistic indistinguishability is severe by definition. _(This rule caught the seed data's own inconsistency on first run, which is the point.)_

`detectable: false` rows (`strides`, `marathon-pace-run`) **cannot** carry `what`, `when_weeks`, `confounds`, or `if_absent`. An unobservable null cannot be interpreted. All the dataset can offer there is: this is a belief — decide how many weekly minutes to spend on it.

---

## Non-goals

**Collecting user results.** The natural next step from hypothesis framing is "let users run the experiment, aggregate the outcomes." That reinvents `expected_improvement` and is _worse_ than literature-based: self-selected, uncontrolled, and survivorship-biased — people who improve keep logging, people who quit stop logging. n=10,000 looks like science while being pure high-responder amplification, and now it carries your name instead of Jack Daniels'. Running is especially hostile to n-of-1 rigor: no washout, no blinding, the subject changes irreversibly, and the outcome metric is contaminated by pacing skill learned from testing.

**Formulas and prediction.** Riegel, VDOT, TRIMP, CS/D-prime are a different project with a different shape (functions with domains, not catalog rows). The renderer fakes a nominal pace for distance segments and labels output "schematic" precisely to avoid opening this door.

**Being a guide.** Data is hypothesis; the presentation layer can be a lookup. Epistemics in the JSON, convenience in the UI. Never the reverse.

## Layout

```
data/
  systems.json       # 12 - the browsing entity. bet / commitment / switching_cost
  workouts.json      # 20 - detail view. claim / test / structure / intensity
  usage.json         # 48 - (system, workout) -> calls_it. The collision table.
  schema/*.json      # JSON Schema 2020-12
scripts/
  validate.mjs       # schema + referential integrity + discipline
  svg.mjs            # structure -> schematic SVG (pure; the single source of the visual)
  render.mjs         # writes the SVGs to out/ using svg.mjs
index.html           # the browse UI shell
src/
  main.js            # systems-as-cards, detail views, collision search. Imports svg.mjs.
  style.css          # tier badges carry visual weight; tradition must not read as consensus
```

```
vp install
vp run validate && vp run render   # check + write SVGs
vp dev                             # browse UI (systems -> workout detail, "tempo run" collision search)
vp build                           # static bundle in dist/
```

The browse UI reads the JSON directly and renders the schematic chart through the
same `scripts/svg.mjs` the CLI uses, so the visual can never drift from the data.
Bilingual (ko/en) via the header toggle.

## Known open problems

The near-term worklist — verification (`draft` → `verified`), `switching_cost` symmetry, and depth on shallow fields — is tracked concretely in [`docs/TODO.md`](docs/TODO.md).

- ~~**The card view flattens the tier.**~~ Addressed. `index.html` puts the tier badge on every system and workout card, and `consensus` / `plausible` / `tradition` are given deliberately different visual weight — a solid fill, an outline, and a faint dashed outline respectively — so browsing cannot make `tradition` read as settled. The constraint stands for any future card added.
- **Nothing is verified yet.** All 12 systems and 20 workouts are `status: draft`. The verification checklist — including a citation-normalization bug (three renderings of Billat 2001, with wrong initials) — is in [`docs/TODO.md`](docs/TODO.md#1-verification-draft--verified).
- **Daniels' volume caps are from memory**, marked `tradition` + draft. Verify against the source text.
- **VDOT tables are a compiled work.** Do not scrape. Re-derive from the published equations in Daniels & Gilbert (1979), _Oxygen Power_. VDOT is a trademark. Same trap for Purdy Points and WMA age-grading tables.
- **Prior art unverified.** GoldenCheetah is the reference implementation for the analysis side, but it is an engine, not a knowledge base. Confirm nothing like this catalog exists.

## License

Code and data: MIT. No media dependency, therefore no media license.
