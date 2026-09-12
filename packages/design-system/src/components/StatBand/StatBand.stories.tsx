import type { Meta, StoryObj } from "@storybook/react";
import { StatBand } from "./StatBand";

const meta: Meta<typeof StatBand> = {
  title: "Trust/StatBand",
  component: StatBand,
};
export default meta;
type Story = StoryObj<typeof StatBand>;

// Real figures, verified against the app's own database (2026-09-12) — 4.8★/125 reviews is the
// live GOOGLE_REVIEW_RATING/COUNT from salonLandings' own designCopy.ts; 98% and 3-4 wks are
// real too. Never substitute a rounder-sounding number here — see the mani redesign brief.
export const ManiTrustBand: Story = {
  args: {
    stats: [
      { value: "4.8★", label: "125 Google reviews" },
      { value: "98%", label: "rate their visit 4-5★" },
      { value: "3-4 wks", label: "chip-free wear" },
    ],
  },
};
