class SquareIntegrationError(Exception):
    """Raised when the Square API returns an error or an unexpected response shape."""

    def __init__(self, message: str, *, status_code: int = 502, detail: object | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.detail = detail


class SlotNoLongerAvailableError(SquareIntegrationError):
    """Raised when a booking attempt fails because Square rejected the requested slot."""

    def __init__(self, message: str = "This time slot is no longer available.", *, detail: object | None = None):
        super().__init__(message, status_code=409, detail=detail)
