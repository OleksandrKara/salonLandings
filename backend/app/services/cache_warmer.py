"""Keeps the PMU booking popups' Square data warm (owner request 2026-10-07: opening "Book a
procedure" or "Book a consultation" took a second or more, and up to 3+ seconds whenever this
replica's 5-minute catalog cache had just expired; each blue/green replica has its own cache, so
that was most of the time).

Every few minutes, a little before the cache would expire, each replica re-reads business 2's
Square catalog, categories and team in place. Requests keep getting the previous copy while that
runs, so a visitor never waits on Square for the menu. Changes made in Square still show up within
the same ~5 minutes as before.
"""

from __future__ import annotations

import asyncio
import logging

from starlette.concurrency import run_in_threadpool

from app.api.deps import _catalog_repository_for, _team_repository_for
from app.core.config import get_settings
from app.integrations.square.credentials import get_square_credentials

logger = logging.getLogger(__name__)

WARM_BUSINESS_IDS = (2,)


def warm_once(business_id: int) -> None:
    settings = get_settings()
    ttl = settings.catalog_cache_seconds
    creds = get_square_credentials(business_id)
    _catalog_repository_for(business_id, ttl).refresh()
    _team_repository_for(business_id, creds.location_id, ttl).refresh()


async def run_forever() -> None:
    interval = max(60, int(get_settings().catalog_cache_seconds * 0.8))
    while True:
        for business_id in WARM_BUSINESS_IDS:
            try:
                await run_in_threadpool(warm_once, business_id)
            except Exception:
                # The request path still fetches on its own; nothing here is fatal.
                logger.warning("Booking cache warm-up failed for business %s", business_id, exc_info=True)
        await asyncio.sleep(interval)
