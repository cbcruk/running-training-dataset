/**
 * 개발·미리보기 서버.
 *
 * 배포는 이걸 쓰지 않는다. 사이트는 GitHub Pages에 정적 파일로 나가고, 그 파일들은
 * scripts/prerender.ts가 바로 이 라우터에서 받아 굽는다 — 그래서 여기서 보는 것과
 * 배포된 것이 같은 코드에서 나온다.
 */
import * as http from 'node:http'
import { createRequestListener } from 'remix/node-fetch-server'

import { router } from './app/router.ts'

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 4173

const server = http.createServer(
  createRequestListener(async (request) => {
    try {
      return await router.fetch(request)
    } catch (error) {
      if (!(request.signal.aborted && error === request.signal.reason)) {
        console.error(error)
      }
      return new Response('Internal Server Error', { status: 500 })
    }
  }),
)

server.listen(port, () => {
  console.log(`서버: http://localhost:${port}`)
})

let shuttingDown = false

function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  server.close(() => process.exit(0))
  server.closeAllConnections()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
