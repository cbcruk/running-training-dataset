/**
 * The workout entry - the detail view. Each row carries a falsifiable claim and
 * the procedure that would falsify it. There is deliberately no
 * expected-improvement number; see the README's non-goals.
 */
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
import type { Translatable, WithCtx } from '../types/view.ts'

export function WorkoutDetail({ ctx, id }: WithCtx & { id: string }) {
  const { t, lang, byWorkout } = ctx
  const w = byWorkout[id]
  if (!w) return null

  return (
    <>
      <EntryLink className="back" to="workouts">
        ← {lang === 'ko' ? '워크아웃 목록' : 'workouts'}
      </EntryLink>
      <article className="detail">
        <div className="detail-head">
          <h1>{w.canonical_name}</h1>
          <span className="badges">
            <TierBadge ctx={ctx} tier={w.claim?.evidence?.tier} />
            <ProvenanceBadge ctx={ctx} provenance={w.provenance} />
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
            <span className="chip">{`${lang === 'ko' ? '부상 위험' : 'injury'}: ${
              w.safety.injury_risk
            }`}</span>
          )}
        </div>

        {/* Our own SVG, generated from `structure` by the same scripts/svg.ts the
            CLI uses - so the visual can never drift from the data. */}
        <figure
          className="chart"
          dangerouslySetInnerHTML={{ __html: renderWorkout(w, byWorkout) }}
        />

        <AdaptationsBlock ctx={ctx} ids={w.target_adaptation} />

        <Block title={lang === 'ko' ? '지시' : 'Instructions'}>
          <p>{t(w.instructions)}</p>
        </Block>

        <Block
          title={lang === 'ko' ? '강도 앵커' : 'Intensity anchors'}
          sub={
            lang === 'ko'
              ? '앵커는 깔끔히 변환되지 않아 각자 confidence를 갖는다. rpe_10은 정확히 하나여야 한다 — 유일한 보편 교환 축.'
              : 'Anchors do not convert cleanly, so each carries its own confidence. Exactly one must be rpe_10 — the only universal exchange axis.'
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
                  <td className="anchor-note">{a.note ? t(a.note) : ''}</td>
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
              {lang === 'ko' ? '주장' : 'Claim'}{' '}
              <TierBadge ctx={ctx} tier={w.claim?.evidence?.tier} />
            </>
          }
        >
          <p className="proposition">{t(w.claim?.proposition)}</p>
          {w.claim?.mechanism && <p>{t(w.claim.mechanism)}</p>}
          <CiteList evidence={w.claim?.evidence} />
        </Block>

        <SourceBlock ctx={ctx} source={w.source} provenance={w.provenance} />

        <Block className="test" title={lang === 'ko' ? '반증 절차' : 'Falsification test'}>
          <FalsificationTest ctx={ctx} test={w.test} />
        </Block>

        <CollisionTable ctx={ctx} id={id} />

        {w.common_errors?.length > 0 && (
          <Block className="caveats" title={lang === 'ko' ? '흔한 실수' : 'Common errors'}>
            <ul>
              {w.common_errors.map((e: Translatable, i: number) => (
                <li key={i}>{t(e)}</li>
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
function FalsificationTest({ ctx, test }: WithCtx & { test: Workout['test'] }) {
  const { t, lang } = ctx

  if (!test.detectable) {
    return (
      <>
        <p className="detectable no">
          {lang === 'ko' ? '관찰 불가' : 'not detectable'}{' '}
          <TierBadge ctx={ctx} tier={test.evidence?.tier} />
        </p>
        {test.mechanism && <p>{t(test.mechanism)}</p>}
        <p className="belief-note">
          {lang === 'ko'
            ? '관찰 불가능한 null은 해석할 수 없다. 이건 믿음이다 — 주당 몇 분을 쓸지 결정하는 문제일 뿐.'
            : 'An unobservable null cannot be interpreted. This is a belief — the only question is how many weekly minutes to spend on it.'}
        </p>
      </>
    )
  }

  const confounds = test.confounds || []
  return (
    <>
      <p className="detectable yes">{lang === 'ko' ? '관찰 가능' : 'detectable'}</p>
      <div className="kv">
        <span>{lang === 'ko' ? '무엇이' : 'what'}</span>
        <p>{t(test.what)}</p>
      </div>
      {test.when_weeks && (
        <div className="kv">
          <span>{lang === 'ko' ? '언제' : 'when'}</span>
          <p>{`${test.when_weeks.min}–${test.when_weeks.max} ${lang === 'ko' ? '주' : 'weeks'}`}</p>
        </div>
      )}
      {test.mechanism && (
        <div className="kv">
          <span>{lang === 'ko' ? '기전' : 'mechanism'}</span>
          <p>{t(test.mechanism)}</p>
        </div>
      )}
      {confounds.length > 0 && (
        <div className="kv">
          <span>{lang === 'ko' ? '교란' : 'confounds'}</span>
          <div className="confounds">
            {confounds.map((c: Confound) => (
              <div className={`confound sev-${c.severity}`} key={c.factor}>
                <div className="confound-head">
                  <code>{c.factor}</code>
                  <span className="sev">{c.severity}</span>
                  {c.shares_mechanism && (
                    <span className="shares" title="acts through the same physiology as the claim">
                      {lang === 'ko' ? '같은 기전' : 'shares mechanism'}
                    </span>
                  )}
                </div>
                {c.note && <p>{t(c.note)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {test.if_absent && (
        <div className="kv if-absent">
          <span>{lang === 'ko' ? '변화 없으면' : 'if absent'}</span>
          <p>{t(test.if_absent)}</p>
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
  const { t, lang, bySystem, usage } = ctx
  const uses = usage.filter((u) => u.workout === id)
  if (!uses.length) return null

  return (
    <Block
      title={lang === 'ko' ? '체계별 명칭 (충돌 표)' : 'What systems call it (collision table)'}
    >
      <table className="usage">
        <tbody>
          {uses.map((u: Usage, i: number) => {
            const sysName = u.system
              ? bySystem[u.system]?.name || u.system
              : lang === 'ko'
                ? '체계 밖'
                : 'no system'
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
                      <span className="collision-flag">{lang === 'ko' ? '충돌' : 'collision'}</span>
                    </>
                  )}
                </td>
                <td className="usage-note">{u.note ? t(u.note) : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Block>
  )
}
