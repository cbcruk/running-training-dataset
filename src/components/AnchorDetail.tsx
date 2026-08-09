import { Block, Chip, EntryLink, TierBadge, WChip } from './primitives.tsx'
import type { Anchor, System } from '../types/index.d.ts'
import type { AnchorSwitch, AnchorUse, WithCtx } from '../types/view.ts'

/**
 * The anchor entry: what this way of naming an intensity takes to measure, what
 * it degrades to without the equipment, and everything that references it.
 *
 * This was the spike that settled the component model - ADR 0002 records the
 * comparison. ADR 0001's constraint is the one that still binds every day: it
 * renders to a string in Node via react-dom/server, so the prerenderer and the
 * browser produce the same markup from one source.
 */
export function AnchorDetail({ ctx, model }: WithCtx & { model: string }) {
  const { byAnchor, anchors, bySystem, constructs, indexes } = ctx
  const a = byAnchor[model]
  if (!a) return null

  const sys = indexes.systemsByAnchor[model] || []
  const wk = indexes.workoutsByAnchor[model] || []
  const switches = indexes.switchesByAnchor[model] || []
  const siblings = anchors.filter((x) => x.construct === a.construct && x.model !== model)
  const construct = constructs.find((c) => c.id === a.construct)

  return (
    <>
      <EntryLink className="back" to="anchors">
        ← {'앵커 목록'}
      </EntryLink>
      <article className="detail">
        <div className="detail-head">
          <h1>
            <code>{a.model}</code>
          </h1>
          {a.equipment_free && <span className="floor-badge">{'장비 불필요'}</span>}
        </div>
        <p className="bet big">{a.label}</p>
        <div className="chips">
          <Chip title={construct?.note}>{construct?.label}</Chip>
        </div>

        <Block title={'무엇을 읽나'}>
          <p>{construct?.note}</p>
        </Block>

        <Block title={'측정 요건'}>
          <p>{a.requires}</p>
        </Block>

        <Descent anchor={a} />
        <Siblings siblings={siblings} />
        <AnchoredSystems systems={sys} />
        <UsingWorkouts workouts={wk} />
        <InSwitches switches={switches} bySystem={bySystem} />
      </article>
    </>
  )
}

/**
 * rpe_10 carries `note` (why it is the floor); every other anchor carries
 * `fallback` (what you lose when the equipment is gone).
 */
function Descent({ anchor }: { anchor: Anchor }) {
  if (anchor.equipment_free) {
    if (!anchor.note) return null
    return (
      <Block title={'왜 바닥인가'}>
        <p>{anchor.note}</p>
      </Block>
    )
  }
  if (!anchor.fallback) return null
  return (
    <Block className="fallback-block" title={'장비가 없으면'}>
      <p>{anchor.fallback}</p>
    </Block>
  )
}

function Siblings({ siblings }: { siblings: Anchor[] }) {
  if (!siblings.length) return null
  return (
    <Block title={'같은 구성개념'} sub={'같은 것을 읽지만 서로 변환되지 않는다.'}>
      <div className="anchor-siblings">
        {siblings.map((s) => (
          <WChip key={s.model} to={`anchor/${s.model}`}>
            {s.model}
          </WChip>
        ))}
      </div>
    </Block>
  )
}

function AnchoredSystems({ systems }: { systems: System[] }) {
  if (!systems.length) return null
  return (
    <Block title={'이 앵커를 쓰는 훈련법'}>
      <div className="grid">
        {systems.map((s) => (
          <EntryLink key={s.id} className="card sys-card" to={`system/${s.id}`}>
            <div className="card-head">
              <h2>{s.name}</h2>
              <TierBadge tier={s.evidence?.tier} />
            </div>
            <p className="bet">{s.bet}</p>
          </EntryLink>
        ))}
      </div>
    </Block>
  )
}

function UsingWorkouts({ workouts }: { workouts: AnchorUse[] }) {
  if (!workouts.length) return null
  return (
    <Block title={'이 앵커를 쓰는 워크아웃'}>
      <div className="anchor-workouts">
        {workouts.map(({ w, primary }) => (
          <WChip key={w.id} to={`workout/${w.id}`}>
            {w.canonical_name}
            {primary && (
              <>
                {' '}
                <span className="primary-flag">{'주앵커'}</span>
              </>
            )}
          </WChip>
        ))}
      </div>
    </Block>
  )
}

function InSwitches({
  switches,
  bySystem,
}: {
  switches: AnchorSwitch[]
  bySystem: Record<string, System>
}) {
  if (!switches.length) return null
  return (
    <Block
      title={'전환에서의 이 앵커'}
      sub={
        '이 앵커가 나가거나 들어오는 훈련법 전환. 조용함은 용어는 살아남고 뜻만 바뀌는 위험한 경우.'
      }
    >
      <div className="switch-list">
        {switches.map((x, i) => (
          <div className="switch" key={`${x.from}-${x.to}-${i}`}>
            <div className="switch-head">
              <span className="switch-from">
                <EntryLink to={`system/${x.from}`}>{bySystem[x.from]?.name || x.from}</EntryLink> →{' '}
                <EntryLink to={`system/${x.to}`}>{bySystem[x.to]?.name || x.to}</EntryLink>
              </span>
              <span className={`switch-flag ${x.side === 'in' ? 'in' : 'out'}`}>
                {x.side === 'in' ? '유입' : '유출'}
              </span>
              <span className={`switch-flag ${x.silent ? 'silent' : 'loud'}`}>
                {x.silent ? '조용함' : '드러남'}
              </span>
            </div>
            <p>{x.note}</p>
          </div>
        ))}
      </div>
    </Block>
  )
}
