/** @jsxImportSource remix/ui */
/**
 * 공유 프리미티브. 상세 뷰마다 반복되는 형태들이다 — 대문자 h3와 선택적 부제를 가진
 * `<section className="block">`이 열두 번쯤 나온다.
 */
import type { Handle, RemixNode } from 'remix/ui'
import {
  byAnchor,
  CONSTRUCT_LABEL,
  ADAPT_CATEGORIES,
  ANCHOR_CONSTRUCTS,
  byAdaptation,
} from '../data/index.ts'
import { routes } from '../routes.ts'
import { url } from './href.ts'

export interface BlockProps {
  title: RemixNode
  sub?: RemixNode
  className?: string
  children?: RemixNode
}

export function Block(handle: Handle<BlockProps>) {
  return () => {
    const { title, sub, className: cls, children } = handle.props
    return (
      <section className={cls ? `block ${cls}` : 'block'}>
        <h3>{title}</h3>
        {sub ? <p className="sub">{sub}</p> : null}
        {children}
      </section>
    )
  }
}

export function Chip(handle: Handle<{ title?: string; className?: string; children?: RemixNode }>) {
  return () => {
    const { title, className: cls, children } = handle.props
    return (
      <span className={cls ? `chip ${cls}` : 'chip'} title={title}>
        {children}
      </span>
    )
  }
}

/**
 * 내부 링크.
 *
 * 평범한 `<a href>`다 — Remix 3에서 문서 내비게이션은 실제 내비게이션이고, 프리렌더된
 * 파일 하나하나가 진짜 문서라서 클릭이 그것을 그대로 연다. ADR 0004에서 이 어댑터가
 * 존재해야 했던 이유(라우터가 앵커를 가로채지 않는다)는 사라졌고, 남은 이유는 배포
 * base 하나뿐이다 — 그래서 href 계산은 app/ui/href.ts가 한다.
 */
export function EntryLink(
  handle: Handle<{ to: string; className?: string; title?: string; children?: RemixNode }>,
) {
  return () => {
    const { to, className, title, children } = handle.props
    return (
      <a href={url(to)} className={className} title={title}>
        {children}
      </a>
    )
  }
}

export function WChip(handle: Handle<{ to: string; children?: RemixNode }>) {
  return () => (
    <EntryLink className="wchip" to={handle.props.to}>
      {handle.props.children}
    </EntryLink>
  )
}

/**
 * 등급에는 의도적으로 서로 다른 시각 무게를 준다. 정설은 정착된 것으로, 관행은 입증되지
 * 않은 것으로 읽혀야 한다. 이것을 평평하게 만드는 것이 README가 금지하는 실패이고, 이
 * 컴포넌트가 디자인 시스템의 상태 배지가 되지 않고 맞춤으로 남는 이유이기도 하다
 * (ADR 0002). 등급은 success/warning/danger가 아니다.
 */
const TIER_LABEL: Record<string, string> = {
  consensus: '정설',
  plausible: '유력',
  tradition: '관행',
}

/**
 * `tradition`은 서로 다른 두 가지를 한 낱말로 덮고 있었다. 아무도 아직 연구하지 않은 것과,
 * 지금 서술된 형태로는 "얼마나"라는 질문 자체가 성립하지 않는 것. 앞의 것은 연구가 메울 수
 * 있는 공백이지만 뒤의 것은 영구적인 성질이라, 같은 배지로 읽히면 읽는 사람이 기다릴 값이
 * 없는 것을 기다리게 된다.
 *
 * `open`은 따로 표시하지 않는다. 등급 낱말이 이미 그 뜻이기 때문이다 — 45개 중 44개에
 * 배지를 붙이면 나머지 하나가 묻힌다. 표시되는 것은 예외뿐이고, 어느 쪽인지는 두 경우 모두
 * 툴팁이 말한다.
 */
const DOSE_TIP: Record<string, string> = {
  open: '용량 질문은 열려 있다. 통제 연구를 돌릴 수 있는데 아무도 돌리지 않았다.',
  unaskable:
    '용량 질문이 성립하지 않는다. 구간이 예시일 뿐이라 "얼마나"에 가리킬 대상이 없다. 연구가 더 쌓여도 이 칸은 채워지지 않으며, 정책 단위 시험은 여전히 가능하다.',
}

export function TierBadge(handle: Handle<{ tier?: string; dose?: string }>) {
  return () => {
    const { tier, dose } = handle.props
    if (!tier) return null
    const tip = dose
      ? `evidence tier: ${tier} · ${DOSE_TIP[dose] ?? dose}`
      : `evidence tier: ${tier}`
    return (
      <span
        className={`tier tier-${tier}${dose === 'unaskable' ? ' tier-unaskable' : ''}`}
        title={tip}
      >
        {TIER_LABEL[tier] || tier}
        {dose === 'unaskable' && (
          <span className="dose-mark" aria-label="용량 질문 성립 불가">
            ∅
          </span>
        )}
      </span>
    )
  }
}

