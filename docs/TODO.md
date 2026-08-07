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

`validate.ts` forbids a generator setting `status: verified` (it is an L4
human-sign-off gate). So this is **human work by design** — this section is the
checklist a human works through, not something a script can close.

### 1a. Normalize citations (blocking, mechanical) — **done**

The same reference appeared in inconsistent forms, and one was wrong. This had to
be fixed before verifying anything else, because a verifier should check each
source once, not three spellings of it.

An audit over every `cite` in `systems.json` and `workouts.json` found exactly the
three inconsistencies below and no others. All are normalized, and `validate.ts`
now enforces the policy so they cannot re-fragment.

- [x] **Policy: one reference, one string — the full form, everywhere.** Short forms
      in `test.evidence.cite` are **not** acceptable. The reason is the purpose of
      §1b: a human checks each source once, which only works if a source reads the
      same in every row. Two renderings look like two sources and cannot be grepped
      as one.
- [x] **Machine-enforced.** `validate.ts` groups every cite by first author +
      year and fails if a group has more than one distinct string, printing the
      variants. Verified against a deliberately reintroduced variant.
- [x] **Billat, three forms / wrong initials.** Initials corrected to **`LV`**
      (Véronique L. Billat) and the two partial titles merged into one canonical
      string, now used in all four places (`vo2max-intervals`, and the
      `vo2max-30-30` claim and test):
      `Billat LV (2001). Interval training for performance: a scientific and empirical practice. Part I: aerobic interval training. Sports Med 31(1).`
- [x] **Egan & Zierath (2013).** The abbreviated form in the `long-run` test
      expanded to the full reference already used in its claim.
- [x] **McHugh (2003).** Same, in `downhill-repeats`.

Note that normalizing the _string_ says nothing about whether the source supports
the claim — that is §1b below, and it is still entirely open. Billat 2001 in
particular still needs checking against the 30/30 protocol specifically.

A stronger version of this fix would extract citations into a reference file keyed
by id (the pattern `anchors.json` and `adaptations.json` already use) so rows point
at a reference rather than repeating a string. Worth doing if the corpus grows
enough that the same source appears in many rows; the validator guard covers the
current size.

### 1b. Verify each source against the claim it supports

The validator checks that a `cite` _looks_ like a citation (has a year) and that a
reference reads the same everywhere (§1a). It cannot check that the source _says
what the row claims_. That is the whole point of the verification pass, and it is
**human work by design** — `validate.ts` forbids a generator from setting
`status: verified`, because a machine asserting that a source supports a claim is
the failure this dataset exists to avoid.

**The checklist is [`docs/verification.md`](verification.md)**, generated from the
data by `vp run verify` so it cannot drift from the rows it describes. It maps each
of the sources to every assertion hanging off it, quoting the exact sentence to
check, so a verifier reads one source and settles all its rows at once.

The worksheet opens with three questions answerable **without** opening a source,
because they are the ones most likely to move a tier.

**Question 1 is settled.** It asked about sources never attached to a falsifiable
sentence — 5 of 13 at the time. The decision, and what it produced:

- **Review papers get a proposition to be checked against.** `polarized-80-20`
  (Seiler), `critical-speed` (Jones & Vanhatalo) and `hrr-karvonen` (Karvonen) now
  carry a `claim.proposition` stating what the source is supposed to have shown.
  Those propositions are **authored to be checked, not confirmed** — the tier is
  unchanged and the rows are still `draft`.
- **Canonical texts drop to `tradition`, which removes the cite.** A method
  describing itself is not evidence that it works. Applied to `lydiard` and
  `pfitzinger` — and to **`daniels`**, which the worksheet's triage missed because
  it groups by _source_: the Daniels book is attached to workout propositions
  elsewhere, so it never showed as unattached, even though the `daniels` system row
  had the same defect. Same case, same fix.
- **The same rule applied at the distribution level**, which the triage did not
  cover. `daniels`, `pfitzinger` and `critical-speed` distributions dropped to
  `tradition`. The Jones cite on `critical-speed.distribution` was simply
  misattached — that review is about the CS/W′ model, not about pyramidal session
  distribution, and the model claim now lives on the system's `claim`.
  `polarized-80-20.distribution` keeps Seiler: it is the one distribution whose
  cite and field actually match, and it is the only one with explicit `zones`.

Net: **plausible 23 → 17, tradition 48 → 54**, and no source is left unattached.

**Machine-enforced so it cannot return.** `system.schema.json` gained a `claim`
object, and `validate.ts` now fails a system whose root evidence claims more than
`tradition` without a `claim.proposition` — evidence with nothing to be evidence
_for_ cannot be checked or falsified. Verified by removing a proposition and
watching it fail.

The two remaining questions, still open:

- [ ] **The `consensus` rows** — the highest bar in the tier table, so the
      strongest claims and the fewest of them.
- [ ] **Unobservable tests carrying a tier above `tradition`** — confirm the tier
      is about the mechanism rather than the test.

And the reading itself, which no script can do:

