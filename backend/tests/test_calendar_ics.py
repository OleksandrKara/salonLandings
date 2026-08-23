import asyncio
import datetime as dt

from app.api.routes.calendar import _escape_ics_text, event_ics


def test_escapes_rfc5545_special_characters():
    # Backslash, comma, and semicolon are structurally significant in an .ics TEXT value — an
    # unescaped one can make a calendar app misparse or reject the whole file. A period isn't
    # special and is left alone.
    assert _escape_ics_text("Suite 4B, Ste. 2\\Apt") == "Suite 4B\\, Ste. 2\\\\Apt"
    assert _escape_ics_text("Line one\nLine two") == "Line one\\nLine two"
    assert _escape_ics_text("Owner; Family") == "Owner\\; Family"


def test_event_ics_response_is_a_direct_calendar_response_not_a_download():
    # No Content-Disposition: attachment — that's what pushes iOS Safari toward a file download
    # instead of recognizing text/calendar and offering its native "Add to Calendar" sheet, the
    # whole reason this endpoint exists (found live 2026-08-23: the old data: URI + download
    # attribute approach silently did nothing on a real iPhone).
    response = asyncio.run(event_ics(
        title="AK.LUX.NAILS — Gel Manicure",
        start="2026-09-15T17:15:00Z",
        duration_minutes=60,
        details="Please arrive 5 minutes early.",
        location="1357 Seventh Ave, Ste C, San Diego, CA 92101",
    ))

    assert response.media_type == "text/calendar; charset=utf-8"
    assert response.headers["content-disposition"] == 'inline; filename="appointment.ics"'
    body = response.body.decode("utf-8")
    assert "BEGIN:VEVENT" in body
    assert "SUMMARY:AK.LUX.NAILS — Gel Manicure" in body
    assert "DTSTART:20260915T171500Z" in body
    assert "DTEND:20260915T181500Z" in body  # +60 minutes
    assert "LOCATION:1357 Seventh Ave\\, Ste C\\, San Diego\\, CA 92101" in body


def test_event_ics_dtstamp_reflects_generation_time_not_the_appointment():
    response = asyncio.run(event_ics(
        title="Test", start="2026-09-15T17:15:00Z", duration_minutes=30, details="", location="",
    ))
    body = response.body.decode("utf-8")
    dtstamp_line = next(line for line in body.splitlines() if line.startswith("DTSTAMP:"))
    dtstamp = dt.datetime.strptime(dtstamp_line.removeprefix("DTSTAMP:"), "%Y%m%dT%H%M%SZ")
    assert (dt.datetime.utcnow() - dtstamp) < dt.timedelta(minutes=1)
