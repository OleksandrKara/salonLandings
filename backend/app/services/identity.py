"""Server-side fallback for visitor identity and A/B variant assignment.

The client persists both in localStorage (see frontend lib/visitorId.ts and lib/experiments.ts)
and sends them on every call. That's normally fine, but Instagram/Facebook's in-app browser (and
Safari's tracking-protection heuristics around fbclid-tagged links) are known to reset localStorage
mid-session — the visitor keeps browsing and can still complete a real booking, but the browser
mints a brand-new visitor id and loses the variant assignment partway through, splitting one
person's activity across two identities and orphaning their contact/booking from the variant that
should get credit for it.

A server-set cookie doesn't rely on the same script-writable storage and survives that reset. It
is established from whatever the client sends the first time there's no cookie yet (so a genuinely
new visitor's id is whatever their browser already generated), and wins on every later call for
this browser — healing the split instead of only papering over its symptom.
"""

import json
import uuid

from fastapi import Request, Response

from app.domain.schemas import BookingFunnelStepEvent, TrackingEvent, TrackingSnapshot

VISITOR_COOKIE = "mani_vid"
VARIANT_COOKIE = "mani_variant"
COOKIE_MAX_AGE = 400 * 24 * 3600  # ~400 days — matches browsers' own cap on cookie lifetime


def _set_cookie(response: Response, name: str, value: str) -> None:
    response.set_cookie(name, value, max_age=COOKIE_MAX_AGE, httponly=True, secure=True, samesite="lax", path="/")


def resolve_visitor_id(request: Request, response: Response, client_visitor_id: str | None) -> str:
    cookie_vid = request.cookies.get(VISITOR_COOKIE)
    if cookie_vid:
        return cookie_vid
    resolved = client_visitor_id or str(uuid.uuid4())
    _set_cookie(response, VISITOR_COOKIE, resolved)
    return resolved


def resolve_variant_assignment(
    request: Request,
    response: Response,
    client_landing_page_id: str | None,
    client_variant_id: str | None,
) -> tuple[str | None, str | None]:
    # A fresh assignment from the client is trusted and (re-)cached — covers both "first time
    # seeing this browser" and "the experiment legitimately re-resolved to something new".
    if client_landing_page_id and client_variant_id:
        _set_cookie(
            response,
            VARIANT_COOKIE,
            json.dumps({"landing_page_id": client_landing_page_id, "variant_id": client_variant_id}),
        )
        return client_landing_page_id, client_variant_id

    cookie_raw = request.cookies.get(VARIANT_COOKIE)
    if not cookie_raw:
        return client_landing_page_id, client_variant_id  # both None — nothing to fall back to
    try:
        cached = json.loads(cookie_raw)
        return cached.get("landing_page_id"), cached.get("variant_id")
    except (json.JSONDecodeError, AttributeError):
        return client_landing_page_id, client_variant_id


def resolve_tracking_snapshot(
    request: Request, response: Response, snapshot: TrackingSnapshot | None
) -> TrackingSnapshot | None:
    """Overrides visitor_id/landing_page_id/variant_id on a client-supplied snapshot with the
    cookie-backed values, healing a localStorage split for this call. None in, None out — a
    missing snapshot has nothing to attribute, same as before this existed.
    """
    if snapshot is None:
        return None
    resolved_vid = resolve_visitor_id(request, response, snapshot.visitor_id)
    resolved_lpid, resolved_variant = resolve_variant_assignment(
        request, response, snapshot.landing_page_id, snapshot.variant_id
    )
    return snapshot.model_copy(
        update={"visitor_id": resolved_vid, "landing_page_id": resolved_lpid, "variant_id": resolved_variant}
    )


def resolve_tracking_event(request: Request, response: Response, event: TrackingEvent) -> TrackingEvent:
    resolved_vid = resolve_visitor_id(request, response, event.session_id)
    resolved_lpid, resolved_variant = resolve_variant_assignment(
        request, response, event.landing_page_id, event.variant_id
    )
    return event.model_copy(
        update={"session_id": resolved_vid, "landing_page_id": resolved_lpid, "variant_id": resolved_variant}
    )


def resolve_booking_funnel_step_event(
    request: Request, response: Response, event: BookingFunnelStepEvent
) -> BookingFunnelStepEvent:
    resolved_vid = resolve_visitor_id(request, response, event.session_id)
    resolved_lpid, resolved_variant = resolve_variant_assignment(
        request, response, event.landing_page_id, event.variant_id
    )
    return event.model_copy(
        update={"session_id": resolved_vid, "landing_page_id": resolved_lpid, "variant_id": resolved_variant}
    )
