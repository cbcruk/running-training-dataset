// The one walker over a row's evidence graph.
//
// `evidence` hangs in several places on a row - the row itself, `claim`, `test`,
// `distribution`, each `volume_cap` - and every consumer needs the same three
// facts about each one: where it sits, what it claims, and the nearest sentence
// it is supposed to be evidence *for*. Before this module that shape was encoded
// four separate times across validate.ts and verify.ts, so a schema change that
// moved evidence could be picked up by some walkers and missed by others with
// nothing failing to say so.
//
// Pure and DOM-free, like svg.ts: the validator and the worksheet generator are
// two adapters over one traversal, which is what keeps them from disagreeing
// about what the data contains.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = any

export type Tier = 'consensus' | 'plausible' | 'tradition'

export interface Evidence {
  tier: Tier
  cite?: string[]
  note?: unknown
}

/**
 * What the nearest falsifiable sentence is, so a reader knows what they are
 * checking the source against. `none` means the evidence has nothing stated for
 * it to be evidence for - which is itself a finding, not a formatting detail.
 */
export type AssertionKind = 'proposition' | 'test' | 'unobservable-test' | 'none'

export interface Assertion {
  /** Dotted path to the node carrying the evidence; "" for the row itself. */
  path: string
  evidence: Evidence
  /** Raw bilingual value - the caller picks a language. */
  proposition?: Row
  kind: AssertionKind
}

/**
 * Every evidence object on a row, in document order, each paired with the
 * nearest proposition above or at it.
 *
 * A node's own sentence wins over an inherited one; where a node states none,
 * the closest ancestor's carries down. A system's row-level `evidence` sits
 * beside `claim` rather than inside it, so the row's own proposition seeds the
 * walk - otherwise the strongest claim in the file would report as unattached.
 */
export function assertions(row: Row): Assertion[] {
  const out: Assertion[] = []

  const visit = (node: Row, path: string, inherited: Row, inheritedKind: AssertionKind) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => visit(v, `${path}[${i}]`, inherited, inheritedKind))
      return
    }
    if (!node || typeof node !== 'object') return

    let proposition = inherited
    let kind = inheritedKind
    if (node.proposition) {
      proposition = node.proposition
      kind = 'proposition'
    } else if (node.what) {
      proposition = node.what
      kind = 'test'
    } else if (node.detectable === false && node.mechanism) {
      proposition = node.mechanism
      kind = 'unobservable-test'
    }

    if (node.evidence?.tier) {
      out.push({ path, evidence: node.evidence, proposition, kind })
    }
    for (const [k, v] of Object.entries(node)) {
      if (k !== 'evidence') visit(v, path ? `${path}.${k}` : k, proposition, kind)
    }
  }

  const seed = row.claim?.proposition
  visit(row, '', seed, seed ? 'proposition' : 'none')
  return out
}

/** Every distinct reference cited as evidence anywhere on the row. */
export function citedWorks(row: Row): Set<string> {
  const out = new Set<string>()
  for (const a of assertions(row)) for (const c of a.evidence.cite ?? []) out.add(c)
  return out
}
