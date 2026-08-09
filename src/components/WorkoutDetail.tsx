import { renderWorkout } from '../../scripts/svg.ts'
import {
  AdaptationsBlock,
  AnchorCode,
  Block,
  CiteList,
  MeasurementBlock,
  ProvenanceBadge,
  SourceBlock,
  TierBadge,
  EntryLink,
} from './primitives.tsx'
import type { Usage, Workout } from '../types/index.d.ts'
import type { Anchor as WorkoutAnchor, Confound } from '../types/workout.d.ts'
import type { WithCtx } from '../types/view.ts'

/**
 * The workout entry - the detail view. Each row carries a falsifiable claim and
 * the procedure that would falsify it. There is deliberately no
 * expected-improvement number; see the README's non-goals.
 */
export function WorkoutDetail({ ctx, id }: WithCtx & { id: string }) {
  const { byWorkout } = ctx
  const w = byWorkout[id]
  if (!w) return null

  return (
    <>
      <EntryLink className="back" to="workouts">
        ← {'워크아웃 목록'}
      </EntryLink>
      <article className="detail">
        <div className="detail-head">
          <h1>{w.canonical_name}</h1>
          <span className="badges">
            <TierBadge tier={w.claim?.evidence?.tier} />
            <ProvenanceBadge provenance={w.provenance} />
          </span>
        </div>
        <div className="chips">
          {w.family && (
            <span className="chip">
              <code>{w.family}</code>
            </span>
          )}
          {w.attribution && <span className="chip">{w.attribution}</span>}
          {w.safety?.injury_risk && (
            <span className="chip">{`${'부상 위험'}: ${w.safety.injury_risk}`}</span>
          )}
        </div>

        {/* Our own SVG, generated from `structure` by the same scripts/svg.ts the
            CLI uses - so the visual can never drift from the data. */}
        <figure
          className="chart"
          dangerouslySetInnerHTML={{ __html: renderWorkout(w, byWorkout) }}
        />

        <AdaptationsBlock ctx={ctx} ids={w.target_adaptation} />

        <Block title={'지시'}>
          <p>{w.instructions}</p>
        </Block>

        <Block
          title={'강도 앵커'}
          sub={
            '앵커는 깔끔히 변환되지 않아 각자 confidence를 갖는다. rpe_10은 정확히 하나여야 한다 — 유일한 보편 교환 축.'
          }
        >
          <table className="anchors">
            <thead>
              <tr>
                <th>model</th>
                <th>value</th>
                <th>conf.</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {w.intensity.anchors.map((a: WorkoutAnchor) => (
                <tr key={a.model}>
                  <td>
                    <AnchorCode ctx={ctx} model={a.model} />
                  </td>
                  <td>{a.range ? `${a.range[0]}–${a.range[1]}` : (a.zone ?? a.value)}</td>
                  <td>
                    <span className={`conf conf-${a.confidence}`}>{a.confidence}</span>
                  </td>
                  <td className="anchor-note">{a.note ? a.note : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>

        <MeasurementBlock
          ctx={ctx}
          models={w.intensity.anchors.map((a: WorkoutAnchor) => a.model)}
          fallbackFor={w.intensity.primary_anchor}
        />

        <Block
          className="claim"
          title={
            <>
              {'주장'} <TierBadge tier={w.claim?.evidence?.tier} />
            </>
          }
        >
          <p className="proposition">{w.claim?.proposition}</p>
          {w.claim?.mechanism && <p>{w.claim.mechanism}</p>}
          <CiteList evidence={w.claim?.evidence} />
        </Block>

        <SourceBlock source={w.source} provenance={w.provenance} />

        <Block className="test" title={'반증 절차'}>
          <FalsificationTest test={w.test} />
        </Block>

        <CollisionTable ctx={ctx} id={id} />

        {w.common_errors?.length > 0 && (
          <Block className="caveats" title={'흔한 실수'}>
            <ul>
              {w.common_errors.map((e: string, i: number) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Block>
        )}
      </article>
    </>
  )
}

/**
 * An undetectable claim is not a weaker claim - it is a belief. The copy says so
 * rather than letting an unobservable null read as evidence of nothing.
 */
function FalsificationTest({ test }: { test: Workout['test'] }) {
  if (!test.detectable) {
    return (
      <>
        <p className="detectable no">
          {'관찰 불가'} <TierBadge tier={test.evidence?.tier} />
        </p>
        {test.mechanism && <p>{test.mechanism}</p>}
        <p className="belief-note">
          {
            '관찰 불가능한 null은 해석할 수 없다. 이건 믿음이다 — 주당 몇 분을 쓸지 결정하는 문제일 뿐.'
          }
        </p>
      </>
    )
  }

  const confounds = test.confounds || []
  return (
    <>
      <p className="detectable yes">{'관찰 가능'}</p>
      <div className="kv">
        <span>{'무엇이'}</span>
        <p>{test.what}</p>
      </div>
      {test.when_weeks && (
        <div className="kv">
          <span>{'언제'}</span>
          <p>{`${test.when_weeks.min}–${test.when_weeks.max} ${'주'}`}</p>
        </div>
      )}
      {test.mechanism && (
        <div className="kv">
          <span>{'기전'}</span>
          <p>{test.mechanism}</p>
        </div>
      )}
      {confounds.length > 0 && (
        <div className="kv">
          <span>{'교란'}</span>
          <div className="confounds">
            {confounds.map((c: Confound) => (
              <div className={`confound sev-${c.severity}`} key={c.factor}>
                <div className="confound-head">
                  <code>{c.factor}</code>
                  <span className="sev">{c.severity}</span>
                  {c.shares_mechanism && (
                    <span className="shares" title="acts through the same physiology as the claim">
                      {'같은 기전'}
                    </span>
                  )}
                </div>
                {c.note && <p>{c.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {test.if_absent && (
        <div className="kv if-absent">
          <span>{'변화 없으면'}</span>
          <p>{test.if_absent}</p>
        </div>
      )}
      <CiteList evidence={test.evidence} />
    </>
  )
}

/**
 * The collision table, from the workout's side: naming is a join, not a field,
 * so one colloquial term can point at several rows.
 */
function CollisionTable({ ctx, id }: WithCtx & { id: string }) {
  const { bySystem, usage } = ctx
  const uses = usage.filter((u) => u.workout === id)
  if (!uses.length) return null

  return (
    <Block title={'훈련법별 명칭 (충돌 표)'}>
      <table className="usage">
        <tbody>
          {uses.map((u: Usage, i: number) => {
            const sysName = u.system ? bySystem[u.system]?.name || u.system : '훈련법 밖'
            return (
              <tr className={u.collides ? 'collides' : ''} key={`${u.system ?? 'none'}-${i}`}>
                <td>
                  {u.system ? (
                    <EntryLink to={`system/${u.system}`}>{sysName}</EntryLink>
                  ) : (
                    <span className="nosys">{sysName}</span>
                  )}
                </td>
                <td>
                  <b>{u.calls_it}</b>
                  {u.also_known_as?.length > 0 && (
                    <>
                      {' '}
                      <span className="aka">{`(${u.also_known_as.join(', ')})`}</span>
                    </>
                  )}
                  {u.collides && (
                    <>
                      {' '}
                      <span className="collision-flag">{'충돌'}</span>
                    </>
                  )}
                </td>
                <td className="usage-note">{u.note ? u.note : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Block>
  )
}
