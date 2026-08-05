import { defineConfig } from "vite-plus";

export default defineConfig({
  // A real base path, not "./": History-API routing has to know where the site
  // root is in order to strip it off location.pathname. GitHub Pages serves this
  // project repo from /<repo>/, and scripts/prerender.mjs writes a file at every
  // route, so Pages needs no rewrite rules to serve them. Override with BASE_PATH
  // when hosting elsewhere.
  base: process.env.BASE_PATH || "/running-training-dataset/",
  // Preact, not React: the bundle is ~85% data (ADR 0001 keeps the whole corpus
  // resident), so a 45kB view runtime would be a visible regression where a 4kB
  // one is noise. JSX also auto-escapes, which retires the manual esc() calls the
  // template-literal views needed. Set on `oxc` - Vite+ transforms with oxc, and
  // without an importSource here JSX resolves to react/jsx-runtime and the build
  // fails. tsconfig's jsx settings only inform the type checker, not the bundler.
  oxc: {
    jsx: { runtime: "automatic", importSource: "preact" },
  },
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
