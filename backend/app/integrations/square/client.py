from functools import lru_cache

from square import Square
from square.environment import SquareEnvironment

from app.integrations.square.credentials import get_square_credentials


@lru_cache
def get_square_client(business_id: int) -> Square:
    """Square SDK client for one business, built from its credentials (see
    app.integrations.square.credentials — resolved via salaryReview's internal API, or the legacy
    env-var fallback for local dev/pre-multi-tenant deployments).

    lru_cache keys on business_id, so this is effectively one singleton per business — same
    "reuse the SDK's underlying httpx client across requests" reasoning as before, just no longer
    a single global instance. Note: credentials are fetched once per business_id here and then
    baked into this cached client for the process lifetime — a Square reconnect for a business
    (new token/location) needs a process restart to take effect, same limitation the previous
    single-tenant version already had for the one business that existed.
    """
    creds = get_square_credentials(business_id)
    environment = SquareEnvironment.PRODUCTION if creds.environment == "PRODUCTION" else SquareEnvironment.SANDBOX
    # The SDK's own default (60s) means a single slow/unresponsive Square call could tie up a
    # request for a full minute — a visitor staring at a loading spinner that long is as good as
    # broken. A shorter timeout fails faster, so it actually surfaces as an error the frontend's
    # own timeout/retry handling (see akluxnails-home/lib/fetchWithTimeout.ts and salonLandings/
    # frontend/src/api/client.ts) can act on, instead of both sides racing toward their own limit.
    return Square(token=creds.access_token, environment=environment, timeout=15.0)
