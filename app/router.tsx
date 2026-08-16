/**
 * 라우터. Start가 서버와 브라우저 양쪽에서 이 함수를 부른다.
 *
 * `basepath`는 여기 없다. Start가 Vite의 `base`에서 유도해 하이드레이션과 서버 핸들러
 * 양쪽에 넣어준다(vite.config.ts의 `BASE` 주석). 여기서 한 번 더 적으면 두 값이 갈라질 수
 * 있는 자리가 생긴다.
 */
import { createRouter as createTanStackRouter } from '@tanstack/react-router'

import { NotFound } from './ui/lists.tsx'
import { routeTree } from './routeTree.gen.ts'

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    // 사전은 라우트마다 문서 하나다. 넘어갈 때 브라우저가 문서 맨 위에서 시작해야 한다.
    scrollRestoration: true,
    defaultNotFoundComponent: () => <NotFound id="" />,
  })
}
