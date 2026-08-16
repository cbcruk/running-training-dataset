#!/usr/bin/env node
/**
 * dist/client/index.html -> dist/client/404.html.
 *
 * GitHub Pages는 파일이 없는 경로에 `404.html`을 준다. 이 사이트에는 이제 문서가 셸 하나뿐
 * 이므로(ADR 0011), 그 셸을 두 이름으로 두면 `/system/daniels`로 직접 들어온 사람도 같은
 * 셸을 받고 라우터가 넘겨받는다. 정적 호스트에서 히스토리 API 라우팅을 쓰는 표준 방법이고,
 * 서버 재작성 규칙이 필요 없는 유일한 방법이다.
 *
 * 셸에는 라우트 내용이 없으므로 두 파일이 같아도 안전하다. ADR 0010에서 홈 문서를 404로
 * 복사했다가 하이드레이션이 깨졌던 것(React #418)은 그 문서가 홈의 마크업을 담고 있었기
 * 때문이다.
 */
import { copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const client = resolve(root, 'dist/client')

await copyFile(resolve(client, 'index.html'), resolve(client, '404.html'))

console.log('dist/client/404.html <- index.html')
