# 이슈 트래커: GitHub

이 저장소의 이슈와 스펙은 `cbcruk/running-training-dataset`의 GitHub 이슈로 산다. 모든
작업은 `gh` CLI로 한다.

## 규약

- **이슈 생성**: `gh issue create --title "..." --body "..."`. 여러 줄 본문은 heredoc을 쓴다.
- **이슈 읽기**: `gh issue view <number> --comments`. 댓글은 `jq`로 거르고 라벨도 함께 가져온다.
- **이슈 목록**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` 에 적절한 `--label`·`--state` 필터를 붙인다.
- **댓글**: `gh issue comment <number> --body "..."`
- **라벨 추가/제거**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **닫기**: `gh issue close <number> --comment "..."`

저장소는 `git remote -v`에서 유추한다 — 클론 안에서 실행하면 `gh`가 알아서 한다.

**이슈 본문과 댓글은 한국어로 쓴다** — 이 저장소 산문의 언어를 따른다
([ADR 0007](../adr/0007-korean-repo-prose.md)). 라벨·필드명·CLI 플래그는 영어 그대로다.

## 트리아지 대상으로서의 풀 리퀘스트

**PR을 요청 창구로 삼는가: 아니오.** _(외부 PR을 기능 요청으로 다루는 저장소라면 `yes`로
바꾼다. `/triage`가 이 플래그를 읽는다.)_

`yes`일 때 PR은 이슈와 같은 라벨·상태를 거치며, `gh pr` 대응 명령을 쓴다:

- **PR 읽기**: `gh pr view <number> --comments`, diff는 `gh pr diff <number>`.
- **트리아지 대상 외부 PR 목록**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` 로 받은 뒤 `authorAssociation`이 `CONTRIBUTOR`·`FIRST_TIME_CONTRIBUTOR`·`NONE`인 것만 남긴다(`OWNER`/`MEMBER`/`COLLABORATOR`는 버린다).
- **댓글 / 라벨 / 닫기**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub은 이슈와 PR이 번호 공간을 공유하므로 `#42`만으로는 어느 쪽인지 알 수 없다 —
`gh pr view 42`로 확인하고 실패하면 `gh issue view 42`로 넘어간다.

## 스킬이 "이슈 트래커에 게시하라"고 할 때

GitHub 이슈를 만든다.

## 스킬이 "해당 티켓을 가져오라"고 할 때

`gh issue view <number> --comments`를 실행한다.

## Wayfinding 연산

`/wayfinder`가 쓴다. **맵**은 이슈 하나이고 **자식** 이슈가 티켓이다.

- **맵**: `wayfinder:map` 라벨이 붙은 이슈 하나. Notes / Decisions-so-far / Fog 본문을 담는다. `gh issue create --label wayfinder:map`.
- **자식 티켓**: GitHub 서브이슈로 맵에 연결된 이슈(서브이슈 엔드포인트에 `gh api`). 서브이슈가 활성화돼 있지 않으면 맵 본문의 태스크 리스트에 자식을 넣고 자식 본문 맨 위에 `Part of #<map>`을 적는다. 라벨은 `wayfinder:<type>`(`research`/`prototype`/`grilling`/`task`). 점유되면 티켓은 진행하는 개발자에게 할당된다.
- **블로킹**: GitHub의 **네이티브 이슈 의존성** — UI에 보이는 정본 표현. `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` 로 간선을 추가하며, `<blocker-db-id>`는 블로커의 숫자 **데이터베이스 id**다(`gh api repos/<owner>/<repo>/issues/<n> --jq .id`. `#number`나 `node_id`가 _아니다_). GitHub은 `issue_dependencies_summary.blocked_by`를 보고한다(열린 블로커만 — 살아 있는 게이트). 의존성을 쓸 수 없으면 자식 본문 맨 위의 `Blocked by: #<n>, #<n>` 줄로 대체한다. 모든 블로커가 닫히면 티켓이 풀린다.
- **프론티어 질의**: 맵의 열린 자식들을 나열하고(`gh issue list --state open`, 맵의 서브이슈/태스크 리스트로 한정), 열린 블로커가 있거나(`issue_dependencies_summary.blocked_by > 0`, 또는 `Blocked by` 줄에 열린 이슈) 담당자가 있는 것을 버린다. 맵 순서상 첫 번째가 이긴다.
- **점유**: `gh issue edit <n> --add-assignee @me` — 세션의 첫 쓰기.
- **해결**: `gh issue comment <n> --body "<답>"` 후 `gh issue close <n>`, 그리고 맵의 Decisions-so-far에 컨텍스트 포인터(gist + 링크)를 덧붙인다.
