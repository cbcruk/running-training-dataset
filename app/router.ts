/**
 * 라우터. 미들웨어 스택과 라우트 맵 -> 컨트롤러 배선.
 *
 * `staticFiles`가 public/을 서빙하므로 style.css와 sw.js는 개발 서버에서도 배포에서도
 * 같은 URL에 있다. 정적 내보내기는 그 디렉터리를 dist/로 그대로 복사한다.
 */
import { createRouter, type MiddlewareContext } from 'remix/router'
import { staticFiles } from 'remix/middleware/static'

import controller from './actions/controller.tsx'
import { assetServer } from './assets.ts'
import { render } from './middleware/render.tsx'
import { routes } from './routes.ts'
import { ASSET_BASE } from './ui/href.ts'

type AppContext = MiddlewareContext<[ReturnType<typeof render>]>

declare module 'remix/router' {
  interface RouterTypes {
    context: AppContext
  }
}

export const router = createRouter<AppContext>({
  middleware: [staticFiles('./public', { index: false }), render()],
})

router.map(routes, controller)

/**
 * 브라우저 모듈만 라우트 맵 밖에서 등록된다. 마운트 지점이 배포 base를 포함해야 하고
 * (app/ui/href.ts의 `ASSET_BASE`), 그건 실행 시점 문자열이라 타입이 붙은 라우트 계약에
 * 넣을 수 없기 때문이다. 여기서 넘겨받는 것은 요청 하나뿐이고 params는 쓰지 않는다.
 */
router.get(`${ASSET_BASE}/*path`, async ({ request }) => {
  return (await assetServer.fetch(request)) ?? new Response('Not Found', { status: 404 })
})
