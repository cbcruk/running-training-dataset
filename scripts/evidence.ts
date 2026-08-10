/**
 * 행의 근거 그래프를 걷는 유일한 워커.
 *
 * `evidence`는 한 행의 여러 자리에 달린다 — 행 자신, `claim`, `test`, `distribution`,
 * 각 `volume_cap`. 그리고 소비자마다 같은 세 가지를 필요로 한다: 어디에 있는지, 무엇을
 * 주장하는지, 그리고 무엇의 근거여야 하는지에 해당하는 가장 가까운 문장. 이 모듈 이전에는
 * 그 형태가 validate.ts와 verify.ts에 네 번 따로 인코딩되어 있었고, 근거의 위치를 옮기는
 * 스키마 변경이 어떤 워커에는 반영되고 어떤 워커에는 누락되어도 아무것도 실패하지 않았다.
 *
 * svg.ts처럼 순수하고 DOM이 없다. 검증기와 워크시트 생성기는 하나의 순회 위에 놓인 두
 * 어댑터이고, 그것이 둘이 데이터의 내용에 대해 다른 말을 하지 못하게 막는다.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = any

export type Tier = 'consensus' | 'plausible' | 'tradition'

export interface Evidence {
  tier: Tier
  cite?: string[]
  note?: unknown
}

/**
 * 가장 가까운 반증 가능한 문장이 어떤 종류인지. 읽는 사람이 소스를 무엇과 대조하는지
 * 알아야 하기 때문이다. `none`은 그 근거가 무엇의 근거인지 진술된 것이 없다는 뜻이고,
 * 그 자체가 발견이지 표기상의 문제가 아니다.
 */
export type AssertionKind = 'proposition' | 'test' | 'unobservable-test' | 'none'

export interface Assertion {
  /** 근거를 담은 노드까지의 점 표기 경로. 행 자신은 "". */
  path: string
  evidence: Evidence
  /** 원문 그대로. 표시 형태는 호출자가 정한다. */
  proposition?: Row
  kind: AssertionKind
}

/**
 * 한 행의 모든 근거 객체를 문서 순서대로, 각각 자기 위나 자기 자리의 가장 가까운 명제와
 * 짝지어 돌려준다.
 *
 * 노드가 가진 자기 문장이 상속된 것을 이긴다. 자기 문장이 없으면 가장 가까운 조상의 것이
 * 내려온다. 훈련법의 행 수준 `evidence`는 `claim` 안이 아니라 옆에 앉으므로, 행 자신의
 * 명제로 순회를 시작한다 — 그러지 않으면 파일에서 가장 강한 주장이 미부착으로 보고된다.
 */
export function assertions(row: Row): Assertion[] {
  const out: Assertion[] = []

  const visit = (node: Row, path: string, inherited: Row, inheritedKind: AssertionKind) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => visit(v, `${path}[${i}]`, inherited, inheritedKind))
      return
    }
    if (!node || typeof node !== 'object') return

    let proposition = inherited
    let kind = inheritedKind
    if (node.proposition) {
      proposition = node.proposition
      kind = 'proposition'
    } else if (node.what) {
      proposition = node.what
      kind = 'test'
    } else if (node.detectable === false && node.mechanism) {
      proposition = node.mechanism
      kind = 'unobservable-test'
    }

    if (node.evidence?.tier) {
      out.push({ path, evidence: node.evidence, proposition, kind })
    }
    for (const [k, v] of Object.entries(node)) {
      if (k !== 'evidence') visit(v, path ? `${path}.${k}` : k, proposition, kind)
    }
  }

  const seed = row.claim?.proposition
  visit(row, '', seed, seed ? 'proposition' : 'none')
  return out
}

/** 그 행 어디에서든 근거로 인용된 서로 다른 참조 전부. */
export function citedWorks(row: Row): Set<string> {
  const out = new Set<string>()
  for (const a of assertions(row)) for (const c of a.evidence.cite ?? []) out.add(c)
  return out
}
