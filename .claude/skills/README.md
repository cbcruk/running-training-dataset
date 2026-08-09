# Agent skills

Vendored from [mattpocock/skills](https://github.com/mattpocock/skills) — copied as editable
files, not a managed plugin. Update by re-copying from upstream and re-applying the local
edits noted below.

## What's here, and why it fits this repo

This repo is a curated dataset: its hard work is settling questions (`docs/TODO.md`),
verifying claims against primary sources (`docs/verification.md`), and recording decisions
(`docs/adr/`). The skills taken are the ones that serve that.

**Precondition** — `setup-matt-pocock-skills`. Run once, before the rest.

**Router** — `ask-matt`. Asks which skill or flow fits the situation.

**Deciding things**

- `grilling` — the interview primitive: rounds, a frontier of answerable questions, a recommended answer per question.
- `grill-with-docs` — grilling that leaves a paper trail (`CONTEXT.md`, ADRs). The default in this repo.
- `grill-me` — the same interview, stateless, for when there's no working directory.
- `wayfinder` — for an effort too big for one session: a map of decision tickets, resolved one at a time.
- `domain-modeling` — the glossary and ADR discipline. This repo already has `docs/adr/`; this is the skill that keeps it honest.

**Sourcing and verifying**

- `research` — background agent, primary sources only, cited Markdown output. This is the shape of `docs/TODO.md` §1b.

**Building**

- `to-spec`, `to-tickets`, `implement` — thread → spec → tracer-bullet tickets → build.
- `tdd` — what makes a test worth keeping, and the red-green loop rules.
- `codebase-design` — deep-module vocabulary (module, interface, seam, depth).
- `diagnosing-bugs` — the tight-feedback-loop discipline for hard bugs.
- `prototype` — throwaway code to answer one design question.

**Session hygiene**

- `handoff` — compact a conversation into a portable document.
- `wait-what` — re-pitch a message that didn't land.
- `writing-for-agents` — reference for editing `CLAUDE.md` and these skills.

## Deliberately not taken

`code-review` (Claude Code's built-in `/code-review` covers it, and the names would clash),
`triage` (for issues you didn't create — this is a solo repo), `setup-pre-commit`
(`.vite-hooks/pre-commit` already runs `vp staged`), `improve-codebase-architecture`,
`resolving-merge-conflicts`, `wizard`, `to-questionnaire`, `teach`, `git-guardrails-claude-code`,
`migrate-to-shoehorn`, `scaffold-exercises`, and everything under `in-progress/`.

## Local edits to upstream

- `agents/openai.yaml` dropped from every skill (Codex-only).
- References to skills not taken were removed or redirected: `ask-matt/SKILL.md`,
  `diagnosing-bugs/SKILL.md`, `setup-matt-pocock-skills/domain.md`.
- `ask-matt` and `implement` now point `/code-review` at Claude Code's built-in.
