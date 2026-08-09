// The system entry - the browsing unit. Leads with the bet and the evidence
// tier, because the README's one hard UI rule is that browsing ten systems must
// never make a `tradition` system look as settled as a `consensus` one.
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
import type { Translatable, WithCtx } from '../types/view.ts'

export function SystemDetail({ ctx, id }: WithCtx & { id: string }) {
  const { t, lang, bySystem, fmt } = ctx
  const s = bySystem[id]
  if (!s) return null
  const c = s.commitment || {}

  return (
    <>
      <EntryLink className="back" to="">
        ← {lang === 'ko' ? '체계 목록' : 'systems'}
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
            <TierBadge ctx={ctx} tier={s.evidence?.tier} />
            <ProvenanceBadge ctx={ctx} provenance={s.provenance} />
          </span>
        </div>
        <p className="bet big">{t(s.bet)}</p>

        {s.claim?.proposition && (
          <Block
            className="claim"
            title={
              <>
                {lang === 'ko' ? '주장' : 'Claim'} <TierBadge ctx={ctx} tier={s.evidence?.tier} />
              </>
            }
          >
            <p className="proposition">{t(s.claim.proposition)}</p>
            {s.claim.mechanism && <p>{t(s.claim.mechanism)}</p>}
            <CiteList evidence={s.evidence} />
          </Block>
        )}

        <SourceBlock ctx={ctx} source={s.source} provenance={s.provenance} />

        <Block title={lang === 'ko' ? '철학' : 'Philosophy'}>
          <p>{t(s.philosophy)}</p>
        </Block>

        <Block title={lang === 'ko' ? '실행 조건' : 'Commitment'}>
          <div className="chips">
            {fmt.sessions(c.sessions_per_week) && (
              <InfoChip ctx={ctx} tip={ctx.commitTips.sessions}>
                {`${fmt.sessions(c.sessions_per_week)}/wk`}
              </InfoChip>
            )}
            {c.min_weekly_km && (
              <InfoChip ctx={ctx} tip={ctx.commitTips.volume}>{`≥ ${fmt.km(
                c.min_weekly_km,
              )}`}</InfoChip>
            )}
            {fmt.weeks(c.plan_length_weeks) && (
              <InfoChip ctx={ctx} tip={ctx.commitTips.weeks}>
                {fmt.weeks(c.plan_length_weeks)}
              </InfoChip>
            )}
            {c.requires_track != null && (
              <InfoChip ctx={ctx} tip={ctx.commitTips.track}>
                {c.requires_track
                  ? lang === 'ko'
                    ? '트랙 필요'
                    : 'track'
                  : lang === 'ko'
                    ? '트랙 불필요'
                    : 'no track'}
              </InfoChip>
            )}
          </div>
          {c.note && <p className="note">{t(c.note)}</p>}
        </Block>

        <MeasurementBlock ctx={ctx} models={[s.intensity_model]} fallbackFor={s.intensity_model} />

        <SwitchingCost ctx={ctx} system={s} />
        <Distribution ctx={ctx} distribution={s.distribution} />
        <Phases ctx={ctx} phases={s.phases} />
        <VolumeCaps ctx={ctx} caps={s.volume_caps} />
        <Caveats ctx={ctx} caveats={s.caveats} />
      </article>
    </>
  )
}

// `silent` marks the dangerous case: a term survives the switch while its meaning
// changes. `anchor_change` is derived from intensity_model, so it is machine-verified.
function SwitchingCost({ ctx, system }: WithCtx & { system: System }) {
  const { t, lang, bySystem } = ctx
  const entries = system.switching_cost || []
  if (!entries.length) return null
  return (
    <Block
      title={lang === 'ko' ? '전환 비용' : 'Switching cost'}
      sub={
        lang === 'ko'
          ? '다른 체계에서 넘어올 때 강도 앵커가 조용히 바뀐다. anchor_change는 intensity_model에서 유도돼 기계 검증된다.'
          : 'Switching silently swaps your intensity anchor. anchor_change is derived from intensity_model, so it is machine-verified.'
      }
    >
      {entries.map((x: SwitchingCost, i: number) => (
        <div className="switch" key={`${x.from}-${i}`}>
          <div className="switch-head">
            <span className="switch-from">
              {lang === 'ko' ? '전환 출발' : 'coming from'}:{' '}
              <EntryLink to={`system/${x.from}`}>{bySystem[x.from]?.name || x.from}</EntryLink>
            </span>
            <span className={`switch-flag ${x.silent ? 'silent' : 'loud'}`}>
              {x.silent
                ? lang === 'ko'
                  ? '조용함'
                  : 'silent'
                : lang === 'ko'
                  ? '드러남'
                  : 'overt'}
            </span>
          </div>
          <code className="anchor">{x.anchor_change}</code>
          <p>{t(x.note)}</p>
        </div>
      ))}
    </Block>
  )
}

function Distribution({ ctx, distribution }: WithCtx & { distribution?: Distribution }) {
  const { lang } = ctx
  if (!distribution) return null
  return (
    <Block title={lang === 'ko' ? '강도 분포' : 'Distribution'}>
      <p>
        <code>{distribution.model}</code> <TierBadge ctx={ctx} tier={distribution.evidence?.tier} />
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
  const { lang, byWorkout } = ctx
  if (!phases?.length) return null
  return (
    <Block title={lang === 'ko' ? '주기별 강조 워크아웃' : 'Phase emphasis'}>
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

function VolumeCaps({ ctx, caps }: WithCtx & { caps?: VolumeCap[] }) {
  const { t, lang } = ctx
  if (!caps?.length) return null
  return (
    <Block title={lang === 'ko' ? '볼륨 캡' : 'Volume caps'}>
      <table className="caps">
        <thead>
          <tr>
            <th>zone</th>
            <th>{lang === 'ko' ? '규칙' : 'rule'}</th>
            <th>tier</th>
          </tr>
        </thead>
        <tbody>
          {caps.map((v: VolumeCap) => (
            <tr key={v.zone}>
              <td>
                <code>{v.zone}</code>
              </td>
              <td>{t(v.rule)}</td>
              <td>
                <TierBadge ctx={ctx} tier={v.evidence?.tier} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Block>
  )
}

function Caveats({ ctx, caveats }: WithCtx & { caveats?: Translatable[] }) {
  const { t, lang } = ctx
  if (!caveats?.length) return null
  return (
    <Block className="caveats" title={lang === 'ko' ? '주의' : 'Caveats'}>
      <ul>
        {caveats.map((c, i: number) => (
          <li key={i}>{t(c)}</li>
        ))}
      </ul>
    </Block>
  )
}
