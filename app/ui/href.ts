/**
 * 절대 URL이 필요한 태그(canonical, og:url)를 만드는 한 곳.
 *
 * 예전 판본은 여기서 내부 링크 전부에 배포 base를 손으로 붙였다. 그 일은 이제 라우터가
 * 한다 — `basepath`가 vite.config.ts에서 한 번 설정되고 모든 `<Link>`가 그것을 달고
 * 나온다(ADR 0010). 남은 것은 라우터가 결코 만들지 않는 것, 즉 **원점을 포함한 절대
 * URL**뿐이다. 크롤러와 링크 프리뷰가 읽는 것이 그것이고, 상대 경로로는 쓸 수 없다.
 */

/** 경로 부분은 붙이지 않는다 — 그건 base의 몫이다. */
const SITE_ORIGIN = (process.env.SITE_ORIGIN ?? 'https://cbcruk.github.io').replace(/\/$/, '')

/**
 * 사이트 루트 기준 경로 -> canonical/og:url에 쓸 절대 URL.
 *
 * base는 Vite가 `import.meta.env.BASE_URL`로 건네준다. vite.config.ts의 `base`와 라우터의
 * `basepath`가 같은 한 줄에서 나오므로, 여기서 읽는 값이 링크가 다는 값과 갈라질 수 없다.
 */
export function canonical(path: string): string {
  const base = import.meta.env.BASE_URL
  return SITE_ORIGIN + base + path.replace(/^\//, '')
}
