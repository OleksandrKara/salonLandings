// Builds the design system to dist/ — plain esbuild, no framework-specific plugin, so the
// output stays a portable ESM bundle any consumer (frontend app, Storybook, or a future
// claude.ai/design sync) can import the same way. CSS is bundled to a single dist/styles.css
// via esbuild's own CSS loader/bundling so every component's styles are reachable from one
// import, matching the "@import closure" convention design tooling expects.
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });

// The JS bundle never embeds CSS — .css imports in component files are for editor/Storybook
// convenience only (Vite resolves them directly); here they're a no-op ("empty" loader) so
// dist/index.js stays pure JS and dist/styles.css (below) is the one real, authoritative
// stylesheet a consumer imports — no risk of the same rules shipping twice or drifting apart.
await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/index.js",
  format: "esm",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  external: ["react", "react-dom", "react/jsx-runtime"],
  loader: { ".css": "empty" },
});

await build({
  entryPoints: ["src/styles.css"],
  bundle: true,
  outfile: "dist/styles.css",
});

console.log("design-system build complete: dist/index.js, dist/styles.css");
