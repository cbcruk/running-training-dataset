/**
 * Shared primitives. These are the repeated shapes the template-literal views
 * open-coded at every call site - a `<section className="block">` with an
 * uppercase h3 and an optional sub-line appeared a dozen times.
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
 * An internal link.
 *
 * The one adapter between the components and the router: it takes the same
 * base-relative path the views already speak (`anchor/rpe_10`) and hands it to
 * TanStack's Link, which owns navigation and the basepath. Without this the
 * components would render plain anchors and every click would be a full page
 * load - the "app for use" half of ADR 0001, lost.
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
 * Tier is deliberately given distinct visual weight: consensus reads as settled,
 * tradition reads as unproven. Flattening these is the failure the README bans -
 * which is also why this stays bespoke rather than becoming a design-system
 * status badge (ADR 0002): the tiers are not success/warning/danger.
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
 * Provenance answers a different question from the tier, and the two must never
 * read as one scale. The tier says how well established it is that a system
 * works; this says whether we have any record of what it prescribes in the first
 * place. So it shares no colour with the tiers and leads with a mark instead of a
 * verdict word: a reader scanning the list should see two independent facts, not
 * one stronger or weaker rating.
 *
 * It exists because absence was invisible. Most rows carry no `source`, and a
 * blank read as "fine" - which made the well-documented rows and the undocumented
 * ones look identical at exactly the moment a reader is deciding how much to trust
 * one. Workouts carry the same pair as systems and say it the same way: the whole
 * point is that a reader never has to know which kind of entity they are on.
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
 * The provenance block, rendered even with nothing to show.
 *
 * It used to disappear when `source` was empty, which is how an unrecorded row
 * came to look identical to a recorded one: the reader saw no claim rather than a
 * missing one. An empty slot now has to say which kind of empty it is.
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
 * A raw intensity_model / anchor.model code, made hoverable and clickable: the
 * tooltip pulls label + construct + what-it-takes-to-measure from anchors.json so
 * a slug like "lactate_mmol" explains itself in place.
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
 * A commitment chip that explains its dimension on hover - the terse "9-13x/wk"
 * says what, the tooltip says what it means.
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
 * The measurement layer (data/anchors.json): what each anchor takes to measure,
 * and the honest floor when you cannot. It points down to RPE and names what is
 * lost - never a numeric conversion, because anchors do not convert cleanly.
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
        '앵커는 읽는 구성개념(지각·페이스·심박·대사)으로 묶인다. 같은 구성개념이라도 서로 변환되지 않으며, 장비가 없으면 결국 장비 없이 누구나 쓸 수 있는 유일한 기준인 RPE로 떨어진다 — 변환이 아니라 하강이다.'
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
 * The adaptation taxonomy (data/adaptations.json): group a workout's flat
 * target_adaptation slugs under their coarse physiological category, with the
 * definition on hover. Descriptive - it names what the workout targets, not what
 * it produces.
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
        '이 워크아웃이 노린다고 주장하는 생리적 적응 — 결과가 아니라 표적이다. 정의는 마우스를 올려서.'
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
