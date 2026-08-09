# ADR 0005 — Treat file-top comments as agent-facing context, and check them

**Status:** accepted · 2026-08-09

---

## Context

Nearly every module in this repo opens with a paragraph saying what it is and why
it is shaped that way. That is an unusual convention, and the usual advice is
against it: nothing surfaces a file header. Hover shows a symbol's JSDoc,
go-to-definition lands on a symbol, and a call site never sees the top of the file
at all. The mainstream pattern — no header, JSDoc on exports, architecture in the
README — exists for a good reason.

But the reasons headers lost are **human IDE affordances**. The other reader here
does not hover. It reads the file top to bottom, every time, and it arrives with
none of the tacit context a team carries from having been in the room. This repo
already accepts that reader elsewhere: `CLAUDE.md`, `docs/agents/`, and a dataset
whose stated endpoint is tool-calling. A module header is the file-local instance
of the same idea.

The trigger was a cleanup that found what the convention costs when nothing checks
it. Sixteen comments named files that had been renamed out from under them two
ADRs earlier — `svg.mjs`, `validate.mjs`, `src/views.mjs`. Eight section dividers
in `src/data.tsx` marked sections whose code had moved to `src/components/`, and
three paragraphs floated between them describing nothing. And `scripts/prerender.tsx`
opened with a confident, well-written paragraph explaining that it imports a build
artefact rather than the source — four lines above the import of the source.

That last one is the whole argument. A human skimming would likely notice the
import. A reader working top-down absorbs the claim first and carries it into
whatever it does next. **A false header is more dangerous for this reader, not
less.** It is the same failure mode `expected_improvement` was rejected for: prose
that reads as grounded fact downstream.

## Decision

**Keep the headers, and treat them as a context budget that has to be verifiable.**

### What a header is for

Three kinds of content get written into one, and they behave differently:

| kind                                              | half-life                          | where it goes  |
| ------------------------------------------------- | ---------------------------------- | -------------- |
| **A** — what this module is, what it promises     | as long as the module              | the header     |
| **B** — why it is shaped this way, what it is not | until revisited                    | the header     |
| **C** — relationships to other files, history     | until anyone touches the neighbour | an ADR, linked |

Every one of the sixteen stale references and both bad comments were kind C. Not
one A or B sentence was wrong. So C is what leaves: an ADR is dated and immutable,
a header is neither, and retelling an ADR in a header is where a wrong version of
it gets to live.

### Where the header goes

A header earns its place when there is no symbol to hang it on:

- **No exports** (a script you run) — the header is the only surface. Keep it.
- **One export** — the file _is_ the symbol. Document the export; hover, go-to-definition
  and every call site reach it, and the file header does not.
- **Several exports** — the header says what the collection is, which no per-symbol
  doc can; per-symbol JSDoc says the rest.

### It has to be checkable

`scripts/comment-refs.ts` resolves every path-shaped token in every comment and
fails the build on one that names nothing. References that are meant not to resolve
are listed in `ALLOWED` with the reason, so "mistake, or the point?" is answered
once, in code.

## Considered and rejected

**Drop the headers, document only exports.** The mainstream position, and correct
for a human-only codebase. Rejected because it optimizes for the reader that
hovers and starves the one that does not, and because in this project the "why"
_is_ the product — the README is argumentative for the same reason.

**Move everything to the README.** The README carries the cross-cutting argument
and should. But a module's own trade-off is not cross-cutting, and pushing it up a
level means it is read by people deciding whether to trust the project, not by
whoever is about to change the file.

**Leave the comments unchecked.** This was the status quo and it produced sixteen
broken references and one actively false paragraph across two renames. At 100+
references, "remember to update them" is not a mechanism.

## Consequences

- **Context is cheap, not free.** `prerender.tsx` was 113 lines with a 21-line
  header. Write for decision-relevance, not completeness.
- **Adding a header adds an obligation.** Prose that cannot be checked is prose
  that will eventually mislead, so prefer the checkable form: name a file (checked)
  over describing a neighbour's internals (not checked).
- **`ALLOWED` will grow, and should be read.** Each entry is a claim that something
  is deliberately unresolvable. If it gets long, the convention is drifting.
- **This repo now has three context layers with three different rot controls:**
  the README delegates its numbers to a generated `docs/counts.md`, ADRs are dated
  and immutable, headers have their file references machine-checked. Same posture,
  three applications.

## Verification

The check was confirmed by renaming `svg.ts` back to `svg.mjs` in one comment and
watching the suite fail, then restoring it. It reports **0** against the current
tree, from **0** false positives after three were fixed: a bare name resolved
anywhere in the repo (`anchors.json`), a build-time output (`404.html`), and the
checker's own examples.
