import { defineConfig } from "vite-plus";

export default defineConfig({
  // A real base path, not "./": History-API routing has to know where the site
  // root is in order to strip it off location.pathname. GitHub Pages serves this
  // project repo from /<repo>/, and scripts/prerender.mjs writes a file at every
  // route, so Pages needs no rewrite rules to serve them. Override with BASE_PATH
  // when hosting elsewhere.
  base: process.env.BASE_PATH || "/running-training-dataset/",
  // JSX is transformed by oxc - Vite+ uses oxc, not esbuild, and tsconfig's jsx
  // settings inform only the type checker, not the bundler.
  oxc: {
    jsx: { runtime: "automatic" },
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
