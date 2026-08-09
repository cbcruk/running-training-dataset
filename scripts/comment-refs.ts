/**
 * Every file a comment names, and whether it is still there.
 *
 * Prose is the one part of this repo nothing checked. Sixteen comments turned out
 * to name files that no longer existed, left behind by the module-extension and
 * views-to-components moves, and one was worse than stale: the prerenderer
 * described importing a build artefact four lines above the import of the source.
 * There are 100+ such references and no version of "remember to update them"
 * survives that many.
 *
 * The same move the data already gets: state it, then make it checkable. A
 * reference that is deliberately not resolvable goes in ALLOWED below, which turns
 * "is this a mistake or the point?" into a question answered once, in code.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join, basename } from 'node:path'

/**
 * References that name something the repo does not contain, on purpose.
 *
 * `views.jsx` - a comment comparing a file to the template-literal original it
 * replaced has to name that original; the sentence is about it being gone.
 * `404.html` - written into dist/ by the prerenderer, so it exists only after a
 * build.
 */
const ALLOWED = new Set(['views.jsx', '404.html'])

const SKIP = new Set(['node_modules', 'dist', 'out', '.git', '.ssr', '.claude', 'types'])
const SCAN = /\.(ts|tsx|js|jsx|css)$/
const NAMED = /\.(ts|tsx|js|jsx|mjs|cjs|json|css|html|md)$/

/** A path-shaped token: a name with a short lowercase extension, no spaces. */
const TOKEN = /(?:\.{0,2}\/)?[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.[a-z]{2,4}\b/g

export interface BrokenRef {
  file: string
  line: number
  ref: string
}

function walk(dir: string, root: string, all: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, root, all)
    else all.push(full.slice(root.length + 1))
  }
  return all
}

/**
 * Comment lines only. A path inside a string literal is code - the import that
 * would break loudly if it were wrong - and needs no help from this.
 */
function commentLines(src: string): [number, string][] {
  const out: [number, string][] = []
  let block = false
  src.split('\n').forEach((raw, i) => {
    const line = raw.trim()
    if (block) {
      out.push([i + 1, line])
      if (line.includes('*/')) block = false
    } else if (line.startsWith('//')) out.push([i + 1, line])
    else if (line.startsWith('/*')) {
      out.push([i + 1, line])
      if (!line.includes('*/')) block = true
    }
  })
  return out
}

/**
 * A reference resolves if it names a real file: relative to the repo root,
 * relative to the commenting file, or - for a bare name like `anchors.json` -
 * anywhere in the repo, since that is what a reader would go looking for.
 */
export function brokenRefs(root: string): BrokenRef[] {
  const all = walk(root, root)
  const byName = new Set(all.map((p) => basename(p)))
  const byPath = new Set(all)
  const broken: BrokenRef[] = []

  for (const file of all.filter((p) => SCAN.test(p))) {
    for (const [line, text] of commentLines(readFileSync(resolve(root, file), 'utf8'))) {
      for (const ref of text.match(TOKEN) ?? []) {
        if (!NAMED.test(ref) || ALLOWED.has(ref) || ALLOWED.has(basename(ref))) continue
        const rel = ref.replace(/^\.\//, '')
        const beside = join(dirname(file), rel)
        if (byPath.has(rel) || byPath.has(beside) || (!ref.includes('/') && byName.has(ref)))
          continue
        broken.push({ file, line, ref })
      }
    }
  }
  return broken
}
