import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite-plus'

import { allPaths } from './app/data/index.ts'

/**
 * 빌드는 다시 Vite가 소유한다(ADR 0010). `defineConfig`가 아직 `vite-plus`에서 오는 이유는
 * 아래 `fmt`·`lint`·`staged` 블록 때문이고, 그 셋은 `vp check`가 읽는다 — 포맷·린트·타입
 * 검사만 Vite+에 남았다. 번들과 개발 서버는 TanStack Start가 가져간다.
 */

/**
 * 사이트 루트. 개발 서버는 `/`에서 서빙하므로 기본값이 그것이고, Pages 빌드는
 * `BASE_PATH=/running-training-dataset/`를 넘긴다.
 *
 * 여기 한 줄이 전부다. Vite의 `base`가 에셋 URL에 붙이고, Start가 같은 값에서 라우터의
 * `basepath`를 유도해 모든 `<Link>`에 붙인다(`deriveRouterBasepath`). 그래서 `basepath`를
 * 따로 적지 않는다 — 두 곳에 적으면 두 곳이 갈라질 수 있고, ADR 0009 시절 링크마다 손으로
 * 접두사를 붙이던 함정이 바로 그것이었다.
 */
const BASE = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base: BASE,

  plugins: [
    tanstackStart({
      srcDirectory: 'app',
      router: {
        // 생성되는 routeTree.gen.ts도 저장소의 포맷 규약을 따라야 `vp check`가 조용하다.
        quoteStyle: 'single',
        semicolons: false,
      },

      /**
       * 정적 내보내기. ADR 0004가 Start를 거절한 이유는 SPA 셸이었고, 이 블록이 그 이유를
       * 지운다 — 엔트리마다 진짜 HTML 파일이 하나씩 나온다(ADR 0001).
       *
       * 경로는 크롤링이 아니라 데이터에서 온다. `allPaths()`가 프리렌더 대상의 유일한
       * 정의이고, CI가 같은 함수로 개수를 대조한다. 크롤링에 맡기면 어느 목록에서도
       * 링크되지 않은 엔트리가 조용히 빠질 수 있다.
       */
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
        failOnError: true,
      },
      pages: allPaths().map((path) => ({ path })),

      /**
       * GitHub Pages가 파일 없는 경로에 주는 문서. SPA 셸이다.
       *
       * ADR 0004가 거절한 것이 SPA 셸이었고 그 판단은 유효하다 — 사전의 47개 라우트는
       * 여전히 전부 프리렌더된 진짜 문서다. 셸은 **딱 하나의 URL**을 위해 존재한다:
       * 어디에도 걸리지 않은 주소.
       *
       * 이유는 하이드레이션이다. 예전처럼 홈 문서를 404.html로 복사하면, 브라우저는
       * `/system/오타`에서 홈의 마크업을 받아 라우터가 그리려는 not-found와 맞춰야 하고,
       * React가 불일치로 죽는다(#418). 셸은 라우트 내용을 담지 않으므로 맞출 것이 없다.
       */
      spa: {
        enabled: true,
        /**
         * 셸을 어느 URL에서 렌더할지. `app/routes/404.tsx`가 이것 하나 때문에 존재한다.
         *
         * 두 조건을 동시에 만족해야 한다. **200이어야 하고**(프리렌더러가 실패로 보지
         * 않게), **`allPaths()`에 없어야 한다**(셸은 프리렌더 목록에 한 항목으로 들어가고,
         * 진짜 라우트와 경로가 겹치면 그 라우트에 밀려 아무것도 나오지 않는다). 게다가 이
         * 경로에서는 내비게이션 탭이 하나도 활성이 아니라서, 어떤 URL에서 하이드레이트해도
         * 셸의 마크업이 어긋나지 않는다.
         */
        maskPath: '/404',
        // 확장자를 붙이지 않는다. 셸로 인식되면 프리렌더러가 `.html`을 직접 붙여
        // `dist/client/404.html`에 쓴다 — 디렉터리 안의 index.html이 아니라.
        prerender: { outputPath: '/404' },
      },
    }),

    viteReact(),
  ],

  staged: {
    '*': 'vp check --fix',
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: [
      // 벤더링한 에이전트 스킬은 남의 산문이다. 포맷해봐야 얻는 것이 없고, 스킬을 갱신할
      // 때마다 재포맷 충돌로 도착한다.
      '.claude/**',
      // 라우트 트리는 라우터 생성기가 소유한다. Vite가 도는 모든 명령이 이 파일을 다시
      // 쓰므로, 포맷을 고쳐두면 다음 명령이 되돌려놓고 검사가 영원히 빨갛다. 린트와 타입
      // 검사는 그대로 받는다 — 검사에서 빠지는 것은 포맷뿐이다.
      'app/routeTree.gen.ts',
    ],
    singleQuote: true,
    semi: false,
  },
})
