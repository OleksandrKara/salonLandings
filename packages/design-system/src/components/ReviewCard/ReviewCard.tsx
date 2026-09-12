import "./ReviewCard.css";

export interface ReviewCardProps {
  initial: string;
  name: string;
  date: string;
  /** 1-5. Rendered as filled/outline stars — pass the real rating, never hardcode 5. */
  stars: number;
  text: string;
}

/** A single real review — specific quotes convert better than generic ones (redesign brief),
 * so this stays plain: avatar initial, name, date, star row, quote. No carousel logic here —
 * compose several of these in the page's own layout/scroll rhythm. */
export function ReviewCard({ initial, name, date, stars, text }: ReviewCardProps) {
  return (
    <div className="ds-review-card">
      <div className="ds-review-card__head">
        <div className="ds-review-card__avatar">{initial}</div>
        <div>
          <div className="ds-review-card__name">{name}</div>
          <div className="ds-review-card__date">{date}</div>
        </div>
      </div>
      <div className="ds-review-card__stars" aria-label={`${stars} out of 5 stars`}>
        {"★".repeat(stars)}
        <span className="ds-review-card__stars-empty">{"★".repeat(5 - stars)}</span>
      </div>
      <p className="ds-review-card__text">{text}</p>
    </div>
  );
}
