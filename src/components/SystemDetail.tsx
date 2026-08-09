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
 * 훈련법 엔트리. 브라우징 단위다. bet과 근거 등급을 앞세우는 이유는, 훈련법 열 개를
 * 훑어도 `tradition`이 `consensus`만큼 정착된 것으로 보여서는 안 된다는 것이 README의
 * 유일한 강한 UI 규칙이기 때문이다.
 */
export function SystemDetail({ ctx, id }: WithCtx & { id: string }) {
  const { bySystem, fmt } = ctx
  const s = bySystem[id]
  if (!s) return null
  const c = s.commitment || {}

  return (
    <>
      <EntryLink className="back" to="">
        ← {'훈련법 목록'}
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
 * `silent`은 위험한 경우를 표시한다. 용어가 전환에서 살아남으면서 뜻만 바뀌는 것.
 * `anchor_change`는 intensity_model에서 유도되므로 기계 검증된다.
 *
 * 날것의 `a -> b` 문자열 대신 `AnchorCode` 둘로 렌더한다. 슬러그 쌍은, 양쪽이 서로 다른
 * 것을 뜻한다는 것이 요점의 전부인 바로 그 페이지에서 죽은 텍스트였다. 앵커 코드로 만들면
 * 양쪽이 각각 무엇을 재야 하는지와 그것 없이 무엇을 잃는지로 이어지고, 그게 독자가 보러
 * 온 답이다.
 */
const anchorSides = (change: string): [string, string] => {
  const [from, to] = (change || '').split('->').map((v) => v.trim())
  return [from, to]
}

function SwitchingCost({ ctx, system }: WithCtx & { system: System }) {
  const { bySystem } = ctx
  const entries = system.switching_cost || []
  if (!entries.length) return null
  return (
    <Block
      title={'전환 비용'}
      sub={
        "다른 훈련법을 하다 이리로 넘어올 때 무엇이 어긋나는지. 위험한 건 쓰던 단어가 그대로 남는 경우다 — '템포'라는 말은 똑같은데 가리키는 강도가 달라져서, 바뀐 줄도 모르고 계속하게 된다."
      }
    >
      {entries.map((x: SwitchingCost, i: number) => {
        const [from, to] = anchorSides(x.anchor_change)
        return (
          <div className="switch" key={`${x.from}-${i}`}>
            <div className="switch-head">
              <span className="switch-from">
                {'전환 출발'}:{' '}
                <EntryLink to={`system/${x.from}`}>{bySystem[x.from]?.name || x.from}</EntryLink>
              </span>
              <span
                className={`switch-flag ${x.silent ? 'silent' : 'loud'}`}
                title={
                  x.silent
                    ? '쓰던 용어가 그대로 살아남아서 바뀐 걸 알아채기 어렵다. 그래서 더 위험하다.'
                    : '바뀐 것이 바로 눈에 띈다. 적응할 기회가 있다.'
                }
              >
                {x.silent ? '조용함' : '드러남'}
              </span>
            </div>
            <p className="anchor-shift">
              {'강도 기준'}: <AnchorCode ctx={ctx} model={from} />
              {' → '}
              <AnchorCode ctx={ctx} model={to} />
            </p>
            <p>{x.note}</p>
          </div>
        )
      })}
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
