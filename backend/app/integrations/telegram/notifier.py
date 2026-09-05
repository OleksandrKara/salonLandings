import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def notify_four_hand_request(
    *,
    source: str,
    customer_name: str,
    phone_number: str,
    requested_services: str | None,
    preferred_start_at: str,
    note: str | None,
    estimated_price: float | None = None,
) -> bool:
    """Best-effort Telegram alert for a new 4-hand lead, relayed through salaryReview (which owns
    the bot token — this app never holds it). Never raises: a relay outage or missing/invalid
    config must never block lead capture, matching verify_turnstile's fail-open convention.
    """
    settings = get_settings()
    if not settings.internal_api_base_url or not settings.internal_api_key:
        logger.info("4-hand Telegram alert skipped — internal API not configured")
        return False

    payload = {
        "source": source,
        "customerName": customer_name,
        "phoneNumber": phone_number,
        "requestedServices": requested_services,
        "preferredStartAt": preferred_start_at,
        "note": note,
        "estimatedPrice": estimated_price,
    }
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.post(
                f"{settings.internal_api_base_url}/api/internal/notifications/four-hand-request",
                json=payload,
                headers={"X-Internal-Api-Key": settings.internal_api_key},
            )
            response.raise_for_status()
            return bool(response.json().get("sent"))
    except httpx.HTTPError:
        logger.exception("4-hand Telegram alert request failed (lead capture unaffected)")
        return False


def notify_payment_failed(
    *,
    business_id: int,
    customer_name: str | None,
    phone_number: str | None,
    service_name: str,
    amount: float | None,
    error_message: str,
    error_code: str | None,
    client_error: bool,
) -> bool:
    """Best-effort Telegram alert the moment a customer-entered card fails to charge — relayed
    through salaryReview (which owns the bot token and per-business chat config; this app never
    holds either). Never raises: the caller has already handled the real payment failure by the
    time this runs (see PmuBookingService.book_with_deposit's own except block, which cancels the
    reservation first) — a relay outage here must never turn into a second error surfaced to the
    customer, matching notify_four_hand_request's fail-open convention.
    """
    settings = get_settings()
    if not settings.internal_api_base_url or not settings.internal_api_key:
        logger.info("Payment-failed Telegram alert skipped — internal API not configured")
        return False

    payload = {
        "businessId": business_id,
        "customerName": customer_name,
        "phoneNumber": phone_number,
        "serviceName": service_name,
        "amount": amount,
        "errorMessage": error_message,
        "errorCode": error_code,
        "clientError": client_error,
    }
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.post(
                f"{settings.internal_api_base_url}/api/internal/notifications/payment-failed",
                json=payload,
                headers={"X-Internal-Api-Key": settings.internal_api_key},
            )
            response.raise_for_status()
            return bool(response.json().get("sent"))
    except httpx.HTTPError:
        logger.exception("Payment-failed Telegram alert request failed (caller unaffected)")
        return False
