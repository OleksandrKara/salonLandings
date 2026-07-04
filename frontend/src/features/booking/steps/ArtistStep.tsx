import { fetchArtists } from "@/api/artists";
import { Card } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { PriceTag } from "@/components/ui/PriceTag";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice } from "@/lib/formatting";
import { useAsync } from "@/lib/useAsync";
import { ANY_ARTIST, type ServiceOffer } from "@/types/api";
import styles from "./ArtistStep.module.css";

interface ArtistStepProps {
  offer: ServiceOffer;
  onSelectArtist: (artistSelection: string) => void;
}

export function ArtistStep({ offer, onSelectArtist }: ArtistStepProps) {
  const { status, data, error, retry } = useAsync(fetchArtists, []);

  const lowestPrice = Math.min(...offer.pricing.map((p) => p.price));
  const lowestTier = offer.pricing.find((p) => p.price === lowestPrice);

  return (
    <div className={styles.wrapper}>
      <Card as="button" onClick={() => onSelectArtist(ANY_ARTIST)} className={styles.anyCard}>
        <div className={styles.anyCardHeader}>
          <span className={styles.anyBadge}>Recommended</span>
          <h3 className={styles.anyTitle}>Any Artist</h3>
        </div>
        <p className={styles.anySubtitle}>
          We'll automatically match you to whichever available artist gives you the lowest price for{" "}
          {offer.name}.
        </p>
        <PriceTag price={lowestPrice} compareAtPrice={lowestTier?.compare_at_price} />
        <p className={styles.fromNote}>Best price, most availability</p>
      </Card>

      <div className={styles.divider}>
        <span>or choose your artist</span>
      </div>

      {status === "loading" ? <Spinner label="Loading artists…" /> : null}
      {status === "error" ? <ErrorNotice message={error} onRetry={retry} /> : null}

      {status === "success" ? (
        <div className={styles.artistList}>
          {data.map((artist) => {
            const tierPricing = offer.pricing.find((p) => p.team_member_ids.includes(artist.id));
            if (!tierPricing) return null;
            return (
              <Card key={artist.id} as="button" onClick={() => onSelectArtist(artist.id)}>
                <div className={styles.artistRow}>
                  <div>
                    <p className={styles.artistName}>{artist.display_name}</p>
                    <p className={styles.artistTier}>
                      {artist.tier === "top" ? "Top Nail Artist" : "Nail Artist"}
                    </p>
                  </div>
                  <div className={styles.artistPrice}>
                    <span>{formatPrice(tierPricing.price)}</span>
                    {tierPricing.compare_at_price ? (
                      <span className={styles.artistCompareAt}>{formatPrice(tierPricing.compare_at_price)}</span>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
