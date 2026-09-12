import type { ReactNode } from "react";
import "./BenefitCard.css";

export interface BenefitCardProps {
  /** One short, punchy claim — a single idea, not a paragraph. */
  title: string;
  /** One supporting sentence. */
  description: string;
  /** Optional real photo backing this specific benefit — the redesign brief's "one idea per
   * scroll-stop, each with its own small visual moment" pattern. */
  image?: string;
  imageAlt?: string;
  /** Optional small icon/emoji shown above the title when no photo is supplied. */
  icon?: ReactNode;
}

/** One bite-sized proof/benefit callout — the building block for a long, scroll-driven page
 * made of many small wins rather than a few long paragraphs. */
export function BenefitCard({ title, description, image, imageAlt, icon }: BenefitCardProps) {
  return (
    <div className="ds-benefit-card">
      {image ? (
        <img className="ds-benefit-card__image" src={image} alt={imageAlt ?? ""} loading="lazy" />
      ) : icon ? (
        <div className="ds-benefit-card__icon">{icon}</div>
      ) : null}
      <h3 className="ds-benefit-card__title">{title}</h3>
      <p className="ds-benefit-card__desc">{description}</p>
    </div>
  );
}
