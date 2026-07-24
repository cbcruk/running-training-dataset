# TODO / Roadmap

The skeleton is structurally complete: **12 systems, 20 workouts, 48 usage rows**,
all **8 `intensity_model` anchors** and all **9 workout families** populated. Every
row is `status: draft` — nothing has been human-verified.

This document is the worklist for hardening it. It is deliberately concrete: each
item names the exact rows, and the paths that are _not_ worth doing are marked so.

Counts and lists below were extracted from the data on the day this file was
written; re-run the extraction (see the end) before trusting them.

---

## 1. Verification: `draft` → `verified`

`validate.mjs` forbids a generator setting `status: verified` (it is an L4
human-sign-off gate). So this is **human work by design** — this section is the
checklist a human works through, not something a script can close.

### 1a. Normalize citations (blocking, mechanical)

The same reference appears in inconsistent forms, and one is wrong. Fix before
verifying anything else, because a verifier should check each source once, not
three spellings of it.

- [ ] **Billat, three forms / wrong initials.** Currently present:
  - `Billat LV (2001). Interval training for performance, Part I. Sports Med 31(1).` — `vo2max-intervals` (seed data)
  - `Billat V (2001). Interval training for performance: a scientific and empirical practice. Sports Med 31(1).` — `vo2max-30-30` claim
  - `Billat V (2001). Sports Med 31(1).` — `vo2max-30-30` test
  - The initials should be **`LV`** (Véronique Billat). Pick one canonical string and use it in all three places.
- [ ] **Egan & Zierath (2013)** appears full in `long-run` claim but abbreviated (`Cell Metab 17(2).`) in its test. Same reference — make them identical.
- [ ] **McHugh (2003)** appears full in `downhill-repeats` claim, abbreviated in its test. Same.
- [ ] **Decide a policy:** is an abbreviated short-form cite in `test.evidence.cite` acceptable, or must every `cite` be the full reference? The validator only enforces a `(year)`. If the policy is "full everywhere," the abbreviated forms above are all violations to expand.

### 1b. Verify each source against the claim it supports

The validator checks that a `cite` _looks_ like a citation (has a year). It cannot
check that the source _says what the row claims_. That is the whole point of the
verification pass. Go reference by reference:

| citation                        | used in                                                                | what to confirm                                                                                                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Convertino (1991)               | `easy-run`                                                             | supports plasma-volume adaptation + the HR-drop test                                                                                                                                                          |
| Holloszy & Coyle (1984)         | `easy-run`                                                             | supports mitochondrial/capillary adaptation to endurance                                                                                                                                                      |
| Faude, Kindermann, Meyer (2009) | `threshold-continuous`                                                 | supports the lactate-threshold / MLSS framing                                                                                                                                                                 |
| Billat (2001)                   | `vo2max-intervals`, `vo2max-30-30`                                     | supports short-interval time-at-VO2max claim (check it actually covers 30/30)                                                                                                                                 |
| Midgley & McNaughton (2006)     | `vo2max-intervals`                                                     | supports time-at-VO2max during intermittent running                                                                                                                                                           |
| Daniels (2013)                  | `daniels`, `threshold-continuous`, `cruise-intervals`, `rep-intervals` | textbook source; confirm each specific prescription                                                                                                                                                           |
| Egan & Zierath (2013)           | `long-run`                                                             | supports the **mechanism** (substrate/mitochondrial). ⚠ does **not** establish that a single long run beats equal split volume — that framing is why the tier is `plausible`, not `consensus`. Keep it there. |
| Seiler (2010)                   | `polarized-80-20`                                                      | supports the 80/20 distribution observation                                                                                                                                                                   |
| Lydiard & Gilmour (2000)        | `lydiard`                                                              | canonical text; it is the _source of the method_, not efficacy evidence — confirm this is the intended use of the tier convention                                                                             |
| Pfitzinger & Douglas (2009)     | `pfitzinger`                                                           | canonical text; same caveat                                                                                                                                                                                   |
| Karvonen (1957)                 | `hrr-karvonen`                                                         | supports the HRR method; confirm year/journal                                                                                                                                                                 |
| Jones & Vanhatalo (2017)        | `critical-speed`                                                       | supports the **CS/W′ model**. ⚠ it is a review of the _concept_, not of CS-anchored _training prescription_ — the caveat already says so; confirm the tier is honest                                          |
| McHugh (2003)                   | `downhill-repeats`                                                     | supports the repeated-bout effect                                                                                                                                                                             |

- [ ] Work the table top to bottom; for each, either confirm or downgrade the tier (a `plausible`/`consensus` row whose source does not actually support it must drop to `tradition`, which means **removing** the cite).
- [ ] **Daniels volume caps** (`daniels.volume_caps`) are marked `tradition` + "from memory" (README already flags this). Verify the T/I/R cap figures against the source text before promoting.
- [ ] Only after a human confirms a row's citations may its `status` flip to `verified`. Do it per-row, never in bulk.

