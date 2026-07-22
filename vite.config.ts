import { defineConfig } from "vite-plus";

export default defineConfig({
  // Relative asset paths so the built site works under any base path -
  // GitHub Pages serves a project repo from /<repo>/, and the hash router
  // needs no server-side rewrites.
  base: "./",
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
