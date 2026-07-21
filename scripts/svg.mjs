// structure -> schematic SVG. The point: media is a derivative of data, not a licensed asset.
// Pure module: no filesystem, no globals. Imported by both the CLI (render.mjs) and the browser UI,
// so the visual stays a single function of the data in both places.

// rpe_10 is schema-mandated (contains/minContains/maxContains), so this cannot miss.
// The cost: RPE is the LEAST precise anchor, so the y-axis is subjective by construction.
// The chart looks precise on both axes and is schematic on both. Label accordingly.
const rpe = (w) => {
  const a = w.intensity.anchors.find((x) => x.model === "rpe_10");
  return a.range ? (a.range[0] + a.range[1]) / 2 : a.value;
};
const resolveRpe = (ref, self, byId) => (ref === "self" ? rpe(self) : rpe(byId[ref]));

// Layout only. NOT a pace model. Distance segments need a runner to become time; we fake one.
const NOMINAL_MPS = (r) => 2.4 + (r / 10) * 2.6;
const mid = (q) => (q.value != null ? q.value : (q.min + q.max) / 2);

const flatten = (segs, self, byId) =>
  segs.flatMap((s) =>
    s.kind === "repeat"
      ? Array.from({ length: mid(s.count) }, () => flatten(s.children, self, byId)).flat()
      : [
          {
            kind: s.kind,
            rpe: resolveRpe(s.intensity_ref, self, byId),
            secs: s.duration
              ? mid(s.duration)
              : mid(s.distance) / NOMINAL_MPS(resolveRpe(s.intensity_ref, self, byId)),
          },
        ],
  );

const COLOR = {
  warmup: "var(--muted)",
  cooldown: "var(--muted)",
  recovery: "var(--muted)",
  work: "var(--accent)",
};

// Render one workout to a schematic SVG string. `byId` resolves intensity_ref -> workout.
export function renderWorkout(w, byId) {
  const segs = flatten(w.structure.segments, w, byId);
  const total = segs.reduce((a, s) => a + s.secs, 0);
  const W = 640,
    H = 200,
    PAD = 36,
    PW = W - PAD * 2,
    PH = H - PAD * 2;
  let x = PAD;
  const bars = segs
    .map((s) => {
      const bw = (s.secs / total) * PW;
      const bh = (s.rpe / 10) * PH;
      const r = `<rect x="${x.toFixed(1)}" y="${(H - PAD - bh).toFixed(1)}" width="${Math.max(bw - 0.5, 0.5).toFixed(1)}" height="${bh.toFixed(1)}" fill="${COLOR[s.kind]}" rx="1"/>`;
      x += bw;
      return r;
    })
    .join("\n    ");
  const grid = [2, 4, 6, 8, 10]
    .map((r) => {
      const y = H - PAD - (r / 10) * PH;
      return `<line x1="${PAD}" y1="${y.toFixed(1)}" x2="${W - PAD}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="0.5"/><text x="${PAD - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="var(--muted)">${r}</text>`;
    })
    .join("\n    ");
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, monospace">
  <style>svg{--accent:#c94f2c;--muted:#a09a92;--border:#e4e0d8;--fg:#3a3630}</style>
  <text x="${PAD}" y="18" font-size="11" fill="var(--fg)">${w.canonical_name}</text>
  <text x="${W - PAD}" y="18" font-size="8" text-anchor="end" fill="var(--muted)">schematic - x: nominal pace - y: perceived effort</text>
  ${grid}
  ${bars}
  <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="var(--fg)" stroke-width="1"/>
</svg>`;
}