- [ ] Work the worksheet source by source, ticking rows as each is confirmed.
- [ ] Downgrade rather than stretch: a `plausible`/`consensus` row whose source
      does not actually support it must drop to `tradition`, which means
      **removing** the cite.
- [ ] Only after a human confirms a row's citations may its `status` flip to
      `verified`. Per row, never in bulk.
- [ ] **Daniels volume caps** (`daniels.volume_caps`) are marked `tradition` +
      "from memory" (README already flags this). Verify the T/I/R cap figures
      against the source text before promoting.

**The tension this exposed is now resolved.** The tier table conflated evidence
that a method _works_ with evidence of what a method _is_; because `tradition`
forbids a cite, downgrading the canonical texts left the record of what those
systems prescribe uncited. `system.schema.json` gained a **`source`** field for
provenance, separate from `evidence` for efficacy. `daniels`, `lydiard` and
`pfitzinger` carry their books there — the same strings that were removed, nothing
invented. `validate.ts` holds a `source` to the same citation bar as a `cite`,
folds it into the one-reference-one-string rule, and rejects a row listing one work
as both.

- [ ] The other eleven systems have no `source`. Adding one means having the actual
      text in hand; do not fill these from memory. Which of them are _waiting_ on a
      text and which can never have one is now recorded per row — see 1d.

### 1d. Say which rows have no source, and why

**Field added; the filling is still open.** The gap above was invisible where it
mattered. `source` renders when present and says nothing when absent, so the three
documented systems and the eleven undocumented ones looked identical while
browsing — at exactly the moment a reader is deciding how much to trust one. Worse,
one blank covered two unlike facts: a text nobody has recorded yet, and a system
for which no citable text exists at all.

`system.schema.json` gained a required **`provenance`** enum — `recorded` /
`unrecorded` / `uncitable` — tied to `source` in `validate.ts` (`recorded` must
produce a source; the other two must not have one), so the label cannot drift from
the row. It renders as a badge beside the tier on both the card and the detail
page, and the source block now stays on the page when empty to say which kind of
empty it is.

Current state: **recorded 3 / unrecorded 9 / uncitable 2.**

- [ ] `unrecorded` (9) — a defining text exists, nobody has recorded it here:
      `hansons`, `polarized-80-20`, `maf`, `bakken-doubles`, `critical-speed`,
      `hrr-karvonen`, `canova`, `galloway`, `first-furman`. Each one moved to
      `recorded` is one row whose description can be checked against something.
      Watch for the conflation trap on `polarized-80-20`, `critical-speed` and
      `hrr-karvonen`: the paper that _defines_ the method is often the same paper
      already used as a `cite`, and `validate.ts` rejects a row listing one work as
      both. Those need a distinct describing text, or they stay `unrecorded`.
- [x] `uncitable` (2) — `norwegian-singles` (formalised in an amateur community, no
      authoritative text) and `moderate-primary` (transcribed from an unattributed,
      undated coaching essay). Nothing to do: these are stated, not pending.

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

## 4. Finish the dictionary shape

[ADR 0001](adr/0001-dictionary-shape.md) settles that this is a dictionary:
prerendered entries for **discovery** (arriving from a search engine or a shared
link) wrapped in a client-side index for **use** (looking up, cross-referencing,
comparing). **Both modes are now served — this section is done.**

- [x] **Real URLs (prerender + History API routing).** Done. Routing moved from
      hash to the History API, and `scripts/prerender.mjs` writes one HTML file per
      entry (44 routes + `404.html`) into `dist/`, each with its own title,
      description, canonical URL, OG tags, and the entry's content in the markup.
      Markup comes from `src/views.mjs` — pure and DOM-free, the same module the
      browser renders from, so prerendered and client-rendered output cannot drift
      (the arrangement `svg.mjs` already uses for charts). CI asserts the route
      count against the data, so a silent regression cannot ship.
- [x] **Keyboard-first search.** Done. `/` (or `s`) focuses the box, `↑`/`↓` walk
      the hits, `Enter` opens the highlighted one, `Esc` clears then blurs. The
      shortcuts are printed under the search box so they are discoverable.
- [x] **Offline via a service worker.** Done. `public/sw.js` caches the shell and
      the content-hashed assets: navigations are network-first (a fresh prerendered
      entry wins when online), assets cache-first. Because the whole corpus ships in
      the bundle, an entry that was **never visited** still renders offline through
      the shell fallback — the payoff of the resident-corpus decision.
- [x] **Recently viewed.** Done. Kept in `localStorage`, capped at 8, most recent
      first, shown on the home route only. Injected by the browser shell after
      render and never prerendered: the files on disk have to read the same for
      everyone.

Note what is **not** on this list: shrinking the bundle by splitting data per route.
Holding the whole corpus client-side is what powers the collision search — it is the
feature, not the cost. And do not adopt a framework for any of the above; see the
ADR's "Do not do" list.

---

## Re-running the extraction

The counts and lists above were generated with a throwaway script over
`data/*.json` (unique citations with their source rows, the inbound
`switching_cost` matrix, and which systems lack `volume_caps` / `distribution` /
`zones`). Re-run an equivalent extraction before acting, since the data moves.
