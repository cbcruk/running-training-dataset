/**
 * 브라우저 모듈 서버.
 *
 * 개발 서버는 요청마다 컴파일한다. 정적 내보내기(scripts/prerender.ts)는 같은 서버에서
 * 파일을 받아 dist/에 굽는다 — 그래서 GitHub Pages가 서빙하는 것과 개발 중에 보는 것이
 * 같은 컴파일러를 통과한 같은 바이트다.
 */
import { createAssetServer } from 'remix/assets'
import { ASSET_BASE, BASE } from './ui/href.ts'

const isDevelopment = (process.env.NODE_ENV ?? 'development') === 'development'

export const assetServer = createAssetServer({
  basePath: ASSET_BASE,
  rootDir: process.cwd(),
  fileMap: {
    'app/*path': 'app/*path',
    'node_modules/*path': 'node_modules/*path',
  },
  allow: ['app/assets/**', 'app/routes.ts', 'app/ui/href.ts', 'node_modules/**'],
  sourceMaps: isDevelopment ? 'external' : undefined,
  minify: !isDevelopment,
  watch: false,
  scripts: {
    /**
     * 브라우저에는 `process.env`가 없다. 배포 base와 모드는 빌드 시점에 상수로 박힌다 —
     * app/ui/href.ts가 서버와 브라우저 양쪽에서 같은 한 줄을 쓰게 하려는 것이다.
     */
    define: {
      'process.env.BASE_PATH': JSON.stringify(BASE),
      'process.env.NODE_ENV': JSON.stringify(isDevelopment ? 'development' : 'production'),
    },
  },
})
