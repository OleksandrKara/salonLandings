import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def verify_turnstile(token: str | None, remote_ip: str | None) -> bool:
    """True if Cloudflare confirms this is a real browser. Fails open (returns True) in two
    cases only: Turnstile isn't configured yet (no Cloudflare account set up), or the
    siteverify call itself couldn't be reached — a rare Cloudflare-side outage must not block
    every real booking, and the rate-limit/honeypot/timing checks still apply regardless.
    Returns False for an explicit failed verification (missing/invalid token) or a genuinely
    bad response — that's the one case that should actually block.
    """
    settings = get_settings()
    if not settings.turnstile_secret_key:
        logger.warning("Turnstile not configured (TURNSTILE_SECRET_KEY unset) — skipping verification")
        return True
    if not token:
        return False

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                SITEVERIFY_URL,
                data={"secret": settings.turnstile_secret_key, "response": token, "remoteip": remote_ip or ""},
            )
            response.raise_for_status()
            return bool(response.json().get("success"))
    except httpx.HTTPError:
        logger.exception("Turnstile siteverify request failed — failing open (other guards still apply)")
        return True
