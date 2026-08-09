import type { Workout } from '../src/types/index.d.ts'
import type { Anchor, Quantity, Segment } from '../src/types/workout.d.ts'

type ById = Record<string, Workout>

/**
 * The y-axis. `rpe_10` is schema-mandated (contains/minContains/maxContains), so
 * this cannot miss - and it is the LEAST precise anchor the data has, which makes
 * the vertical axis subjective by construction. The chart looks precise on both
 * axes and is schematic on both; label it accordingly.
 */
const rpe = (w: Workout): number => {
  const a = w.intensity.anchors.find((x: Anchor) => x.model === 'rpe_10')!
  return a.range ? (a.range[0] + a.range[1]) / 2 : a.value!
}
const resolveRpe = (ref: string, self: Workout, byId: ById): number =>
  ref === 'self' ? rpe(self) : rpe(byId[ref])

/** Layout only. NOT a pace model. Distance segments need a runner to become time; we fake one. */
const NOMINAL_MPS = (r: number) => 2.4 + (r / 10) * 2.6
/**
 * The schema requires either `value` or a `min`/`max` pair (oneOf), and
 * validate.ts enforces it, so the generated optional types are wider than the
 * data can actually be.
 */
const mid = (q: Quantity): number => (q.value != null ? q.value : (q.min! + q.max!) / 2)

const flatten = (segs: Segment[], self: Workout, byId: ById): Flat[] =>
  segs.flatMap((s: Segment) =>
    s.kind === 'repeat'
      ? Array.from({ length: mid(s.count as Quantity) }, () =>
          flatten(s.children as Segment[], self, byId),
        ).flat()
      : [
          {
            kind: s.kind,
            rpe: resolveRpe(s.intensity_ref!, self, byId),
            secs: s.duration
              ? mid(s.duration)
              : mid(s.distance!) / NOMINAL_MPS(resolveRpe(s.intensity_ref!, self, byId)),
          },
        ],
  )

interface Flat {
  kind: string
  rpe: number
  secs: number
}

const COLOR: Record<string, string> = {
  warmup: 'var(--muted)',
  cooldown: 'var(--muted)',
  recovery: 'var(--muted)',
  work: 'var(--accent)',
}

/**
 * `structure` -> a schematic SVG string. `byId` resolves `intensity_ref` -> workout.
 *
 * The media this project ships is a derivative of its data, not a licensed asset,
 * which is what makes it free to keep. Pure - no filesystem, no globals - so the
 * CLI (render.ts) and the browser UI can both call it and the visual stays one
 * function of the data in both places.
 */
export function renderWorkout(w: Workout, byId: ById): string {
  const segs = flatten(w.structure.segments, w, byId)
  const total = segs.reduce((a: number, s: Flat) => a + s.secs, 0)
  const W = 640,
    H = 200,
    PAD = 36,
    PW = W - PAD * 2,
    PH = H - PAD * 2
  let x = PAD
  const bars = segs
    .map((s: Flat) => {
      const bw = (s.secs / total) * PW
      const bh = (s.rpe / 10) * PH
      const r = `<rect x="${x.toFixed(1)}" y="${(H - PAD - bh).toFixed(1)}" width="${Math.max(bw - 0.5, 0.5).toFixed(1)}" height="${bh.toFixed(1)}" fill="${COLOR[s.kind]}" rx="1"/>`
      x += bw
      return r
    })
    .join('\n    ')
  const grid = [2, 4, 6, 8, 10]
    .map((r: number) => {
      const y = H - PAD - (r / 10) * PH
      return `<line x1="${PAD}" y1="${y.toFixed(1)}" x2="${W - PAD}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="0.5"/><text x="${PAD - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="var(--muted)">${r}</text>`
    })
    .join('\n    ')
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, monospace">
  <style>svg{--accent:#c94f2c;--muted:#a09a92;--border:#e4e0d8;--fg:#3a3630}</style>
  <text x="${PAD}" y="18" font-size="11" fill="var(--fg)">${w.canonical_name}</text>
  <text x="${W - PAD}" y="18" font-size="8" text-anchor="end" fill="var(--muted)">schematic - x: nominal pace - y: perceived effort</text>
  ${grid}
  ${bars}
  <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="var(--fg)" stroke-width="1"/>
</svg>`
}
