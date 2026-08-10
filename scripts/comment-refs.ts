/**
 * 주석이 이름을 부르는 모든 파일과, 그것이 아직 있는지.
 *
 * 산문은 이 저장소에서 아무것도 검사하지 않던 유일한 부분이었다. 확장자 전환과 뷰의
 * 컴포넌트화가 남기고 간 결과로, 주석 열여섯 개가 더 이상 존재하지 않는 파일을 부르고
 * 있었다. 그중 하나는 낡은 것보다 나빴다. 프리렌더러가 빌드 산출물을 임포트한다고
 * 서술하고 있었는데, 네 줄 아래에서 소스를 임포트하고 있었다. 이런 참조가 100개가 넘고,
 * "업데이트하는 걸 기억하자"의 어떤 판본도 그 수를 견디지 못한다.
 *
 * 데이터가 이미 받는 것과 같은 처방. 진술하고, 검사 가능하게 만든다. 의도적으로 풀리지
 * 않는 참조는 아래 ALLOWED로 가고, 그러면 "이건 실수인가 요점인가"가 코드 안에서 한 번
 * 답해진 질문이 된다.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join, basename } from 'node:path'

/**
 * 저장소에 없는 것을 의도적으로 부르는 참조들.
 *
 * `views.jsx` — 어떤 파일을 그것이 대체한 템플릿 리터럴 원본과 비교하는 주석은 그 원본을
 * 부를 수밖에 없다. 그 문장 자체가 원본이 사라졌다는 이야기다.
 * `index.html` — 같은 경우. 문서 셸이 무엇을 대체했는지 말하는 주석이고, Remix 3로
 * 옮기면서 그 파일은 사라졌다(ADR 0009).
 * `404.html` — 프리렌더러가 dist/에 쓰므로 빌드 후에만 존재한다.
 */
const ALLOWED = new Set(['views.jsx', 'index.html', '404.html'])

const SKIP = new Set(['node_modules', 'dist', 'out', '.git', '.ssr', '.claude', 'types'])
const SCAN = /\.(ts|tsx|js|jsx|css)$/
const NAMED = /\.(ts|tsx|js|jsx|mjs|cjs|json|css|html|md)$/

/** 경로처럼 생긴 토큰: 짧은 소문자 확장자를 가진 이름, 공백 없음. */
const TOKEN = /(?:\.{0,2}\/)?[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.[a-z]{2,4}\b/g

export interface BrokenRef {
  file: string
  line: number
  ref: string
}

function walk(dir: string, root: string, all: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, root, all)
    else all.push(full.slice(root.length + 1))
  }
  return all
}

/**
 * 주석 줄만 본다. 문자열 리터럴 안의 경로는 코드다 — 틀리면 요란하게 깨지는 임포트 —
 * 이 검사의 도움이 필요 없다.
 */
function commentLines(src: string): [number, string][] {
  const out: [number, string][] = []
  let block = false
  src.split('\n').forEach((raw, i) => {
    const line = raw.trim()
    if (block) {
      out.push([i + 1, line])
      if (line.includes('*/')) block = false
    } else if (line.startsWith('//')) out.push([i + 1, line])
    else if (line.startsWith('/*')) {
      out.push([i + 1, line])
      if (!line.includes('*/')) block = true
    }
  })
  return out
}

/**
 * 참조가 실재하는 파일을 부르면 풀린 것으로 본다. 저장소 루트 기준, 주석이 있는 파일
 * 기준, 또는 `anchors.json` 같은 맨 이름이면 저장소 어디에서든 — 읽는 사람이 찾아갈 곳이
 * 거기이기 때문이다.
 */
export function brokenRefs(root: string): BrokenRef[] {
  const all = walk(root, root)
  const byName = new Set(all.map((p) => basename(p)))
  const byPath = new Set(all)
  const broken: BrokenRef[] = []

  for (const file of all.filter((p) => SCAN.test(p))) {
    for (const [line, text] of commentLines(readFileSync(resolve(root, file), 'utf8'))) {
      for (const ref of text.match(TOKEN) ?? []) {
        if (!NAMED.test(ref) || ALLOWED.has(ref) || ALLOWED.has(basename(ref))) continue
        const rel = ref.replace(/^\.\//, '')
        const beside = join(dirname(file), rel)
        if (byPath.has(rel) || byPath.has(beside) || (!ref.includes('/') && byName.has(ref)))
          continue
        broken.push({ file, line, ref })
      }
    }
  }
  return broken
}
