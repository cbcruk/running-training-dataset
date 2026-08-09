import {
  AnchorCode,
  Block,
  CiteList,
  EntryLink,
  InfoChip,
  MeasurementBlock,
  ProvenanceBadge,
  SourceBlock,
  TierBadge,
  WChip,
} from './primitives.tsx'
import type { System } from '../types/index.d.ts'
import type { Distribution, Phase, SwitchingCost, VolumeCap } from '../types/system.d.ts'
import type { WithCtx } from '../types/view.ts'

/**
 * The system entry - the browsing unit. Leads with the bet and the evidence
 * tier, because the README's one hard UI rule is that browsing ten systems must
 * never make a `tradition` system look as settled as a `consensus` one.
 */
export function SystemDetail({ ctx, id }: WithCtx & { id: string }) {
  const { bySystem, fmt } = ctx
  const s = bySystem[id]
  if (!s) return null
  const c = s.commitment || {}

  return (
    <>
      <EntryLink className="back" to="">
        ← {'체계 목록'}
      </EntryLink>
      <article className="detail">
        <div className="detail-head">
          <div>
            <h1>{s.name}</h1>
            <p className="attribution">
              {s.attribution ? `${s.attribution} · ` : ''}
              <AnchorCode ctx={ctx} model={s.intensity_model} />
            </p>
          </div>
          <span className="badges">
            <TierBadge tier={s.evidence?.tier} />
            <ProvenanceBadge provenance={s.provenance} />
          </span>
        </div>
        <p className="bet big">{s.bet}</p>

        {s.claim?.proposition && (
          <Block
            className="claim"
            title={
              <>
                {'주장'} <TierBadge tier={s.evidence?.tier} />
              </>
            }
          >
            <p className="proposition">{s.claim.proposition}</p>
            {s.claim.mechanism && <p>{s.claim.mechanism}</p>}
            <CiteList evidence={s.evidence} />
          </Block>
        )}

        <SourceBlock source={s.source} provenance={s.provenance} />

        <Block title={'철학'}>
          <p>{s.philosophy}</p>
        </Block>

        <Block title={'실행 조건'}>
          <div className="chips">
            {fmt.sessions(c.sessions_per_week) && (
              <InfoChip tip={ctx.commitTips.sessions}>
                {`${fmt.sessions(c.sessions_per_week)}/wk`}
              </InfoChip>
            )}
            {c.min_weekly_km && (
              <InfoChip tip={ctx.commitTips.volume}>{`≥ ${fmt.km(c.min_weekly_km)}`}</InfoChip>
            )}
            {fmt.weeks(c.plan_length_weeks) && (
              <InfoChip tip={ctx.commitTips.weeks}>{fmt.weeks(c.plan_length_weeks)}</InfoChip>
            )}
            {c.requires_track != null && (
              <InfoChip tip={ctx.commitTips.track}>
                {c.requires_track ? '트랙 필요' : '트랙 불필요'}
              </InfoChip>
            )}
          </div>
          {c.note && <p className="note">{c.note}</p>}
        </Block>

        <MeasurementBlock ctx={ctx} models={[s.intensity_model]} fallbackFor={s.intensity_model} />

        <SwitchingCost ctx={ctx} system={s} />
        <Distribution distribution={s.distribution} />
        <Phases ctx={ctx} phases={s.phases} />
        <VolumeCaps caps={s.volume_caps} />
        <Caveats caveats={s.caveats} />
      </article>
    </>
  )
}

/**
 * `silent` marks the dangerous case: a term survives the switch while its meaning
 * changes. `anchor_change` is derived from intensity_model, so it is machine-verified.
 */
function SwitchingCost({ ctx, system }: WithCtx & { system: System }) {
  const { bySystem } = ctx
  const entries = system.switching_cost || []
  if (!entries.length) return null
  return (
    <Block
      title={'전환 비용'}
      sub={
        '다른 체계에서 넘어올 때 강도 앵커가 조용히 바뀐다. anchor_change는 intensity_model에서 유도돼 기계 검증된다.'
      }
    >
      {entries.map((x: SwitchingCost, i: number) => (
        <div className="switch" key={`${x.from}-${i}`}>
          <div className="switch-head">
            <span className="switch-from">
              {'전환 출발'}:{' '}
              <EntryLink to={`system/${x.from}`}>{bySystem[x.from]?.name || x.from}</EntryLink>
            </span>
            <span className={`switch-flag ${x.silent ? 'silent' : 'loud'}`}>
              {x.silent ? '조용함' : '드러남'}
            </span>
          </div>
          <code className="anchor">{x.anchor_change}</code>
          <p>{x.note}</p>
        </div>
      ))}
    </Block>
  )
}

function Distribution({ distribution }: { distribution?: Distribution }) {
  if (!distribution) return null
  return (
    <Block title={'강도 분포'}>
      <p>
        <code>{distribution.model}</code> <TierBadge tier={distribution.evidence?.tier} />
      </p>
      {distribution.zones && (
        <ul className="zones">
          {distribution.zones.map((z: { label: string; pct_sessions: number }) => (
            <li key={z.label}>
              <span>{z.label}</span>
              <b>{z.pct_sessions}%</b>
            </li>
          ))}
        </ul>
      )}
    </Block>
  )
}

function Phases({ ctx, phases }: WithCtx & { phases?: Phase[] }) {
  const { byWorkout } = ctx
  if (!phases?.length) return null
  return (
    <Block title={'주기별 강조 워크아웃'}>
      <div className="phases">
        {phases.map((p: Phase) => (
          <div className="phase" key={p.name}>
            <span className="phase-name">{p.name}</span>
            <div className="wchips">
              {(p.emphasis || []).map((wid: string) => (
                <WChip key={wid} to={`workout/${wid}`}>
                  {byWorkout[wid]?.canonical_name || wid}
                </WChip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Block>
  )
}

function VolumeCaps({ caps }: { caps?: VolumeCap[] }) {
  if (!caps?.length) return null
  return (
    <Block title={'볼륨 캡'}>
      <table className="caps">
        <thead>
          <tr>
            <th>zone</th>
            <th>{'규칙'}</th>
            <th>tier</th>
          </tr>
        </thead>
        <tbody>
          {caps.map((v: VolumeCap) => (
            <tr key={v.zone}>
              <td>
                <code>{v.zone}</code>
              </td>
              <td>{v.rule}</td>
              <td>
                <TierBadge tier={v.evidence?.tier} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Block>
  )
}

function Caveats({ caveats }: { caveats?: string[] }) {
  if (!caveats?.length) return null
  return (
    <Block className="caveats" title={'주의'}>
      <ul>
        {caveats.map((c, i: number) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </Block>
  )
}
