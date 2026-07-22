from functools import lru_cache

from square import Square
from square.environment import SquareEnvironment

from app.core.config import get_settings


@lru_cache
def get_square_client() -> Square:
    """Singleton Square SDK client, built from environment configuration.

    Cached for the lifetime of the process — the SDK's underlying httpx client
    is safe to reuse across requests.
    """
    settings = get_settings()
    environment = (
        SquareEnvironment.PRODUCTION
        if settings.square_environment.lower() == "production"
        else SquareEnvironment.SANDBOX
    )
    # The SDK's own default (60s) means a single slow/unresponsive Square call could tie up a
    # request for a full minute — a visitor staring at a loading spinner that long is as good as
    # broken. A shorter timeout fails faster, so it actually surfaces as an error the frontend's
    # own timeout/retry handling (see akluxnails-home/lib/fetchWithTimeout.ts and salonLandings/
    # frontend/src/api/client.ts) can act on, instead of both sides racing toward their own limit.
    return Square(token=settings.square_access_token, environment=environment, timeout=15.0)