### 1c. Non-goal guard (do **not** do)

Per the README, verification must not drift into: adding `expected_improvement`,
scraping the VDOT tables (re-derive from Daniels & Gilbert 1979 if ever needed),
collecting user results, or building a CS/D′ prediction engine.

---

## 2. `switching_cost` symmetry

**Done for the original 3.** The matrix used to be one-directional (the 9 newer
systems pointed back at the original 3, but not the reverse). The eight
high-value inbound entries below have been added, so the original 3 now carry a
balanced set: `daniels` (5), `hansons` (3), `polarized-80-20` (4).

`anchor_change` is machine-verified as `<from>.intensity_model -> <this>.intensity_model`,
so each entry has exactly one correct string:

- [x] `daniels` <- `pfitzinger` → `pct_hrmax -> daniels-vdot` (silent: threshold survives, anchor flips HR→pace)
- [x] `daniels` <- `norwegian-singles` → `lactate_mmol -> daniels-vdot` (silent: threshold survives, target rises)
- [x] `daniels` <- `critical-speed` → `pct_cs -> daniels-vdot`
- [x] `hansons` <- `canova` → `race_pace_ref -> race_pace_ref` (same-anchor; cost is structural)
- [x] `hansons` <- `pfitzinger` → `pct_hrmax -> race_pace_ref` (silent: "tempo" flips threshold→marathon pace)
- [x] `polarized-80-20` <- `norwegian-singles` → `lactate_mmol -> pct_vo2max` (the Z2 collision, seen from the other side)
- [x] `polarized-80-20` <- `maf` → `pct_hrmax -> pct_vo2max`
- [x] `polarized-80-20` <- `lydiard` → `rpe_10 -> pct_vo2max`

**Done — cross-links among the newer systems.** Six truthful newer-to-newer
migration paths have been added, so every one of the 12 systems now has at least
2 inbound entries:

- [x] `pfitzinger` <- `maf` → `pct_hrmax -> pct_hrmax` (loud: re-admits the banned intensity)
- [x] `canova` <- `pfitzinger` → `pct_hrmax -> race_pace_ref` (silent: anchor slips to a goal-pace wish)
- [x] `norwegian-singles` <- `lydiard` → `rpe_10 -> lactate_mmol` (loud: feel → measured lactate)
- [x] `critical-speed` <- `hrr-karvonen` → `pct_hrr -> pct_cs` (loud: HR reserve → pace boundary)
- [x] `maf` <- `hrr-karvonen` → `pct_hrr -> pct_hrmax` (silent: HR language survives, the ceiling drops)
- [x] `first-furman` <- `pfitzinger` → `pct_hrmax -> race_pace_ref` (loud: volume inversion)

Not exhaustive by design (the full 12×12 = 132 would be noise). `lydiard`,
`hrr-karvonen`, and `galloway` are left at 2 inbound because they are uncommon
migration _destinations_; add more only where a real person would actually switch.

Guidance for any future entry: it needs a `silent` flag and a bilingual `note`;
set `silent: true` only when a **term survives the switch while its meaning
changes** (the dangerous case), not merely when the anchor differs.

---

## 3. Depth on shallow fields

Fill only where a source genuinely specifies the value. Inventing numbers to make
the fields look full is the exact failure the tier system exists to prevent.

### 3a. `volume_caps` — on `daniels` and `hansons`

Most systems do not state per-session volume caps, and a blank field is honest.
Add only the documented ones:

- [x] **`hansons`**: the **16-mile (~26 km) long-run cap** is formalized as a `volume_cap` — `zone: long-run`, `max_km: 26`, `max_pct_weekly: 30` (the rule is the lesser of the two), `tier: tradition` with a note that it is documented in the method's book but its superiority over an uncapped long run is untested. No longer only in prose/usage.
- [ ] **`pfitzinger`**: if the source states LT-run duration limits, add them; otherwise leave blank.

### 3b. `distribution.zones` — currently only on `polarized-80-20`

Eight systems carry a `distribution.model` but no explicit `zones` breakdown.

- [ ] Add a `zones` array **only** where a cited source gives session percentages. For `tradition`-tier distributions, do **not** fabricate percentages — leave `model` alone.
- [ ] `norwegian-singles` (pyramidal, threshold-heavy) is the best candidate _if_ a source supports the split.

### 3c. Missing `distribution` — `maf`, `hrr-karvonen`, `first-furman`

- [ ] These were omitted deliberately (a prescription method has no inherent session distribution). Either add a defensible `model` + `evidence`, or leave a one-line note here documenting why it stays omitted. Do not add `unstructured` just to fill the field unless it is actually true.

---

## Re-running the extraction

The counts and lists above were generated with a throwaway script over
`data/*.json` (unique citations with their source rows, the inbound
`switching_cost` matrix, and which systems lack `volume_caps` / `distribution` /
`zones`). Re-run an equivalent extraction before acting, since the data moves.
