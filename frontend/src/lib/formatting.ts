const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return currencyFormatter.format(amount);
}

// Appointments are location-bound, so always show the salon's local time
// (America/Los_Angeles) rather than the visitor's device timezone — otherwise
// someone browsing while traveling would see the wrong slot times.
const SALON_TIME_ZONE = "America/Los_Angeles";

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: SALON_TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: SALON_TIME_ZONE,
});

export function formatSlotDay(isoStart: string): string {
  return dayFormatter.format(new Date(isoStart));
}

// en-CA locale formats as YYYY-MM-DD, convenient as a calendar grouping key.
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: SALON_TIME_ZONE,
});

export function toPacificDateKey(isoStart: string): string {
  return dateKeyFormatter.format(new Date(isoStart));
}

export function groupSlotsByDateKey<T extends { start_at: string }>(slots: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const slot of slots) {
    const key = toPacificDateKey(slot.start_at);
    const existing = groups.get(key);
    if (existing) {
      existing.push(slot);
    } else {
      groups.set(key, [slot]);
    }
  }
  return groups;
}

export function formatSlotTime(isoStart: string): string {
  return timeFormatter.format(new Date(isoStart));
}

/** "Today, 2:30 PM" / "Tomorrow, 10:00 AM" / "Thu, Jul 25, 2:30 PM" — for the ContactStep's
 * next-available-slot teaser, compared against the salon's own Pacific "today" (not the
 * visitor's device date, which can disagree near midnight). */
export function formatNextAvailableLabel(isoStart: string): string {
  const slotKey = toPacificDateKey(isoStart);
  const now = new Date();
  const todayKey = dateKeyFormatter.format(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = dateKeyFormatter.format(tomorrow);
  const time = formatSlotTime(isoStart);
  if (slotKey === todayKey) return `Today, ${time}`;
  if (slotKey === tomorrowKey) return `Tomorrow, ${time}`;
  return `${formatSlotDay(isoStart)}, ${time}`;
}

export function groupSlotsByDay<T extends { start_at: string }>(slots: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const slot of slots) {
    const key = formatSlotDay(slot.start_at);
    const existing = groups.get(key);
    if (existing) {
      existing.push(slot);
    } else {
      groups.set(key, [slot]);
    }
  }
  return groups;
}
