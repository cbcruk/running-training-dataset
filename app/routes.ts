/**
 * URL 계약. 이 앱의 모든 링크가 여기서 나온다.
 *
 * 코드 기반 라우트지 파일 기반이 아니다 — 라우트 집합은 데이터에서 유도되고(44개 엔트리)
 * 한 화면에 들어온다. ADR 0004가 TanStack Router에 대해 적었던 것과 같은 이유다.
 *
 * 패턴은 사이트 루트 기준이고 배포 base는 여기 없다. GitHub Pages는 이 저장소를
 * /<repo>/ 아래에서 서빙하므로 그 접두사는 링크를 만들 때 app/ui/href.ts가 한 곳에서
 * 붙인다 — 라우트 계약에 배포 경로가 박히지 않게 하려는 것이다.
 *
 * 브라우저 모듈은 여기 없다. 그것만은 base가 패턴 자체에 들어가야 하고, 이유는
 * app/ui/href.ts의 `ASSET_BASE`가 적고 있다. 등록은 app/router.ts가 한다.
 */
import { get, route } from 'remix/routes'

export const routes = route({
  home: '/',
  workouts: '/workouts',
  anchors: '/anchors',

  system: '/system/:id',
  workout: '/workout/:id',
  anchor: '/anchor/:model',

  /**
   * 검색은 클라이언트에서 돈다(app/assets/search.tsx). 코퍼스를 번들에 넣는 대신 이
   * 엔드포인트가 검색이 실제로 읽는 필드만 내려준다. 정적 호스팅에서도 같은 파일이
   * dist/에 구워지므로 두 호스트가 같은 것을 읽는다.
   */
  searchIndex: get('/search-index.json'),
})
