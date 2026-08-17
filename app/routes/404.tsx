/**
 * `/404`. 이 라우트가 존재하는 이유는 GitHub Pages다.
 *
 * Pages는 파일이 없는 경로에 `404.html`을 준다. 그 문서는 **아무 URL에서나** 하이드레이트
 * 되어야 하므로 라우트 내용을 담을 수 없고, 그래서 SPA 셸이다(vite.config.ts의 `spa`).
 * 프리렌더러는 셸을 만들려고 어딘가 하나를 200으로 받아와야 하는데, 그 "어딘가"가 여기다 —
 * 사전의 어떤 엔트리도 가리지 않고, 내비게이션 탭도 하나도 활성이 아닌 주소.
 *
 * 이 URL 자체는 프리렌더되지 않는다(`allPaths()`에 없다). 직접 열면 Pages가 404.html을
 * 주고, 셸이 라우터를 깨워 여기로 되돌아온다.
 */
import { createFileRoute } from '@tanstack/react-router'

import { NotFound } from '../ui/lists.tsx'

export const Route = createFileRoute('/404')({
  component: () => <NotFound id="" />,
})
