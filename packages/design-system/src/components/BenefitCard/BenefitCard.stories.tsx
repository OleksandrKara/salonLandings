import type { Meta, StoryObj } from "@storybook/react";
import { BenefitCard } from "./BenefitCard";
import gelOverlayImg from "../../assets/work-gel-overlay.jpg";

const meta: Meta<typeof BenefitCard> = {
  title: "Content/BenefitCard",
  component: BenefitCard,
};
export default meta;
type Story = StoryObj<typeof BenefitCard>;

export const WithPhoto: Story = {
  args: {
    title: "No acrylics, ever",
    description: "Hard gel & gel polish only — kinder to your natural nails, no harsh fumes.",
    image: gelOverlayImg,
    imageAlt: "Smooth, durable structured gel manicure",
  },
};

export const WithIcon: Story = {
  args: {
    title: "3-4 weeks, chip-free",
    description: "Real client average wear time — most acrylic sets don't get close.",
    icon: "⏱️",
  },
};
