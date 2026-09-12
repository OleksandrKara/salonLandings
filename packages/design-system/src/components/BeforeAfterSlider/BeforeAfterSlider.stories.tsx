import type { Meta, StoryObj } from "@storybook/react";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import redClassicImg from "../../assets/work-red-classic.jpg";
import milkyWhiteImg from "../../assets/work-milky-white.jpg";

const meta: Meta<typeof BeforeAfterSlider> = {
  title: "Content/BeforeAfterSlider",
  component: BeforeAfterSlider,
};
export default meta;
type Story = StoryObj<typeof BeforeAfterSlider>;

/** Placeholder photos — we don't have a real acrylic "before" shot yet (see the mani redesign
 * brief, 2026-09-12: no true before/after pair exists in the asset library today). This story
 * demonstrates the drag/clip-path mechanism only; swap beforeSrc for a real acrylic photo (ours
 * or a sourced one, clearly disclosed if not our own client's) before this ships on the real
 * page. */
export const MechanismDemoOnly: Story = {
  args: {
    beforeSrc: redClassicImg,
    afterSrc: milkyWhiteImg,
    beforeLabel: "Acrylic (placeholder)",
    afterLabel: "Russian Gel Overlay",
  },
};
