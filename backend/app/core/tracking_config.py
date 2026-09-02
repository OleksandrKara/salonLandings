"""Resolves this site's Microsoft Clarity project id via salaryReview's internal API — same
domain-keyed lookup shape and in-process caching as business_context.resolve_business_by_domain,
but hitting tracking-config (keyed by hostname) rather than businesses/by-domain (keyed by
business). Kept as its own module since the two are unrelated lookups that happen to share a
resolution pattern, not a single concept.
"""

from __future__ import annotations

import logging
import time

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_DOMAIN_CACHE_TTL_SECONDS = 300

_clarity_cache: dict[str, tuple[str | None, float]] = {}


def resolve_clarity_project_id(host: str) -> str | None:
    cached = _clarity_cache.get(host)
    if cached and cached[1] > time.monotonic():
        return cached[0]

    settings = get_settings()
    if not settings.internal_api_base_url or not settings.internal_api_key:
        return None

    project_id: str | None = None
    try:
        with httpx.Client(timeout=3.0) as client:
            response = client.get(
                f"{settings.internal_api_base_url}/api/internal/tracking-config",
                params={"domain": host},
                headers={"X-Internal-Api-Key": settings.internal_api_key},
            )
        if response.status_code == 200:
            project_id = response.json().get("clarityProjectId")
        elif response.status_code != 404:
            response.raise_for_status()
    except httpx.HTTPError:
        logger.warning("Failed to resolve Clarity config for domain %r", host, exc_info=True)
        return None

    _clarity_cache[host] = (project_id, time.monotonic() + _DOMAIN_CACHE_TTL_SECONDS)
    return project_id
