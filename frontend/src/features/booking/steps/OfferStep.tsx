import { fetchServiceOffers } from "@/api/services";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { PriceTag } from "@/components/ui/PriceTag";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice } from "@/lib/formatting";
import { useAsync } from "@/lib/useAsync";
import type { ServiceOffer } from "@/types/api";
import styles from "./OfferStep.module.css";

interface OfferStepProps {
  onSelectOffer: (offer: ServiceOffer) => void;
}

export function OfferStep({ onSelectOffer }: OfferStepProps) {
  const { status, data, error, retry } = useAsync(fetchServiceOffers, []);

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>AK.LUX.NAILS · San Diego</p>
        <h1 className={styles.headline}>Russian Manicure Gel Overlay</h1>
        <p className={styles.tagline}>
          Flawless, long-wearing nails from artists who specialize in precision Russian manicure technique —
          exclusive pricing for your first visit.
        </p>
      </div>

      <div className="container">
        {status === "loading" ? <Spinner label="Loading today's offers…" /> : null}
        {status === "error" ? <ErrorNotice message={error} onRetry={retry} /> : null}

        {status === "success" ? (
          <div className={styles.offers}>
            {data.map((offer) => (
              <OfferCard key={offer.slug} offer={offer} onSelect={() => onSelectOffer(offer)} />
            ))}
          </div>
        ) : null}

        <p className={styles.disclaimer}>
          First-time clients only. Price shown reflects our best available artist match — choose "Any Artist" at
          checkout and we'll always match you to the lowest eligible price.
        </p>
      </div>
    </div>
  );
}

function OfferCard({ offer, onSelect }: { offer: ServiceOffer; onSelect: () => void }) {
  const advertised = offer.pricing[0];
  const lowestPrice = Math.min(...offer.pricing.map((p) => p.price));
  const maxSavings = Math.max(0, ...offer.pricing.map((p) => (p.compare_at_price ?? p.price) - p.price));

  return (
    <Card>
      <div className={styles.cardHeader}>
        {offer.offer_label ? <span className={styles.offerLabel}>{offer.offer_label}</span> : null}
        <h2 className={styles.offerName}>{offer.name}</h2>
      </div>

      {offer.description ? <p className={styles.offerDescription}>{offer.description}</p> : null}

      <PriceTag
        price={advertised?.price ?? lowestPrice}
        compareAtPrice={advertised?.compare_at_price}
        savingsLabel={maxSavings > 0 ? `Save up to ${formatPrice(maxSavings)}` : undefined}
        size="lg"
      />

      <p className={styles.fromPrice}>Starting from {formatPrice(lowestPrice)} with Any Artist</p>

      <Button fullWidth onClick={onSelect}>
        Claim This Offer
      </Button>
    </Card>
  );
}
