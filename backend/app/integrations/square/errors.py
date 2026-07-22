import httpx
from square.core.api_error import ApiError

# Every Square SDK call in this app can fail two structurally different ways: Square responded
# with a real error (ApiError — has a body Square sent back describing what went wrong), or the
# request never got a response at all (a timeout, a dropped connection, DNS failure — httpx.HTTPError,
# which ApiError never covers). Before this existed, only ApiError was caught at each call site, so
# a hung/failed connection (exactly what showed up as "Loading available times…" never resolving)
# escaped as an unhandled exception — a raw 500 — instead of the same clean SquareIntegrationError
# every other kind of Square failure already produces.
SQUARE_CALL_ERRORS = (ApiError, httpx.HTTPError)


def square_error_detail(exc: Exception) -> object | None:
    """Square's own error body, if this was an ApiError — None for a transport-level failure
    (timeout, connection refused, etc), which never has one."""
    return exc.body if isinstance(exc, ApiError) else None


def square_error_status_code(exc: Exception) -> int | None:
    """The HTTP status Square responded with, if this was an ApiError — None for a
    transport-level failure (timeout, connection refused, etc), which never got a response
    at all and so has no status code to check."""
    return exc.status_code if isinstance(exc, ApiError) else None
