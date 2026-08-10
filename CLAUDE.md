<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## 프로젝트 언어

이 저장소의 산문은 한국어다 — README, TODO, ADR 0006부터, 생성 문서, 코드 주석.
영어로 남는 것은 셋뿐이고 각각 이유가 있다([ADR 0007](docs/adr/0007-korean-repo-prose.md)):

- **ADR 0001–0005** — 날짜가 박힌 기록이라 소급해 다시 쓰지 않는다.
- **`scripts/rules.ts`의 검증 메시지와 CLI 출력** — CI 로그에서 node·ajv·oxlint 출력
  사이에 나오고, `rule` id가 영어 kebab-case 계약이다.
- **커밋 메시지** — 과거 것이 이미 영어로 확정됐고, `git log`·`git blame`에서 브랜치명·
  파일 경로 사이에 놓인다.

데이터의 산문도 한국어다. 영어가 남아 있는 곳(`calls_it`, `canonical_name`, `attribution`,
인용)은 번역이 아니라 **데이터**이므로 건드리지 않는다 —
[ADR 0006](docs/adr/0006-korean-only-dataset.md).

## 에이전트 스킬

### 이슈 트래커

이슈는 `cbcruk/running-training-dataset`의 GitHub Issues에 있고 `gh` CLI로 다룬다.
`docs/agents/issue-tracker.md` 참조.

### 도메인 문서

단일 컨텍스트: 저장소 루트의 `CONTEXT.md`와 `docs/adr/`. `docs/agents/domain.md` 참조.