/**
 * 출처 상태는 등급과 다른 질문에 답하고, 둘이 하나의 척도로 읽혀서는 안 된다. 등급은 그
 * 훈련법이 작동한다는 것이 얼마나 확립됐는지를 말하고, 이것은 애초에 그것이 무엇을
 * 처방하는지의 기록이 있기는 한지를 말한다. 그래서 등급과 색을 공유하지 않고 평결 단어
 * 대신 기호로 시작한다. 목록을 훑는 사람은 독립된 두 사실을 봐야지 하나의 강약 평점을
 * 봐서는 안 된다.
 *
 * 이것이 있는 이유는 부재가 보이지 않았기 때문이다. 대부분의 행에 `source`가 없고, 빈칸은
 * "괜찮음"으로 읽혔다 — 그래서 잘 문서화된 행과 그렇지 않은 행이, 독자가 무엇을 얼마나
 * 믿을지 정하는 바로 그 순간에 똑같아 보였다. 워크아웃도 훈련법과 같은 쌍을 같은 방식으로
 * 말한다. 읽는 사람이 자기가 어떤 종류의 항목을 보고 있는지 알 필요가 없다는 것이 요점이다.
 */
const PROVENANCE: Record<string, { mark: string; label: string; tip: string }> = {
  recorded: {
    mark: '◆',
    label: '정본',
    tip: '이 항목이 무엇을 처방하는지의 정본이 기록되어 있다. 그 처방이 효과가 있다는 뜻은 아니다 — 그건 등급이 따로 답한다.',
  },
  unrecorded: {
    mark: '◇',
    label: '정본 미기록',
    tip: '정본은 존재하지만 아직 이 데이터셋에 기록되지 않았다. 서술의 정확성이 확인되지 않았다는 뜻이다.',
  },
  uncitable: {
    mark: '⊘',
    label: '정본 없음',
    tip: '인용할 정본이 아예 없다. 이 행은 문헌으로 확인된 방법이 아니라 확인 불가능한 서술에서 옮겨진 것이므로, 정본이 있는 행과 같은 무게로 읽으면 안 된다.',
  },
}

export function ProvenanceBadge(handle: Handle<{ provenance?: string }>) {
  return () => {
    const { provenance } = handle.props
    const p = provenance ? PROVENANCE[provenance] : undefined
    if (!p) return null
    return (
      <span className={`prov prov-${provenance}`} title={p.tip}>
        <span className="prov-mark" aria-hidden="true">
          {p.mark}
        </span>
        {p.label}
      </span>
    )
  }
}

const UNRECORDED_NOTE =
  '정본은 존재하지만 아직 여기 기록되지 않았다. 이 페이지의 서술이 그 정본과 일치하는지 확인된 바 없으므로, 처방의 세부는 원전으로 확인할 것.'
const UNCITABLE_NOTE =
  '인용할 정본이 아예 없다. 이 항목의 서술은 인용 형태로 쓸 수 없는 자료 — 저자·연도가 없는 글이거나, 커뮤니티에서 형식화된 관행이거나, 아무도 특정할 수 없는 통념 — 에서 왔고, 따라서 이 칸은 앞으로도 채워지지 않는다. 정본이 있는 항목과 같은 무게로 읽지 말 것.'

/**
 * 출처 블록. 보여줄 것이 없어도 렌더한다.
 *
 * 예전에는 `source`가 비면 사라졌고, 그래서 기록되지 않은 행이 기록된 행과 똑같아 보였다.
 * 독자는 빠진 주장이 아니라 아무 주장도 없는 것으로 봤다. 이제 빈칸은 어떤 종류의 빈칸인지
 * 말해야 한다.
 */
