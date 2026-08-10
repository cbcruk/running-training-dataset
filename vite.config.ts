import { defineConfig } from 'vite-plus'

/**
 * Vite+는 더 이상 이 사이트를 빌드하지 않는다. 번들과 개발 서버는 Remix 3가 가져갔고
 * (ADR 0009), 여기 남은 것은 포맷·린트·타입 검사·테스트다 — CLAUDE.md의 체크리스트가
 * 부르는 `vp check`와 `vp test`가 그것이다.
 */
export default defineConfig({
  // JSX는 oxc가 변환한다. tsconfig의 jsx 설정은 타입 검사기에만 알려주므로, 테스트가
  // 컴파일하는 JSX도 같은 런타임을 가리키게 여기 한 번 더 적는다.
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'remix/ui' },
  },
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
    // 벤더링한 에이전트 스킬은 남의 산문이다. 포맷해봐야 얻는 것이 없고, 스킬을 갱신할
    // 때마다 재포맷 충돌로 도착한다.
    ignorePatterns: ['.claude/**'],
    singleQuote: true,
    semi: false,
  },
})
