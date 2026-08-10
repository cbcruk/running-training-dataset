/**
 * 요청 스코프 렌더러. 액션이 `context.render(<Page/>)`로 응답을 만든다.
 *
 * 스트림으로 렌더하고 문자열로 받는다. 스트림이어야 하는 이유는 `resolveClientEntry`를
 * 받는 쪽이 그것뿐이기 때문이고, 문자열로 받는 이유는 이 사이트에 `<Frame>`이 없어서 —
 * 데이터는 전부 프로세스 안에 있다 — 스트리밍이 아무것도 벌어주지 않는 데다 프리렌더러가
 * 어차피 본문 전체를 파일로 쓰기 때문이다.
 */
import { renderWith } from 'remix/middleware/render'
import { createHtmlResponse } from 'remix/response/html'
import type { RemixNode } from 'remix/ui'
import { renderToStream } from 'remix/ui/server'

import { assetServer } from '../assets.ts'

export function render() {
  return renderWith(
    () =>
      async function render(node: RemixNode, init?: ResponseInit) {
        const stream = renderToStream(node, {
          onError(error) {
            console.error(error)
          },
          /** 클라이언트 엔트리의 소스 URL을 브라우저가 받을 수 있는 에셋 URL로 바꾼다. */
          async resolveClientEntry(entryId, component) {
            if (!entryId.startsWith('file://')) {
              throw new Error(
                `clientEntry ID는 \`import.meta.url\`이어야 한다. 받은 값: '${entryId}'`,
              )
            }
            return {
              // getHref는 이미 배포 base를 달고 나온다(app/ui/href.ts의 ASSET_BASE).
              href: await assetServer.getHref(entryId.split('#')[0]),
              exportName: entryId.split('#')[1] || component.name || 'default',
            }
          },
        })

        return createHtmlResponse(`<!doctype html>${await new Response(stream).text()}`, init)
      },
  )
}
