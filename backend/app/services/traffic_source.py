from urllib.parse import urlparse

from app.domain.schemas import TrackingSnapshot


def classify_traffic_source(tracking: TrackingSnapshot | None) -> str:
    """Human-readable attribution label for the Square Dashboard, from whatever
    the client's getTrackingSnapshot() resolved: a fresh UTM-tagged visit takes
    priority, falling back to a paid-click id, then the referrer, then "Direct".
    """
    if tracking is None:
        return "Direct / Unknown"

    if tracking.utm_source:
        parts = [tracking.utm_source]
        if tracking.utm_medium:
            parts.append(tracking.utm_medium)
        if tracking.utm_campaign:
            parts.append(tracking.utm_campaign)
        return " / ".join(parts)

    if tracking.fbclid:
        return "Meta Ads (click)"
    if tracking.gclid:
        return "Google Ads (click)"

    referrer = (tracking.referrer or "").lower()
    if not referrer:
        return "Direct / No referrer"
    if "google." in referrer:
        return "Google (organic)"
    if "instagram.com" in referrer:
        return "Instagram (organic)"
    if "facebook.com" in referrer or "fb.com" in referrer:
        return "Facebook (organic)"
    if "bing." in referrer:
        return "Bing (organic)"
    if "yahoo." in referrer:
        return "Yahoo (organic)"

    domain = urlparse(tracking.referrer).netloc if tracking.referrer else None
    return f"Referral: {domain}" if domain else "Direct / Unknown"
