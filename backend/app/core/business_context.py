"""Resolves which business a request belongs to, via salaryReview's internal API — see
docs/multi-tenant-akpmu-design.md. salonLandings has no visitor login (unlike salaryReview's own
session-based CurrentBusinessContext), so this resolves from the request's Host header instead,
with a short in-process cache so it never adds a real round trip to every request.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

import httpx
from fastapi import Request

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_DOMAIN_CACHE_TTL_SECONDS = 300


@dataclass(frozen=True)
class BusinessContext:
    id: int
    name: str
    timezone: str


# The one business every domain resolved to before this project's multi-tenant work — same
# precedent as salaryReview's own BusinessRepository#legacySmsBusiness. Used only when Host-based
# resolution can't run at all (internal API not configured — local dev, early CI) or genuinely
# fails (unrecognized domain, salaryReview unreachable), never as a "prefer this" default.
_LEGACY_BUSINESS = BusinessContext(id=1, name="AK.LUX.NAILS", timezone="America/Los_Angeles")

_domain_cache: dict[str, tuple[BusinessContext, float]] = {}


def resolve_business_by_domain(host: str) -> BusinessContext:
    cached = _domain_cache.get(host)
    if cached and cached[1] > time.monotonic():
        return cached[0]

    settings = get_settings()
    if not settings.internal_api_base_url or not settings.internal_api_key:
        return _LEGACY_BUSINESS

    try:
        with httpx.Client(timeout=3.0) as client:
            response = client.get(
                f"{settings.internal_api_base_url}/api/internal/businesses/by-domain",
                params={"domain": host},
                headers={"X-Internal-Api-Key": settings.internal_api_key},
            )
        if response.status_code == 200:
            data = response.json()
            business = BusinessContext(id=data["businessId"], name=data["name"], timezone=data["timezone"])
            _domain_cache[host] = (business, time.monotonic() + _DOMAIN_CACHE_TTL_SECONDS)
            return business
        if response.status_code != 404:
            response.raise_for_status()
    except httpx.HTTPError:
        logger.warning("Failed to resolve business for domain %r — falling back to legacy business", host, exc_info=True)

    # 404 (genuinely unrecognized domain) and a request failure land here the same way — same
    # "not configured yet" outcome either way (see InternalBusinessController's own doc on this).
    return _LEGACY_BUSINESS


def get_current_business(request: Request) -> BusinessContext:
    """FastAPI dependency — every business-scoped route/service factory chains off this."""
    host = (request.headers.get("host") or "").split(":")[0].strip().lower()
    return resolve_business_by_domain(host)
