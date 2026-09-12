# @akluxnails/design-system

Shared component library for the salonLandings tenant landing pages (mani, PMU, and future
tenants). Started 2026-09-12 for the mani redesign — see the redesign brief for full context.

## Structure

- `src/tokens/tokens.css` — base layout/type/motion tokens, plus one `.theme-<tenant>` block per
  landing page. Color lives entirely in the theme blocks, not the base tokens: each tenant is
  meant to look genuinely different, not share one brand skin.
- `src/components/*` — one folder per component (`.tsx` + `.css`), each exported from `src/index.ts`.
  Today: `StatBand`, `BenefitCard`, `ReviewCard`, `BeforeAfterSlider`.
- `src/styles.css` — the one stylesheet a consumer imports; `@import`s every component's real CSS
  plus tokens. Keep every new component's CSS added here too, or it silently won't ship.

## Using it in a landing page

```tsx
import { StatBand, BenefitCard } from "@akluxnails/design-system";
import "@akluxnails/design-system/dist/styles.css";

<div className="theme-mani">
  <StatBand stats={[{ value: "4.8★", label: "125 Google reviews" }]} />
</div>
```

Wrap the page (or its root) in the tenant's theme class (`theme-mani`, `theme-pmu`, ...) — every
component reads color from `--ds-*` custom properties that only exist inside a theme block.

## Development

```
npm run build            # esbuild -> dist/index.js, dist/styles.css, dist/index.d.ts
npm run storybook        # live component playground, http://localhost:6006
npm run build-storybook  # static Storybook build
```

Stories use real assets/copy where we have them (see each `*.stories.tsx`) — no lorem ipsum.
Where we don't have a real asset yet (e.g. a true acrylic "before" photo), the story says so
explicitly rather than quietly standing in a placeholder as if it were real.
