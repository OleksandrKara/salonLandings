import { useMemo, useState, type CSSProperties } from "react";
import { fetchAvailability } from "@/api/availability";
import { formatPrice, formatSlotTime, groupSlotsByDateKey, toPacificDateKey } from "@/lib/formatting";
import { useAsync } from "@/lib/useAsync";
import { Spinner } from "@/features/landing/Spinner";
import { ANY_ARTIST, type SlotOption } from "@/types/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const SEARCH_DAYS = 32; // Square's search_availability caps the query range at 32 days

interface DateTimeStepProps {
  serviceSlugs: string[];
  stepLabel: string;
  onSelectSlot: (slot: SlotOption) => void;
  onBack: () => void;
}

export function DateTimeStep({ serviceSlugs, stepLabel, onSelectSlot, onBack }: DateTimeStepProps) {
  const { status, data, error, retry } = useAsync(
    () => fetchAvailability({ services: serviceSlugs, artist: ANY_ARTIST, days: SEARCH_DAYS }),
    [serviceSlugs.join(",")],
  );

  const todayKey = toPacificDateKey(new Date().toISOString());
  const [todayYear, todayMonth, todayDate] = todayKey.split("-").map(Number);
  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth - 1);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const slotsByDate = useMemo(() => (data ? groupSlotsByDateKey(data.slots) : new Map<string, SlotOption[]>()), [data]);
  const sortedAvailableDates = useMemo(() => Array.from(slotsByDate.keys()).sort(), [slotsByDate]);

  // Calendar navigation can't outrun the actual search window, or the user
  // would page into empty months that look "fully booked" instead of just out of range.
  const maxDate = new Date(todayYear, todayMonth - 1, todayDate + SEARCH_DAYS);
  const canPrev = viewYear > todayYear || (viewYear === todayYear && viewMonth > todayMonth - 1);
  const canNext = viewYear < maxDate.getFullYear() || (viewYear === maxDate.getFullYear() && viewMonth < maxDate.getMonth());

  function prevMonth() {
    if (!canPrev) return;
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }
  function nextMonth() {
    if (!canNext) return;
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }
  const hasMoreAvailable = selectedDateKey
    ? sortedAvailableDates.some((key) => key > selectedDateKey)
    : sortedAvailableDates.some((key) => key >= todayKey);

  function findNextAvailable() {
    // Relative to the current selection so repeated clicks page forward
    // through availability, rather than always jumping back to the very
    // first open date.
    const next = selectedDateKey
      ? sortedAvailableDates.find((key) => key > selectedDateKey)
      : sortedAvailableDates.find((key) => key >= todayKey);
    if (!next) return;
    const [y, m] = next.split("-").map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    setSelectedDateKey(next);
  }

  if (status === "loading") return <LoadingState stepLabel={stepLabel} />;
  if (status === "error") return <ErrorState stepLabel={stepLabel} message={error} onRetry={retry} onBack={onBack} />;

  const daySlots = selectedDateKey ? slotsByDate.get(selectedDateKey) ?? [] : [];
  const startPad = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: { key: string; day: number; dateKey: string; available: boolean }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ key: dateKey, day: d, dateKey, available: slotsByDate.has(dateKey) });
  }

  return (
    <div>
      <div style={styles.stepLabel}>{stepLabel}</div>
      <h3 style={styles.title}>Pick a date &amp; time</h3>
      <p style={styles.timezoneNote}>All times shown in Pacific Time (San Diego, CA)</p>

      <div style={styles.monthNav}>
        <button onClick={prevMonth} disabled={!canPrev} style={{ ...styles.navButton, color: canPrev ? "var(--color-ink)" : "#dccfc6" }}>
          ‹
        </button>
        <div style={styles.monthLabel}>
          {MONTHS[viewMonth]} {viewYear}
        </div>
        <button onClick={nextMonth} disabled={!canNext} style={{ ...styles.navButton, color: canNext ? "var(--color-ink)" : "#dccfc6" }}>
          ›
        </button>
      </div>

      <div style={styles.weekRow}>
        {WEEKDAY_LABELS.map((l, i) => (
          <div key={i} style={styles.weekdayLabel}>
            {l}
          </div>
        ))}
      </div>
      <div style={styles.grid}>
        {Array.from({ length: startPad }, (_, i) => <div key={`b${i}`} />)}
        {cells.map((cell) => {
          const isSelected = cell.dateKey === selectedDateKey;
          return (
            <button
              key={cell.key}
              onClick={() => (cell.available ? setSelectedDateKey(cell.dateKey) : undefined)}
              style={{
                ...styles.dayCell,
                background: isSelected ? "var(--color-accent)" : cell.available ? "#fff" : "transparent",
                color: isSelected ? "#fff" : cell.available ? "var(--color-ink)" : "#d3c6bc",
                border: `1px solid ${isSelected ? "var(--color-accent)" : cell.available ? "var(--color-border-2)" : "transparent"}`,
                cursor: cell.available ? "pointer" : "default",
                fontWeight: isSelected ? 700 : cell.available ? 500 : 400,
              }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <button
        onClick={findNextAvailable}
        disabled={!hasMoreAvailable}
        style={{ ...styles.findNextButton, opacity: hasMoreAvailable ? 1 : 0.5, cursor: hasMoreAvailable ? "pointer" : "default" }}
      >
        {hasMoreAvailable ? (selectedDateKey ? "Find next available day" : "Find next available") : "No more availability in range"}
      </button>

      {!selectedDateKey ? (
        <div style={styles.emptyHint}>Select a date to see open times.</div>
      ) : daySlots.length === 0 ? (
        <div style={styles.noSlotsBox}>Fully booked that day. Try another date.</div>
      ) : (
        <div>
          <div style={styles.availableTimesLabel}>Available times</div>
          <div style={styles.slotGrid}>
            {daySlots.map((slot) => (
              <button key={slot.start_at} onClick={() => onSelectSlot(slot)} style={styles.slotButton}>
                {slot.savings > 0 ? <span style={styles.smartMatchBadge}>✦</span> : null}
                <span style={styles.slotTime}>{formatSlotTime(slot.start_at)}</span>
                <span style={styles.slotPrice}>{formatPrice(slot.price)}</span>
              </button>
            ))}
          </div>
          {daySlots.some((s) => s.savings > 0) ? (
            <div style={styles.smartMatchHint}>✦ Flexible pick — these openings unlock a Smart Match saving.</div>
          ) : null}
        </div>
      )}

      <button onClick={onBack} style={styles.backButton}>
        Back
      </button>
    </div>
  );
}

function LoadingState({ stepLabel }: { stepLabel: string }) {
  return (
    <div>
      <div style={styles.stepLabel}>{stepLabel}</div>
      <h3 style={styles.title}>Pick a date &amp; time</h3>
      <Spinner label="Finding available times…" />
    </div>
  );
}

function ErrorState({
  stepLabel,
  message,
  onRetry,
  onBack,
}: {
  stepLabel: string;
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div style={styles.stepLabel}>{stepLabel}</div>
      <h3 style={styles.title}>Pick a date &amp; time</h3>
      <div style={styles.noSlotsBox}>{message}</div>
      <button onClick={onRetry} style={styles.findNextButton}>
        Try again
      </button>
      <button onClick={onBack} style={styles.backButton}>
        Back
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  stepLabel: { fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600, marginTop: 6 },
  title: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: "6px 0 4px" },
  timezoneNote: { fontSize: 12, color: "var(--color-muted-2)", margin: "0 0 14px" },
  monthNav: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  navButton: { width: 34, height: 34, borderRadius: 9, border: "1px solid var(--color-border-2)", background: "#fff", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0 },
  monthLabel: { fontWeight: 600, fontSize: 15, color: "var(--color-ink)" },
  weekRow: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 5 },
  weekdayLabel: { textAlign: "center", fontSize: 11, color: "var(--color-muted-3)", fontWeight: 600 },
  grid: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 },
  dayCell: { height: 38, borderRadius: 9, fontSize: 13, padding: 0 },
  findNextButton: { width: "100%", marginTop: 12, border: "1px solid #d9c7bd", background: "#fff", color: "var(--color-accent)", fontSize: 13.5, fontWeight: 600, padding: 11, borderRadius: 10, cursor: "pointer" },
  emptyHint: { textAlign: "center", fontSize: 13, color: "var(--color-muted-3)", marginTop: 16 },
  noSlotsBox: { marginTop: 16, padding: 14, border: "1px dashed #cdaea6", borderRadius: 12, background: "#fbf3ef", textAlign: "center", fontSize: 13, color: "var(--color-muted)", lineHeight: 1.4 },
  availableTimesLabel: { fontSize: 13, fontWeight: 500, color: "var(--color-ink-soft)", margin: "16px 0 8px" },
  slotGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
  slotButton: { position: "relative", padding: "11px 4px", fontSize: 13, fontWeight: 500, borderRadius: 10, cursor: "pointer", border: "1px solid #e0cfc6", background: "#fff", color: "var(--color-ink)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  slotTime: { lineHeight: 1.2 },
  smartMatchBadge: {
    position: "absolute",
    top: -7,
    right: -7,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "var(--color-gold-text)",
    color: "#fff",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
  },
  slotPrice: { fontSize: 11, color: "var(--color-muted-2)" },
  smartMatchHint: { fontSize: 11, color: "var(--color-gold-text)", marginTop: 9, lineHeight: 1.4 },
  backButton: { width: "100%", marginTop: 9, border: "none", background: "none", color: "var(--color-muted-2)", fontSize: 14, padding: 8, cursor: "pointer" },
};