export function SourceBlock(handle: Handle<{ source?: string[]; provenance?: string }>) {
  return () => {
    const { source, provenance } = handle.props
    return (
      <Block
        title="출처 (서술)"
        sub="이 항목이 무엇을 처방하는지의 기록이다. 작동한다는 증거가 아니다 — 그건 등급과 인용이 따로 답한다."
      >
        {source?.length ? (
          <ul className="cites">
            {source.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ) : (
          <p className={`note prov-empty prov-empty-${provenance}`}>
            {provenance === 'uncitable' ? UNCITABLE_NOTE : UNRECORDED_NOTE}
          </p>
        )}
      </Block>
    )
  }
}

/**
 * 날것의 intensity_model / anchor.model 코드를 호버·클릭 가능하게 만든다. 툴팁이
 * anchors.json에서 라벨 + 구성개념 + 측정에 필요한 것을 끌어오므로 `lactate_mmol` 같은
 * 슬러그가 그 자리에서 스스로를 설명한다.
 */
export function AnchorCode(handle: Handle<{ model: string }>) {
  return () => {
    const { model } = handle.props
    const a = byAnchor[model]
    if (!a) return <code>{model}</code>
    const tip = [a.label, CONSTRUCT_LABEL[a.construct], a.requires].filter(Boolean).join(' · ')
    return (
      <EntryLink className="anchor-code" to={routes.anchor.href({ model })} title={tip}>
        <code>{model}</code>
      </EntryLink>
    )
  }
}

/**
 * 호버하면 자기 차원을 설명하는 실행 조건 칩. 짧은 "9-13x/wk"는 무엇인지를 말하고,
 * 툴팁은 그것이 무슨 뜻인지를 말한다.
 */
export function InfoChip(handle: Handle<{ tip: string; children?: RemixNode }>) {
  return () => (
    <span className="chip chip-info" title={handle.props.tip}>
      {handle.props.children}
    </span>
  )
}

export function CiteList(handle: Handle<{ evidence?: { cite?: string[] } }>) {
  return () => {
    const cites = handle.props.evidence?.cite
    if (!cites?.length) return null
    return (
      <ul className="cites">
        {cites.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    )
  }
}

/**
 * 측정 계층(data/anchors.json). 각 앵커를 재려면 무엇이 필요한지, 그리고 그것이 없을 때의
 * 정직한 바닥. RPE 쪽을 가리키면서 무엇을 잃는지 명시한다. 숫자로 변환하는 일은 결코
 * 없다. 앵커는 깔끔하게 환산되지 않기 때문이다.
 */
export function MeasurementBlock(
  handle: Handle<{ models: string[]; fallbackFor?: string | null }>,
) {
  return () => {
    const { models, fallbackFor = null } = handle.props
    const uniq = [...new Set(models.filter((m) => byAnchor[m]))]
    const groups = ANCHOR_CONSTRUCTS.map((c) => ({
      c,
      items: uniq.filter((m) => byAnchor[m].construct === c.id),
    })).filter((g) => g.items.length)
    const fa = fallbackFor ? byAnchor[fallbackFor] : undefined

    return (
      <Block
        title="측정 요건"
        sub="앵커는 무엇을 읽는지(구성개념: 지각·페이스·심박·대사)로 묶인다. 같은 걸 읽어도 서로 환산되지 않고, 장비가 없으면 결국 RPE 하나로 내려온다. 장비 없이 누구나 쓸 수 있는 유일한 기준이기 때문이다 — 환산이 아니라 하강이다."
      >
        <div className="measure-groups">
          {groups.map(({ c, items }) => (
            <div className="measure-group" key={c.id}>
              <span className="measure-construct" title={c.note}>
                {c.label}
              </span>
              <ul className="measure">
                {items.map((m) => {
                  const a = byAnchor[m]
                  return (
                    <li key={m}>
                      <code>{m}</code>
                      <span className="req">{a.requires}</span>
                      {a.equipment_free ? <span className="floor-badge">장비 불필요</span> : null}
                      {a.note ? <span className="measure-note">{a.note}</span> : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
        {fa && !fa.equipment_free ? (
          <p className="note fallback-note">
            {'없으면 → '}
            {fa.fallback}
          </p>
        ) : null}
      </Block>
    )
  }
}

/**
 * 적응 분류(data/adaptations.json). 워크아웃의 평평한 target_adaptation 슬러그를 거친 생리
 * 범주로 묶고 정의를 호버에 붙인다. 서술적이다 — 워크아웃이 무엇을 표적으로 삼는지를
 * 이름 붙일 뿐, 무엇을 만들어내는지를 말하지 않는다.
 */
export function AdaptationsBlock(handle: Handle<{ ids: string[] }>) {
  return () => {
    const groups = ADAPT_CATEGORIES.map((cat) => ({
      cat,
      items: handle.props.ids
        .map((id) => byAdaptation[id])
        .filter((a) => a && a.category === cat.id),
    })).filter((g) => g.items.length)
    if (!groups.length) return null

    return (
      <Block
        title="표적 적응"
        sub="이 워크아웃이 노린다고 주장하는 생리적 적응 — 결과가 아니라 표적이다. 정의는 마우스를 올리면 나온다."
      >
        <div className="adapt-groups">
          {groups.map(({ cat, items }) => (
            <div className="adapt-group" key={cat.id}>
              <span className="adapt-cat">{cat.label}</span>
              <div className="adapt-chips">
                {items.map((a) => (
                  <span className="adapt" title={a.definition} key={a.id}>
                    {a.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Block>
    )
  }
}
