/**
 * 라우트와 마크업 사이의 유일한 어댑터.
 *
 * ADR 0004가 세운 규칙을 그대로 옮긴 것이다. 그때는 TanStack의 `Link`를 감싼
 * `EntryLink`였고 이유는 내비게이션이었다. 지금은 배포 base다. `routes.system.href({id})`는
 * `/system/daniels`를 주는데 GitHub Pages는 이 사이트를 `/running-training-dataset/`
 * 아래에서 서빙하므로, 그대로 쓰면 링크가 전부 사이트 밖을 가리킨다.
 *
 * 내부 링크는 전부 이걸 통과해야 한다. 날것의 `routes.x.href()`는 개발 서버에서
 * 멀쩡해 보이면서 배포에서만 깨진다 — ADR 0004가 기록한 것과 같은 종류의 함정이다.
 */

/**
 * 사이트 루트. 개발 서버는 `/`에서 서빙하므로 기본값이 그것이고, Pages 빌드는
 * `BASE_PATH=/running-training-dataset/`를 넘긴다. 항상 `/`로 끝난다.
 */
const raw = process.env.BASE_PATH ?? '/'
export const BASE = raw.endsWith('/') ? raw : `${raw}/`

/** 라우트가 만든 사이트 루트 기준 경로에 배포 base를 붙인다. */
export function url(path: string): string {
  return BASE + path.replace(/^\//, '')
}

/**
 * 에셋 서버의 공개 마운트 지점. 여기만 base가 라우트 패턴 자체에 들어간다.
 *
 * 문서 라우트는 사이트 루트 기준으로 정의되고(app/routes.ts) base는 링크를 쓸 때 붙는다.
 * 브라우저 모듈은 그럴 수 없다. 컴파일러가 모듈끼리의 임포트를 자기 basePath 기준 URL로
 * 다시 쓰기 때문에, 그 URL이 처음부터 base를 달고 있지 않으면 배포된 사이트에서 임포트가
 * 전부 사이트 밖을 가리킨다 — 개발 서버(base가 `/`)에서는 멀쩡히 통과하면서.
 */
export const ASSET_BASE = `${BASE}assets`

/** 브라우저 모듈 하나의 공개 URL. `asset('app/assets/entry.ts')`. */
export function asset(filePath: string): string {
  return `${ASSET_BASE}/${filePath.replace(/^\//, '')}`
}
