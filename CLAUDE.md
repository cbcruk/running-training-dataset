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

## 툴체인 (위 블록에 대한 단서)

위의 Vite+ 블록은 `vp config`가 생성한다. 이 저장소에서 Vite+는 **더 이상 앱을 빌드하지
않는다** — 번들과 개발 서버는 TanStack Start가 가져갔다
([ADR 0010](docs/adr/0010-tanstack-start.md)). 실제로 도는 것은 이것들이다:

- `pnpm install` — `vp install`이 아니다.
- `pnpm run check` — 포맷·린트·타입 검사. 이것만 Vite+(`vp check`)가 한다.
- `pnpm run test` — Node 내장 테스트 러너를 `vite-node`로 띄운다. `vp test`는 쓰지 않는다.
- `pnpm run dev` / `pnpm run build` — Vite 개발 서버와 정적 내보내기(`dist/client/`).
- `pnpm run validate` / `render` / `types` / `verify` — 데이터 쪽 스크립트. 전부 `vite-node`.

기억해야 할 것 셋:

- **내부 링크는 `<Link>`나 `app/ui/primitives.tsx`의 `SystemLink`/`WorkoutLink`/`AnchorLink`를
  통과해야 한다.** 날것의 `<a href>`는 모든 검사를 통과하면서 내비게이션마다 조용히 전체
  리로드를 한다(ADR 0004가 기록한 함정).
- **`app/routeTree.gen.ts`는 생성물이다.** 손으로 고치지 말 것. Vite가 도는 모든 명령이 다시
  쓰고, 커밋된 내용이 `app/routes/`와 맞는지는 CI가 본다.
- **프리렌더된 문서를 `grep`할 때는 `-a`를 붙일 것.** 하이드레이션 페이로드에 NUL 바이트가
  있어서 grep이 바이너리로 보고 침묵한다.

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
