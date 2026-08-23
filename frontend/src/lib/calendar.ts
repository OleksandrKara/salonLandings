function floatingTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

export function buildGoogleCalendarLink(params: {
  title: string;
  startAt: string;
  durationMinutes: number;
  details: string;
  location: string;
}): string {
  const start = new Date(params.startAt);
  const end = new Date(start.getTime() + params.durationMinutes * 60_000);
  const search = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${floatingTimestamp(start)}/${floatingTimestamp(end)}`,
    details: params.details,
    location: params.location,
  });
  return `https://calendar.google.com/calendar/render?${search.toString()}`;
}

/** A same-origin URL to the backend's /api/calendar/event.ics — the "Add to Apple Calendar" link
 * navigates straight here (a plain <a href>, no download attribute). iOS Safari has never
 * supported the download attribute and doesn't reliably handle data: URI navigation either; the
 * one approach that actually works there is navigating to a URL that responds with
 * Content-Type: text/calendar, which is what triggers Safari's native "Add to Calendar" sheet.
 * Replaces the old buildIcsDataUri, which silently did nothing when tapped on a real iPhone
 * (found live 2026-08-23) — see backend/app/api/routes/calendar.py's own doc comment. */
export function buildIcsUrl(params: {
  title: string;
  startAt: string;
  durationMinutes: number;
  details: string;
  location: string;
}): string {
  const search = new URLSearchParams({
    title: params.title,
    start: params.startAt,
    duration_minutes: String(params.durationMinutes),
    details: params.details,
    location: params.location,
  });
  return `/api/calendar/event.ics?${search.toString()}`;
}
