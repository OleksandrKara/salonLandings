import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatPrice, formatSlotDay, formatSlotTime } from "@/lib/formatting";
import type { BookingConfirmation } from "@/types/api";
import styles from "./ConfirmationStep.module.css";

export function ConfirmationStep({
  confirmation,
  onBookAnother,
}: {
  confirmation: BookingConfirmation;
  onBookAnother: () => void;
}) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.checkmark} aria-hidden>
        ✓
      </div>
      <h2 className={styles.title}>You're all set!</h2>
      <p className={styles.subtitle}>
        A confirmation has been sent to your email. We can't wait to see you at AK.LUX.NAILS.
      </p>

      <Card>
        <p className={styles.service}>{confirmation.service_name}</p>
        <p className={styles.detail}>
          {formatSlotDay(confirmation.start_at)} at {formatSlotTime(confirmation.start_at)}
        </p>
        {confirmation.artist_name ? <p className={styles.detail}>with {confirmation.artist_name}</p> : null}
        <p className={styles.price}>{formatPrice(confirmation.price)}</p>

        <hr className={styles.divider} />

        <p className={styles.detail}>{confirmation.location_name}</p>
        <p className={styles.detail}>{confirmation.location_address}</p>
        {confirmation.location_phone ? <p className={styles.detail}>{confirmation.location_phone}</p> : null}
      </Card>

      {confirmation.cancellation_policy_text ? (
        <details className={styles.policy}>
          <summary>Cancellation policy</summary>
          <p>{confirmation.cancellation_policy_text}</p>
        </details>
      ) : null}

      <Button variant="secondary" fullWidth onClick={onBookAnother}>
        Book Another Appointment
      </Button>
    </div>
  );
}
