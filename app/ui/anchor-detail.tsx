/** @jsxImportSource remix/ui */
import type { Handle } from 'remix/ui'
import { Block, Chip, EntryLink, TierBadge, WChip } from './primitives.tsx'
import {
  ANCHOR_CONSTRUCTS,
  anchors,
  bySystem,
  switchesByAnchor,
  systemsByAnchor,
  workoutsByAnchor,
} from '../data/index.ts'
import type { Anchor, System } from '../data/types/index.d.ts'
import type { AnchorSwitch, AnchorUse } from '../data/types/view.ts'
import { routes } from '../routes.ts'

/**
 * 앵커 엔트리. 이 방식으로 강도를 부르려면 무엇을 재야 하는지, 장비가 없을 때 무엇으로
 * 내려가는지, 그리고 그것을 참조하는 모든 것.
 */
export function AnchorDetail(handle: Handle<{ anchor: Anchor }>) {
  return () => {
    const a = handle.props.anchor
    const model = a.model
    const sys = systemsByAnchor[model] || []
    const wk = workoutsByAnchor[model] || []
    const switches = switchesByAnchor[model] || []
    const siblings = anchors.filter((x) => x.construct === a.construct && x.model !== model)
    const construct = ANCHOR_CONSTRUCTS.find((c) => c.id === a.construct)

    return (
      <>
        <EntryLink className="back" to={routes.anchors.href()}>
          ← 앵커 목록
        </EntryLink>
        <article className="detail">
          <div className="detail-head">
            <h1>
              <code>{a.model}</code>
            </h1>
            {a.equipment_free ? <span className="floor-badge">장비 불필요</span> : null}
          </div>
          <p className="bet big">{a.label}</p>
          <div className="chips">
            <Chip title={construct?.note}>{construct?.label}</Chip>
          </div>

          <Block title="무엇을 읽나">
            <p>{construct?.note}</p>
          </Block>

          <Block title="측정 요건">
            <p>{a.requires}</p>
          </Block>

          <Descent anchor={a} />
          <Siblings siblings={siblings} />
          <AnchoredSystems systems={sys} />
          <UsingWorkouts workouts={wk} />
          <InSwitches switches={switches} />
        </article>
      </>
    )
  }
}

/**
 * rpe_10은 `note`를 단다(왜 그것이 바닥인지). 나머지 앵커는 `fallback`을 단다(장비가
 * 없어졌을 때 무엇을 잃는지).
 */
function Descent(handle: Handle<{ anchor: Anchor }>) {
  return () => {
    const anchor = handle.props.anchor
    if (anchor.equipment_free) {
      if (!anchor.note) return null
      return (
        <Block title="왜 바닥인가">
          <p>{anchor.note}</p>
        </Block>
      )
    }
    if (!anchor.fallback) return null
    return (
      <Block className="fallback-block" title="장비가 없으면">
        <p>{anchor.fallback}</p>
      </Block>
    )
  }
}

function Siblings(handle: Handle<{ siblings: Anchor[] }>) {
  return () => {
    const siblings = handle.props.siblings
    if (!siblings.length) return null
    return (
      <Block title="같은 구성개념" sub="같은 것을 읽지만 서로 변환되지 않는다.">
        <div className="anchor-siblings">
          {siblings.map((s) => (
            <WChip key={s.model} to={routes.anchor.href({ model: s.model })}>
              {s.model}
            </WChip>
          ))}
        </div>
      </Block>
    )
  }
}

function AnchoredSystems(handle: Handle<{ systems: System[] }>) {
  return () => {
    const systems = handle.props.systems
    if (!systems.length) return null
    return (
      <Block title="이 앵커를 쓰는 훈련법">
        <div className="grid">
          {systems.map((s) => (
            <EntryLink key={s.id} className="card sys-card" to={routes.system.href({ id: s.id })}>
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
}

function UsingWorkouts(handle: Handle<{ workouts: AnchorUse[] }>) {
  return () => {
    const workouts = handle.props.workouts
    if (!workouts.length) return null
    return (
      <Block title="이 앵커를 쓰는 워크아웃">
        <div className="anchor-workouts">
          {workouts.map(({ w, primary }) => (
            <WChip key={w.id} to={routes.workout.href({ id: w.id })}>
              {w.canonical_name}
              {primary ? (
                <>
                  {' '}
                  <span className="primary-flag">주앵커</span>
                </>
              ) : null}
            </WChip>
          ))}
        </div>
      </Block>
    )
  }
}

function InSwitches(handle: Handle<{ switches: AnchorSwitch[] }>) {
  return () => {
    const switches = handle.props.switches
    if (!switches.length) return null
    return (
      <Block
        title="전환에서의 이 앵커"
        sub="이 앵커가 나가거나 들어오는 훈련법 전환. 조용함은 용어는 살아남고 뜻만 바뀌는 위험한 경우."
      >
        <div className="switch-list">
          {switches.map((x, i) => (
            <div className="switch" key={`${x.from}-${x.to}-${i}`}>
              <div className="switch-head">
                <span className="switch-from">
                  <EntryLink to={routes.system.href({ id: x.from })}>
                    {bySystem[x.from]?.name || x.from}
                  </EntryLink>
                  {' → '}
                  <EntryLink to={routes.system.href({ id: x.to })}>
                    {bySystem[x.to]?.name || x.to}
                  </EntryLink>
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
}
