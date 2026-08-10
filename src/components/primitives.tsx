/**
 * 공유 프리미티브. 템플릿 리터럴 뷰가 호출부마다 직접 펼쳐 쓰던 반복 형태들이다 —
 * 대문자 h3와 선택적 부제를 가진 `<section className="block">`이 열두 번쯤 나왔다.
 */
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { WithCtx } from '../types/view.ts'

interface BlockProps {
  title: ReactNode
  sub?: ReactNode
  className?: string
  children?: ReactNode
}
export function Block({ title, sub, className: cls, children }: BlockProps) {
  return (
    <section className={cls ? `block ${cls}` : 'block'}>
      <h3>{title}</h3>
      {sub && <p className="sub">{sub}</p>}
      {children}
    </section>
  )
}

interface ChipProps {
  title?: string
  className?: string
  children?: ReactNode
}
export function Chip({ title, className: cls, children }: ChipProps) {
  return (
    <span className={cls ? `chip ${cls}` : 'chip'} title={title}>
      {children}
    </span>
  )
}

/**
 * 내부 링크.
 *
 * 컴포넌트와 라우터 사이의 유일한 어댑터. 뷰가 이미 쓰는 base 상대 경로(`anchor/rpe_10`)를
 * 그대로 받아 TanStack의 Link에 넘긴다. 내비게이션과 basepath는 그쪽이 소유한다. 이것이
 * 없으면 컴포넌트는 평범한 앵커를 렌더하고 클릭마다 전체 페이지가 다시 로드된다 —
 * ADR 0001의 "쓰기 위한 앱" 절반을 잃는 것이다.
 */
export function EntryLink({
  to,
  className,
  title,
  children,
}: {
  to: string
  className?: string
  title?: string
  children?: ReactNode
}) {
  return (
    <Link to={`/${to}`} className={className} title={title}>
      {children}
    </Link>
  )
}

export function WChip({ to, children }: { to: string; children?: ReactNode }) {
  return (
    <EntryLink className="wchip" to={to}>
      {children}
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

export function TierBadge({ tier }: { tier?: string }) {
  if (!tier) return null
  const label = TIER_LABEL[tier] || tier
  return (
    <span className={`tier tier-${tier}`} title={`evidence tier: ${tier}`}>
      {label}
    </span>
  )
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

export function ProvenanceBadge({ provenance }: { provenance?: string }) {
  if (!provenance) return null
  const p = PROVENANCE[provenance]
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
export function SourceBlock({ source, provenance }: { source?: string[]; provenance?: string }) {
  return (
    <Block
      title={'출처 (서술)'}
      sub={
        '이 항목이 무엇을 처방하는지의 기록이다. 작동한다는 증거가 아니다 — 그건 등급과 인용이 따로 답한다.'
      }
    >
      {source?.length ? (
        <ul className="cites">
          {source.map((c: string) => (
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

/**
 * 날것의 intensity_model / anchor.model 코드를 호버·클릭 가능하게 만든다. 툴팁이
 * anchors.json에서 라벨 + 구성개념 + 측정에 필요한 것을 끌어오므로 `lactate_mmol` 같은
 * 슬러그가 그 자리에서 스스로를 설명한다.
 */
export function AnchorCode({ ctx, model }: WithCtx & { model: string }) {
  const { byAnchor, constructLabel } = ctx
  const a = byAnchor[model]
  if (!a) return <code>{model}</code>
  const tip = [a.label, constructLabel[a.construct], a.requires].filter(Boolean).join(' · ')
  return (
    <EntryLink className="anchor-code" to={`anchor/${model}`} title={tip}>
      <code>{model}</code>
    </EntryLink>
  )
}

/**
 * 호버하면 자기 차원을 설명하는 실행 조건 칩. 짧은 "9-13x/wk"는 무엇인지를 말하고,
 * 툴팁은 그것이 무슨 뜻인지를 말한다.
 */
export function InfoChip({ tip, children }: { tip: string; children?: ReactNode }) {
  return (
    <span className="chip chip-info" title={tip}>
      {children}
    </span>
  )
}

export function CiteList({ evidence }: { evidence?: { cite?: string[] } }) {
  if (!evidence?.cite?.length) return null
  return (
    <ul className="cites">
      {evidence.cite.map((c) => (
        <li key={c}>{c}</li>
      ))}
    </ul>
  )
}

/**
 * 측정 계층(data/anchors.json). 각 앵커를 재려면 무엇이 필요한지, 그리고 그것이 없을 때의
 * 정직한 바닥. RPE 쪽을 가리키면서 무엇을 잃는지 명시한다. 숫자로 변환하는 일은 결코
 * 없다. 앵커는 깔끔하게 환산되지 않기 때문이다.
 */
export function MeasurementBlock({
  ctx,
  models,
  fallbackFor = null,
}: WithCtx & { models: string[]; fallbackFor?: string | null }) {
  const { byAnchor, constructs } = ctx
  const uniq = [...new Set(models.filter((m) => byAnchor[m]))]
  const groups = constructs
    .map((c) => ({ c, items: uniq.filter((m) => byAnchor[m].construct === c.id) }))
    .filter((g) => g.items.length)
  const fa = fallbackFor && byAnchor[fallbackFor]

  return (
    <Block
      title={'측정 요건'}
      sub={
        '앵커는 무엇을 읽는지(구성개념: 지각·페이스·심박·대사)로 묶인다. 같은 걸 읽어도 서로 환산되지 않고, 장비가 없으면 결국 RPE 하나로 내려온다. 장비 없이 누구나 쓸 수 있는 유일한 기준이기 때문이다 — 환산이 아니라 하강이다.'
      }
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
                    {a.equipment_free && <span className="floor-badge">{'장비 불필요'}</span>}
                    {a.note && <span className="measure-note">{a.note}</span>}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      {fa && !fa.equipment_free && (
        <p className="note fallback-note">
          {'없으면 → '}
          {fa.fallback}
        </p>
      )}
    </Block>
  )
}

/**
 * 적응 분류(data/adaptations.json). 워크아웃의 평평한 target_adaptation 슬러그를 거친 생리
 * 범주로 묶고 정의를 호버에 붙인다. 서술적이다 — 워크아웃이 무엇을 표적으로 삼는지를
 * 이름 붙일 뿐, 무엇을 만들어내는지를 말하지 않는다.
 */
export function AdaptationsBlock({ ctx, ids }: WithCtx & { ids: string[] }) {
  const { byAdaptation, adaptCategories } = ctx
  const groups = adaptCategories
    .map((cat) => ({
      cat,
      items: ids.map((id) => byAdaptation[id]).filter((a) => a && a.category === cat.id),
    }))
    .filter((g) => g.items.length)
  if (!groups.length) return null

  return (
    <Block
      title={'표적 적응'}
      sub={
        '이 워크아웃이 노린다고 주장하는 생리적 적응 — 결과가 아니라 표적이다. 정의는 마우스를 올리면 나온다.'
      }
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
