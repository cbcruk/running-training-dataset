#!/usr/bin/env node
// Emit one real HTML file per dictionary entry, into the built dist/.
//
// This is the discovery half of ADR 0001. Hash routing gave the catalog no URL a
// crawler or a link preview could see; every entry now exists as a document on
// disk, so GitHub Pages serves it with no rewrite rules and the client bundle
// upgrades it to instant navigation on load.
//
// Markup comes from the views the browser renders from, so a prerendered page and
// a client-rendered one cannot drift.
//
// It imports the SSR *build* (.ssr/views.js), not src/views.jsx directly: the
// views are components now, and Node cannot parse JSX. `vp run pages` runs the
// SSR build first. That extra step is the price of the component model - see
// ADR 0002.
//
// Run it as `vp run pages`, not `prerender`: pnpm matches script names as
// substrings, so a script called `prerender` would also fire on `vp run render`
// (which writes the SVGs) and run this before dist/ exists.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { allRoutes, metaFor, renderPath, setBase, setLang, currentView } from "../.ssr/views.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const BASE = process.env.BASE_PATH || "/running-training-dataset/";

setBase(BASE);
setLang("ko");

// The built shell: Vite has already injected the hashed asset tags into it. Reuse
// it verbatim so prerendered pages load exactly the same bundle.
const shellPath = resolve(dist, "index.html");
let shell;
try {
  shell = readFileSync(shellPath, "utf8");
} catch {
  console.error("dist/index.html not found - run `vp build` before prerendering.");
  process.exit(1);
}

// Vite is configured with a relative base, so asset URLs come out as "./assets/…".
// A page at /anchor/rpe_10/ needs them resolved from the site root instead.
function absolutizeAssets(html) {
  return html.replace(/(src|href)="\.\/([^"]*)"/g, (_, attr, path) => `${attr}="${BASE}${path}"`);
}

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const SITE_URL = process.env.SITE_URL || "https://cbcruk.github.io/running-training-dataset";

function pageFor(path) {
  const { title, description } = metaFor(path);
  const canonical = SITE_URL.replace(/\/$/, "") + (path === "/" ? "/" : path);
  const body = renderPath(path);
  const view = currentView(path);

  let html = absolutizeAssets(shell);

  // Per-entry metadata: the part hash routing could never serve.
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${esc(description)}" />`,
  );
  html = html.replace(
    "</head>",
    `  <link rel="canonical" href="${esc(canonical)}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta name="twitter:card" content="summary" />
  </head>`,
  );

  // The entry itself, so the document is readable with no JavaScript at all.
  html = html.replace('<main id="app"></main>', `<main id="app">${body}</main>`);

  // Mark the active nav tab in the served HTML too, not just after hydration.
  html = html.replace(new RegExp(`(<a[^>]*data-nav="${view}")`), '$1 class="active"');

  return html;
}

mkdirSync(dist, { recursive: true });
const routes = allRoutes();
for (const path of routes) {
  const out = path === "/" ? resolve(dist, "index.html") : resolve(dist, `.${path}/index.html`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, pageFor(path));
}

// GitHub Pages serves 404.html for any path it has no file for. Point it at the
// shell so a mistyped or newly-added URL still boots the client router.
writeFileSync(resolve(dist, "404.html"), pageFor("/"));

console.log(`prerendered ${routes.length} routes + 404.html into dist/ (base ${BASE})`);
