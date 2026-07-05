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
        <div style={{ marginBottom: 16 }}>
          <div style={styles.calendarEyebrow}>Save the date</div>
          <div style={styles.calendarStack}>
            <a href={calGoogle} target="_blank" rel="noopener" className="calendar-link" style={styles.calendarLink}>
              <span style={{ ...styles.calendarIconBadge, background: "#4285F4" }}>
                <CalendarCheckGlyph />
              </span>
              <span style={styles.calendarTextBlock}>
                <span style={styles.calendarLinkTitle}>Add to Google Calendar</span>
                <span style={styles.calendarLinkSubtitle}>Get a reminder before your visit</span>
              </span>
              <span style={styles.calendarChevron}>›</span>
            </a>
            <a href={calIcs} download="appointment.ics" className="calendar-link" style={styles.calendarLink}>
              <span style={{ ...styles.calendarIconBadge, background: "#1d1d1f" }}>
                <AppleGlyph />
              </span>
              <span style={styles.calendarTextBlock}>
                <span style={styles.calendarLinkTitle}>Add to Apple Calendar</span>
                <span style={styles.calendarLinkSubtitle}>Works with iPhone, iPad &amp; Mac</span>
              </span>
              <span style={styles.calendarChevron}>›</span>
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

function CalendarCheckGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="15" rx="3" stroke="#fff" strokeWidth="1.7" />
      <path d="M3 9.5H21" stroke="#fff" strokeWidth="1.7" />
      <path d="M8 3V6.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 3V6.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8.5 14L10.5 16L15.5 11.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.416-2.09-3.629-2.324-4.415-2.376-2.006-.156-3.688 1.09-4.65 1.09zm3.634-3.428c.834-1.014 1.401-2.402 1.245-3.793-1.207.052-2.662.805-3.532 1.818-.78.896-1.46 2.336-1.284 3.702 1.336.104 2.702-.688 3.571-1.727z" />
    </svg>
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
  calendarEyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 10, textAlign: "left" },
  calendarStack: { display: "flex", flexDirection: "column", gap: 10 },
  calendarLink: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "11px 14px",
    border: "1px solid var(--color-border-2)",
    borderRadius: 14,
    background: "var(--color-card)",
    textDecoration: "none",
    boxShadow: "0 1px 2px rgba(42,33,29,0.06)",
  },
  calendarIconBadge: { width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  calendarTextBlock: { display: "flex", flexDirection: "column", flex: 1, textAlign: "left", gap: 1 },
  calendarLinkTitle: { fontSize: 13.5, fontWeight: 700, color: "var(--color-ink)" },
  calendarLinkSubtitle: { fontSize: 11.5, color: "var(--color-muted-2)" },
  calendarChevron: { fontSize: 20, color: "var(--color-muted-3)", flexShrink: 0, lineHeight: 1 },
  doneButton: { width: "100%", border: "none", background: "none", color: "var(--color-muted-2)", fontSize: 14, fontWeight: 600, padding: 12, cursor: "pointer" },
};
