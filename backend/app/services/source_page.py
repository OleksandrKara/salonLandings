"""Which page a PMU consultation was booked from, for the staff Telegram alert (owner request
2026-09-30: managers want to see e.g. "Permanent Lips" to guess what the client is after).

Both values come straight from the browser, so they're untrusted: the URL is only kept when it's
https on one of our own sites (otherwise anyone could post an arbitrary link into the staff chat),
query/fragment are dropped (no ad click ids or personal data in the chat), and the title is reduced
to one short plain line.
"""

import re
from urllib.parse import urlsplit, urlunsplit

ALLOWED_HOSTS = {
    "pmu-annakara.com",
    "www.pmu-annakara.com",
    "book.pmu-annakara.com",
    "pmu-preview.akluxnails.com",
}

_MAX_TITLE = 120
_MAX_CAMPAIGN = 100


def clean_source_page_url(url: str | None) -> str | None:
    if not url:
        return None
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return None
    if parts.scheme != "https" or (parts.hostname or "").lower() not in ALLOWED_HOSTS:
        return None
    return urlunsplit(("https", parts.netloc.lower(), parts.path or "/", "", ""))


def clean_one_line(text: str | None, max_length: int = _MAX_TITLE) -> str | None:
    if not text:
        return None
    line = re.sub(r"\s+", " ", re.sub(r"[\x00-\x1f\x7f]", " ", text)).strip()
    if not line:
        return None
    return line if len(line) <= max_length else line[: max_length - 1].rstrip() + "…"


def clean_ad_campaign(campaign: str | None) -> str | None:
    return clean_one_line(campaign, _MAX_CAMPAIGN)
