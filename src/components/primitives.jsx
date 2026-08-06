// Shared primitives. These are the repeated shapes the template-literal views
// open-coded at every call site - a `<section className="block">` with an
// uppercase h3 and an optional sub-line appeared a dozen times.

export function Block({ title, sub, className: cls, children }) {
  return (
    <section className={cls ? `block ${cls}` : "block"}>
      <h3>{title}</h3>
      {sub && <p className="sub">{sub}</p>}
      {children}
    </section>
  );
}

export function Chip({ title, className: cls, children }) {
  return (
    <span className={cls ? `chip ${cls}` : "chip"} title={title}>
      {children}
    </span>
  );
}

export function WChip({ href, children }) {
  return (
    <a className="wchip" href={href}>
      {children}
    </a>
  );
}

// Tier is deliberately given distinct visual weight: consensus reads as settled,
// tradition reads as unproven. Flattening these is the failure the README bans -
// which is also why this stays bespoke rather than becoming a design-system
// status badge (ADR 0002): the tiers are not success/warning/danger.
const TIER_LABEL = {
  consensus: { ko: "정설", en: "consensus" },
  plausible: { ko: "유력", en: "plausible" },
  tradition: { ko: "관행", en: "tradition" },
};

export function TierBadge({ ctx, tier }) {
  if (!tier) return null;
  const label = TIER_LABEL[tier] || { ko: tier, en: tier };
  return (
    <span className={`tier tier-${tier}`} title={`evidence tier: ${tier}`}>
      {ctx.t(label)}
    </span>
  );
}

// A raw intensity_model / anchor.model code, made hoverable and clickable: the
// tooltip pulls label + construct + what-it-takes-to-measure from anchors.json so
// a slug like "lactate_mmol" explains itself in place.
export function AnchorCode({ ctx, model }) {
  const { t, url, byAnchor, constructLabel } = ctx;
  const a = byAnchor[model];
  if (!a) return <code>{model}</code>;
  const tip = [t(a.label), t(constructLabel[a.construct]), t(a.requires)]
    .filter(Boolean)
    .join(" · ");
  return (
    <a className="anchor-code" href={url(`anchor/${model}`)} title={tip}>
      <code>{model}</code>
    </a>
  );
}

// A commitment chip that explains its dimension on hover - the terse "9-13x/wk"
// says what, the tooltip says what it means.
export function InfoChip({ ctx, tip, children }) {
  return (
    <span className="chip chip-info" title={ctx.t(tip)}>
      {children}
    </span>
  );
}

export function CiteList({ evidence }) {
  if (!evidence?.cite?.length) return null;
  return (
    <ul className="cites">
      {evidence.cite.map((c) => (
        <li key={c}>{c}</li>
      ))}
    </ul>
  );
}

// The measurement layer (data/anchors.json): what each anchor takes to measure,
// and the honest floor when you cannot. It points down to RPE and names what is
// lost - never a numeric conversion, because anchors do not convert cleanly.
export function MeasurementBlock({ ctx, models, fallbackFor = null }) {
  const { t, lang, byAnchor, constructs } = ctx;
  const uniq = [...new Set(models.filter((m) => byAnchor[m]))];
  const groups = constructs
    .map((c) => ({ c, items: uniq.filter((m) => byAnchor[m].construct === c.id) }))
    .filter((g) => g.items.length);
  const fa = fallbackFor && byAnchor[fallbackFor];

  return (
    <Block
      title={lang === "ko" ? "측정 요건" : "Measurement"}
      sub={
        lang === "ko"
          ? "앵커는 읽는 구성개념(지각·페이스·심박·대사)으로 묶인다. 같은 구성개념이라도 서로 변환되지 않으며, 장비가 없으면 결국 장비 없이 누구나 쓸 수 있는 유일한 기준인 RPE로 떨어진다 — 변환이 아니라 하강이다."
          : "Anchors are grouped by the construct they read (perception, pace, heart rate, metabolic). Even within a construct they do not interconvert, and without the equipment you ultimately drop to RPE - the one standard anyone can use with no equipment - a descent, not a conversion."
      }
    >
      <div className="measure-groups">
        {groups.map(({ c, items }) => (
          <div className="measure-group" key={c.id}>
            <span className="measure-construct" title={t(c.note)}>
              {t(c.label)}
            </span>
            <ul className="measure">
              {items.map((m) => {
                const a = byAnchor[m];
                return (
                  <li key={m}>
                    <code>{m}</code>
                    <span className="req">{t(a.requires)}</span>
                    {a.equipment_free && (
                      <span className="floor-badge">
                        {lang === "ko" ? "장비 불필요" : "no equipment"}
                      </span>
                    )}
                    {a.note && <span className="measure-note">{t(a.note)}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {fa && !fa.equipment_free && (
        <p className="note fallback-note">
          {lang === "ko" ? "없으면 → " : "if unavailable → "}
          {t(fa.fallback)}
        </p>
      )}
    </Block>
  );
}

// The adaptation taxonomy (data/adaptations.json): group a workout's flat
// target_adaptation slugs under their coarse physiological category, with the
// definition on hover. Descriptive - it names what the workout targets, not what
// it produces.
export function AdaptationsBlock({ ctx, ids }) {
  const { t, lang, byAdaptation, adaptCategories } = ctx;
  const groups = adaptCategories
    .map((cat) => ({
      cat,
      items: ids.map((id) => byAdaptation[id]).filter((a) => a && a.category === cat.id),
    }))
    .filter((g) => g.items.length);
  if (!groups.length) return null;

  return (
    <Block
      title={lang === "ko" ? "표적 적응" : "Target adaptations"}
      sub={
        lang === "ko"
          ? "이 워크아웃이 노린다고 주장하는 생리적 적응 — 결과가 아니라 표적이다. 정의는 마우스를 올려서."
          : "The physiological adaptations this workout is claimed to target - a target, not an outcome. Hover for the definition."
      }
    >
      <div className="adapt-groups">
        {groups.map(({ cat, items }) => (
          <div className="adapt-group" key={cat.id}>
            <span className="adapt-cat">{t(cat.label)}</span>
            <div className="adapt-chips">
              {items.map((a) => (
                <span className="adapt" title={t(a.definition)} key={a.id}>
                  {t(a.label)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Block>
  );
}
