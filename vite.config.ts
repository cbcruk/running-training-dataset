import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite-plus'

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
       * SPA. 빌드가 내놓는 문서는 셸 **하나**뿐이다(ADR 0011).
       *
       * ADR 0010까지는 여기 `prerender` 블록이 있었고 엔트리마다 진짜 HTML 파일이 하나씩
       * 나왔다. 그것이 ADR 0001의 "발견" 절반이었고, 지금 포기하는 것이 그것이다 — 무엇을
       * 잃는지는 ADR 0011이 적는다. 프리렌더를 다시 켜는 것은 이 블록을 되살리는 일이므로,
       * 그 문서와 `git log`가 필요한 전부다.
       *
       * `spa.enabled`가 프리렌더러를 강제로 켜지만(`postBuild`), 굽는 페이지는 셸 하나다.
       */
      spa: {
        enabled: true,
        /**
         * 셸을 어느 URL에서 렌더할지. `app/routes/404.tsx`가 이것 하나 때문에 존재한다.
         *
         * 셸은 **모든** URL에서 하이드레이트되므로, 어느 한 URL에 치우친 마크업을 담으면
         * 안 된다. `/404`에서는 내비게이션 탭이 하나도 활성이 아니고 브랜드 링크도 활성이
         * 아니라서, 그 치우침이 없는 유일한 주소다. 200이기도 해야 하는데(프리렌더러가
         * 실패로 보지 않게) 그 200을 주는 것이 그 라우트다.
         */
        maskPath: '/404',
        /**
         * `/index`이지 `/404`가 아니다. 셸이 곧 사이트의 문서이므로 `index.html`로 나가야
         * 하고, GitHub Pages가 파일 없는 경로에 주는 `404.html`은 그 복사본이다
         * (`scripts/pages-404.ts`). 확장자를 붙이지 않는 이유는 프리렌더러가 셸로 인식하면
         * `.html`을 직접 붙이기 때문이다.
         */
        prerender: { outputPath: '/index' },
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
