import type { CSSProperties } from "react";
import { buildGoogleCalendarLink, buildIcsDataUri } from "@/lib/calendar";
import { formatPrice, formatSlotDay, formatSlotTime } from "@/lib/formatting";
import type { BookingConfirmation, FourHandRequestConfirmation } from "@/types/api";

interface DoneStepProps {
  givenName: string;
  bookingConfirmation: BookingConfirmation | null;
  fourHandConfirmation: FourHandRequestConfirmation | null;
  onClose: () => void;
}

export function DoneStep({ givenName, bookingConfirmation, fourHandConfirmation, onClose }: DoneStepProps) {
  const name = givenName.trim() || "friend";
  const isFourHand = !!fourHandConfirmation;
  const title = isFourHand ? `Request received, ${name}!` : `You're on the list, ${name}!`;

  let calGoogle: string | null = null;
  let calIcs: string | null = null;
  if (bookingConfirmation) {
    const details = `Your appointment at AK.LUX.NAILS. ${bookingConfirmation.service_name}. Please arrive 5 minutes early.`;
    calGoogle = buildGoogleCalendarLink({
      title: `AK.LUX.NAILS — ${bookingConfirmation.service_name}`,
      startAt: bookingConfirmation.start_at,
      durationMinutes: bookingConfirmation.duration_minutes,
      details,
      location: bookingConfirmation.location_address,
    });
    calIcs = buildIcsDataUri({
      title: `AK.LUX.NAILS — ${bookingConfirmation.service_name}`,
      startAt: bookingConfirmation.start_at,
      durationMinutes: bookingConfirmation.duration_minutes,
      details,
      location: bookingConfirmation.location_address,
    });
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.checkmark}>✓</div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.subtitle}>
        {isFourHand
          ? fourHandConfirmation!.message
          : "We'll text you shortly to confirm. Appointment details:"}
      </p>

      {bookingConfirmation ? (
        <div style={styles.detailsCard}>
          <DetailRow label="Service" value={bookingConfirmation.service_name} />
          <DetailRow
            label="When"
            value={`${formatSlotDay(bookingConfirmation.start_at)} · ${formatSlotTime(bookingConfirmation.start_at)}`}
          />
          <DetailRow label="Artist" value={bookingConfirmation.artist_name ?? "Any available artist"} />
          <DetailRow label="Where" value={bookingConfirmation.location_address} />
          <div style={{ ...styles.detailRow, borderBottom: "none" }}>
            <span style={styles.detailLabel}>Total</span>
            <span style={{ textAlign: "right" }}>
              {bookingConfirmation.compare_at_price != null && bookingConfirmation.compare_at_price > bookingConfirmation.price ? (
                <span style={styles.strikePrice}>{formatPrice(bookingConfirmation.compare_at_price)}</span>
              ) : null}
              <span style={styles.detailPrice}>{formatPrice(bookingConfirmation.price)}</span>
            </span>
          </div>
        </div>
      ) : null}

      {calGoogle && calIcs ? (
        <div>
          <div style={styles.calendarLabel}>📅 Add This Appointment To Your Calendar</div>
          <div style={styles.calendarRow}>
            <a href={calGoogle} target="_blank" rel="noopener" style={styles.calendarLink}>
              Add to Google
            </a>
            <a href={calIcs} download="appointment.ics" style={styles.calendarLink}>
              Add to Apple
            </a>
          </div>
        </div>
      ) : null}

      <button onClick={onClose} style={styles.doneButton}>
        Done
      </button>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: { textAlign: "center", padding: "8px 2px 4px" },
  checkmark: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "var(--color-accent-tint)",
    color: "var(--color-accent)",
    fontSize: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "2px auto 14px",
  },
  title: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: "0 0 8px" },
  subtitle: { fontSize: 14, color: "var(--color-muted)", lineHeight: 1.5, margin: "0 0 18px" },
  detailsCard: { textAlign: "left", border: "1px solid var(--color-border-2)", borderRadius: 14, overflow: "hidden", marginBottom: 16 },
  detailRow: { display: "flex", justifyContent: "space-between", gap: 12, padding: "13px 15px", borderBottom: "1px solid #f0e4dc" },
  detailLabel: { fontSize: 12, color: "var(--color-muted-3)", textTransform: "uppercase", letterSpacing: 0.6 },
  detailValue: { fontSize: 13.5, fontWeight: 600, color: "var(--color-ink)", textAlign: "right" },
  strikePrice: { fontSize: 12, color: "var(--color-muted-3)", textDecoration: "line-through", marginRight: 7 },
  detailPrice: { fontSize: 13.5, fontWeight: 700, color: "var(--color-accent)" },
  calendarLabel: { fontSize: 13, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 10, textAlign: "left" },
  calendarRow: { display: "flex", gap: 10, marginBottom: 14 },
  calendarLink: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, border: "1px solid #d9c7bd", borderRadius: 11, background: "#fff", textDecoration: "none", color: "var(--color-ink)", fontSize: 13, fontWeight: 600 },
  doneButton: { width: "100%", border: "none", background: "none", color: "var(--color-muted-2)", fontSize: 14, fontWeight: 600, padding: 12, cursor: "pointer" },
};
