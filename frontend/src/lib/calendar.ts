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

export function buildIcsDataUri(params: {
  title: string;
  startAt: string;
  durationMinutes: number;
  details: string;
  location: string;
}): string {
  const start = new Date(params.startAt);
  const end = new Date(start.getTime() + params.durationMinutes * 60_000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AKLUXNAILS//EN",
    "BEGIN:VEVENT",
    `UID:${floatingTimestamp(start)}@akluxnails`,
    `DTSTAMP:${floatingTimestamp(new Date())}`,
    `DTSTART:${floatingTimestamp(start)}`,
    `DTEND:${floatingTimestamp(end)}`,
    `SUMMARY:${params.title}`,
    `DESCRIPTION:${params.details}`,
    `LOCATION:${params.location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
