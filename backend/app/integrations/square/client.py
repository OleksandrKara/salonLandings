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
    return Square(token=settings.square_access_token, environment=environment)
