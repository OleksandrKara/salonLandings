import datetime as dt

from fastapi import APIRouter, Query
from fastapi.responses import Response

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


def _escape_ics_text(value: str) -> str:
    """RFC 5545 TEXT escaping — backslash, comma, semicolon, and newline are all structurally
    significant in an .ics value and must be backslash-escaped or a calendar app can misparse
    (or simply reject) the file. None of our current callers pass values containing these, but a
    service/artist/address name is free text an owner can edit, so this isn't purely defensive."""
    return (
        value.replace("\\", "\\\\")
        .replace(",", "\\,")
        .replace(";", "\\;")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
    )


def _ics_timestamp(value: dt.datetime) -> str:
    return value.astimezone(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")


@router.get("/event.ics")
async def event_ics(
    title: str = Query(...),
    start: str = Query(..., description="ISO 8601 instant, e.g. 2026-09-15T17:15:00Z"),
    duration_minutes: int = Query(60, ge=1, le=24 * 60),
    details: str = Query(""),
    location: str = Query(""),
) -> Response:
    """Serves a single VEVENT as a real HTTP response with a text/calendar content type — the
    "Add to Apple Calendar" link on both mani's and PMU's booking-confirmation screens points here
    directly (a plain <a href>, no download attribute) instead of a data: URI.

    Found live 2026-08-23: the previous approach (frontend/src/lib/calendar.ts's buildIcsDataUri,
    rendered as <a href={dataUri} download="appointment.ics">) silently did nothing on iOS Safari
    — a real customer tapped it and got no calendar prompt, no download, nothing. iOS Safari has
    never supported the download attribute, and doesn't reliably handle data: URI navigation
    either; the one approach that actually works there is navigating straight to a URL that
    responds with Content-Type: text/calendar, which is exactly what triggers Safari's native
    "Add to Calendar" sheet. buildIcsDataUri/buildGoogleCalendarLink still build the *content* of
    the event client-side (so this endpoint doesn't need to know anything about a specific
    booking) — only the delivery mechanism changed, from a same-document data: URI to a real
    server round trip.
    """
    start_at = dt.datetime.fromisoformat(start.replace("Z", "+00:00"))
    end_at = start_at + dt.timedelta(minutes=duration_minutes)
    now = dt.datetime.now(dt.timezone.utc)

    ics = "\r\n".join(
        [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//AKLUXNAILS//EN",
            "BEGIN:VEVENT",
            f"UID:{_ics_timestamp(start_at)}@akluxnails",
            f"DTSTAMP:{_ics_timestamp(now)}",
            f"DTSTART:{_ics_timestamp(start_at)}",
            f"DTEND:{_ics_timestamp(end_at)}",
            f"SUMMARY:{_escape_ics_text(title)}",
            f"DESCRIPTION:{_escape_ics_text(details)}",
            f"LOCATION:{_escape_ics_text(location)}",
            "END:VEVENT",
            "END:VCALENDAR",
            "",
        ]
    )
    return Response(
        content=ics,
        media_type="text/calendar; charset=utf-8",
        # Deliberately no Content-Disposition: attachment — that pushes iOS Safari toward treating
        # this as a file download instead of recognizing the calendar content type and offering
        # its native "Add to Calendar" sheet, the whole reason this endpoint exists.
        headers={"Content-Disposition": 'inline; filename="appointment.ics"'},
    )
