import type { Meta, StoryObj } from "@storybook/react";
import { ReviewCard } from "./ReviewCard";

const meta: Meta<typeof ReviewCard> = {
  title: "Trust/ReviewCard",
  component: ReviewCard,
};
export default meta;
type Story = StoryObj<typeof ReviewCard>;

// Real review already live in salonLandings/frontend/src/data/designCopy.ts (REVIEWS[0]) — not
// invented copy. Specific details (exact wear time, cuticle work) are what the redesign brief
// calls out as converting better than generic praise.
export const Real: Story = {
  args: {
    initial: "J",
    name: "Jessica M.",
    date: "2 weeks ago",
    stars: 5,
    text: "Best Russian manicure I've had in San Diego. Cuticles were flawless and it's still perfect after 3 weeks — no chips at all.",
  },
};
