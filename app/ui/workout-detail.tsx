import { Link } from '@tanstack/react-router'

import { WorkoutChart } from './chart.tsx'
import {
  AdaptationsBlock,
  AnchorCode,
  Block,
  CiteList,
  MeasurementBlock,
  ProvenanceBadge,
  SourceBlock,
  SystemLink,
  TierBadge,
} from './primitives.tsx'
import { bySystem, byWorkout, usage } from '../data/index.ts'
import type { Usage, Workout } from '../data/types/index.d.ts'
import type { Anchor as WorkoutAnchor, Confound } from '../data/types/workout.d.ts'

/**
 * 워크아웃 엔트리. 상세 뷰다. 각 행은 반증 가능한 주장과 그것을 반증할 절차를 싣는다.
 * 개선 수치는 의도적으로 없다. README의 "하지 않을 것" 참조.
 */
export function WorkoutDetail({ workout: w }: { workout: Workout }) {
  return (
    <>
      <Link className="back" to="/workouts">
        ← 워크아웃 목록
      </Link>
      <article className="detail">
        <div className="detail-head">
          <h1>{w.canonical_name}</h1>
          <span className="badges">
            <TierBadge tier={w.claim?.evidence?.tier} dose={w.claim?.evidence?.dose_question} />
            <ProvenanceBadge provenance={w.provenance} />
          </span>
        </div>
        <div className="chips">
          {w.family ? (
            <span className="chip">
              <code>{w.family}</code>
            </span>
          ) : null}
          {w.attribution ? <span className="chip">{w.attribution}</span> : null}
          {w.safety?.injury_risk ? (
            <span className="chip">{`부상 위험: ${w.safety.injury_risk}`}</span>
          ) : null}
        </div>

        {/* 우리 데이터에서 나온 우리 SVG. app/ui/chart.tsx가 CLI와 같은 도형을 그린다 —
            그래서 시각물이 데이터에서 갈라질 수 없다. */}
        <figure className="chart">
          <WorkoutChart workout={w} byId={byWorkout} />
        </figure>

        <AdaptationsBlock ids={w.target_adaptation} />

        <Block title="지시">
          <p>{w.instructions}</p>
        </Block>

        <Block
          title="강도 지정"
          sub="앵커 하나당 강도 지정 하나. 앵커끼리는 환산되지 않으므로 지정마다 얼마나 정확한지(confidence)가 따로 붙는다. rpe_10 지정은 정확히 하나여야 한다 — 장비 없이 쓸 수 있는 유일한 축이라 모든 워크아웃의 공통 기준이 된다."
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
                    <AnchorCode model={a.model} />
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
          models={w.intensity.anchors.map((a: WorkoutAnchor) => a.model)}
          fallbackFor={w.intensity.primary_anchor}
        />

        <Block
          className="claim"
          title={
            <>
              주장{' '}
              <TierBadge tier={w.claim?.evidence?.tier} dose={w.claim?.evidence?.dose_question} />
            </>
          }
        >
          <p className="proposition">{w.claim?.proposition}</p>
          {w.claim?.mechanism ? <p>{w.claim.mechanism}</p> : null}
          <CiteList evidence={w.claim?.evidence} />
        </Block>

        <SourceBlock source={w.source} provenance={w.provenance} />

        <Block className="test" title="반증 절차">
          <FalsificationTest test={w.test} />
        </Block>

        <CollisionTable id={w.id} />

        {w.common_errors?.length > 0 ? (
          <Block className="caveats" title="흔한 실수">
            <ul>
              {w.common_errors.map((e: string, i: number) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Block>
        ) : null}
      </article>
    </>
  )
}

/**
 * 관찰 불가능한 주장은 약한 주장이 아니라 믿음이다. 관찰 불가능한 영가설이 아무것도 아닌
 * 것의 근거처럼 읽히게 두는 대신, 문구가 그렇게 말한다.
 */
function FalsificationTest({ test }: { test: Workout['test'] }) {
  if (!test.detectable) {
    return (
      <>
        <p className="detectable no">
          관찰 불가 <TierBadge tier={test.evidence?.tier} dose={test.evidence?.dose_question} />
        </p>
        {test.mechanism ? <p>{test.mechanism}</p> : null}
        <p className="belief-note">
          관찰 불가능한 null은 해석할 수 없다. 이건 믿음이다 — 주당 몇 분을 쓸지 결정하는 문제일 뿐.
        </p>
      </>
    )
  }

  const confounds = test.confounds || []
  return (
    <>
      <p className="detectable yes">관찰 가능</p>
      <div className="kv">
        <span>무엇이</span>
        <p>{test.what}</p>
      </div>
      {test.when_weeks ? (
        <div className="kv">
          <span>언제</span>
          <p>{`${test.when_weeks.min}–${test.when_weeks.max} 주`}</p>
        </div>
      ) : null}
      {test.mechanism ? (
        <div className="kv">
          <span>기전</span>
          <p>{test.mechanism}</p>
        </div>
      ) : null}
      {confounds.length > 0 ? (
        <div className="kv">
          <span>교란</span>
          <div className="confounds">
            {confounds.map((c: Confound) => (
              <div className={`confound sev-${c.severity}`} key={c.factor}>
                <div className="confound-head">
                  <code>{c.factor}</code>
                  <span className="sev">{c.severity}</span>
                  {c.shares_mechanism ? (
                    <span className="shares" title="acts through the same physiology as the claim">
                      같은 기전
                    </span>
                  ) : null}
                </div>
                {c.note ? <p>{c.note}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {test.if_absent ? (
        <div className="kv if-absent">
          <span>변화 없으면</span>
          <p>{test.if_absent}</p>
        </div>
      ) : null}
      <CiteList evidence={test.evidence} />
    </>
  )
}

/**
 * 충돌 표를 워크아웃 쪽에서 본 것. 이름은 필드가 아니라 조인이므로 통칭 하나가 여러 행을
 * 가리킬 수 있다.
 */
function CollisionTable({ id }: { id: string }) {
  const uses = usage.filter((u) => u.workout === id)
  if (!uses.length) return null

  return (
    <Block title="훈련법별 명칭 (충돌 표)">
      <table className="usage">
        <tbody>
          {uses.map((u: Usage, i: number) => {
            const sysName = u.system ? bySystem[u.system]?.name || u.system : '훈련법 밖'
            return (
              <tr className={u.collides ? 'collides' : ''} key={`${u.system ?? 'none'}-${i}`}>
                <td>
                  {u.system ? (
                    <SystemLink id={u.system}>{sysName}</SystemLink>
                  ) : (
                    <span className="nosys">{sysName}</span>
                  )}
                </td>
                <td>
                  <b>{u.calls_it}</b>
                  {u.also_known_as?.length > 0 ? (
                    <>
                      {' '}
                      <span className="aka">{`(${u.also_known_as.join(', ')})`}</span>
                    </>
                  ) : null}
                  {u.collides ? (
                    <>
                      {' '}
                      <span className="collision-flag">충돌</span>
                    </>
                  ) : null}
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
