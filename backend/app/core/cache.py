import time
from collections.abc import Callable
from typing import Generic, TypeVar

T = TypeVar("T")


class TTLCache(Generic[T]):
    """Minimal in-process TTL cache for a single cached value.

    Square catalog/business-profile data changes rarely; this avoids hitting
    the Square API on every request without needing a database or Redis.
    """

    def __init__(self, ttl_seconds: float):
        self._ttl_seconds = ttl_seconds
        self._value: T | None = None
        self._fetched_at: float = 0.0

    def get_or_fetch(self, fetch: Callable[[], T]) -> T:
        now = time.monotonic()
        if self._value is None or (now - self._fetched_at) > self._ttl_seconds:
            self._value = fetch()
            self._fetched_at = now
        return self._value

    def invalidate(self) -> None:
        self._value = None
