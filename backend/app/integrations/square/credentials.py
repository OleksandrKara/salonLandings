"""Per-business Square credentials, fetched from salaryReview's internal API — see
docs/multi-tenant-akpmu-design.md. Cached in-process per business id; the decrypted access token
is never logged.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_CREDENTIALS_CACHE_TTL_SECONDS = 600


@dataclass(frozen=True)
class SquareCredentials:
    access_token: str
    location_id: str
    environment: str  # "SANDBOX" | "PRODUCTION"


class SquareCredentialsUnavailable(RuntimeError):
    """This business hasn't connected Square yet (or doesn't exist)."""


_credentials_cache: dict[int, tuple[SquareCredentials, float]] = {}


def get_square_credentials(business_id: int) -> SquareCredentials:
    cached = _credentials_cache.get(business_id)
    if cached and cached[1] > time.monotonic():
        return cached[0]

    settings = get_settings()
    if not settings.internal_api_base_url or not settings.internal_api_key:
        # Legacy single-tenant fallback — the same env-var-configured credentials this app has
        # always used, for local dev or any deployment that hasn't wired up the internal API yet.
        creds = SquareCredentials(
            access_token=settings.square_access_token,
            location_id=settings.square_location_id,
            environment=settings.square_environment.upper(),
        )
        _credentials_cache[business_id] = (creds, time.monotonic() + _CREDENTIALS_CACHE_TTL_SECONDS)
        return creds

    with httpx.Client(timeout=3.0) as client:
        response = client.get(
            f"{settings.internal_api_base_url}/api/internal/businesses/{business_id}/square-credentials",
            headers={"X-Internal-Api-Key": settings.internal_api_key},
        )
    if response.status_code == 404:
        raise SquareCredentialsUnavailable(f"Business {business_id} has not connected Square yet")
    response.raise_for_status()
    data = response.json()
    creds = SquareCredentials(
        access_token=data["accessToken"], location_id=data["locationId"], environment=data["environment"]
    )
    _credentials_cache[business_id] = (creds, time.monotonic() + _CREDENTIALS_CACHE_TTL_SECONDS)
    return creds
