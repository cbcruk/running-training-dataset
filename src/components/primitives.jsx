// Shared primitives. These are the repeated shapes the template-literal views
// open-coded at every call site - a `<section class="block">` with an uppercase
// h3 and an optional sub-line appeared a dozen times.

export function Block({ title, sub, class: cls, children }) {
  return (
    <section class={cls ? `block ${cls}` : "block"}>
      <h3>{title}</h3>
      {sub && <p class="sub">{sub}</p>}
      {children}
    </section>
  );
}

export function Chip({ title, class: cls, children }) {
  return (
    <span class={cls ? `chip ${cls}` : "chip"} title={title}>
      {children}
    </span>
  );
}

export function WChip({ href, children }) {
  return (
    <a class="wchip" href={href}>
      {children}
    </a>
  );
}

// Tier is deliberately given distinct visual weight: consensus reads as settled,
// tradition reads as unproven. Flattening these is the failure the README bans.
const TIER_LABEL = {
  consensus: { ko: "정설", en: "consensus" },
  plausible: { ko: "유력", en: "plausible" },
  tradition: { ko: "관행", en: "tradition" },
};

export function TierBadge({ ctx, tier }) {
  if (!tier) return null;
  const label = TIER_LABEL[tier] || { ko: tier, en: tier };
  return (
    <span class={`tier tier-${tier}`} title={`evidence tier: ${tier}`}>
      {ctx.t(label)}
    </span>
  );
}
