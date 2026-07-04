import { fetchAvailability } from "@/api/availability";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice, formatSlotTime, groupSlotsByDay } from "@/lib/formatting";
import { useAsync } from "@/lib/useAsync";
import type { ServiceOffer, SlotOption } from "@/types/api";
import styles from "./SlotStep.module.css";

interface SlotStepProps {
  offer: ServiceOffer;
  artistSelection: string;
  onSelectSlot: (slot: SlotOption) => void;
}

export function SlotStep({ offer, artistSelection, onSelectSlot }: SlotStepProps) {
  const { status, data, error, retry } = useAsync(
    () => fetchAvailability({ service: offer.slug, artist: artistSelection }),
    [offer.slug, artistSelection],
  );

  if (status === "loading") return <Spinner label="Finding available times…" />;
  if (status === "error") return <ErrorNotice message={error} onRetry={retry} />;

  if (!data || data.slots.length === 0) {
    return (
      <ErrorNotice
        message="No appointment times are available in the next couple of weeks for this selection. Please try a different artist or check back soon."
      />
    );
  }

  const groups = groupSlotsByDay(data.slots);

  return (
    <div className={styles.wrapper}>
      <p className={styles.timezoneNote}>All times shown in Pacific Time (San Diego, CA)</p>
      {Array.from(groups.entries()).map(([day, slots]) => (
        <div key={day} className={styles.dayGroup}>
          <h3 className={styles.dayLabel}>{day}</h3>
          <div className={styles.slotGrid}>
            {slots.map((slot) => (
              <button
                key={`${slot.start_at}-${slot.team_member_id}`}
                type="button"
                className={styles.slotButton}
                onClick={() => onSelectSlot(slot)}
              >
                <span className={styles.slotTime}>{formatSlotTime(slot.start_at)}</span>
                <span className={styles.slotPrice}>{formatPrice(slot.price)}</span>
                {slot.savings > 0 ? (
                  <span className={styles.slotSavings}>Save {formatPrice(slot.savings)}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
