from urllib.parse import urlparse

from app.domain.schemas import TrackingSnapshot


def classify_traffic_source(tracking: TrackingSnapshot | None) -> str:
    """Human-readable attribution label for the Square Dashboard.

    A paid-click id (fbclid/gclid) always wins the "is this a paid ad?" call, even
    when UTM params are also present — Meta/Google only ever attach that id to a real
    ad click, never to a manually-shared or organic link, so it's the one reliable
    paid/organic signal. Real Meta ad clicks come through with fbclid AND a full UTM
    set (e.g. utm_source=ig, utm_medium=Instagram_Stories) at the same time, so
    checking UTM first — as this used to — misclassified genuine ad clicks as plain
    "ig / Instagram_Stories / <campaign>", indistinguishable from an organic,
    manually-tagged link and invisible to anything matching on the "Meta/Google Ads"
    label (e.g. salaryReview's ads-attributed-revenue view).

    The UTM breakdown is still folded in when present, since it's genuinely useful
    detail (which placement/campaign) — just nested inside the "Meta Ads"/"Google Ads"
    label instead of replacing it, so both signals ride together in one string and
    a simple prefix match ("Meta Ads%"/"Google Ads%") reliably finds every paid click.
    """
    if tracking is None:
        return "Direct / Unknown"

    utm_detail = None
    if tracking.utm_source:
        parts = [tracking.utm_source]
        if tracking.utm_medium:
            parts.append(tracking.utm_medium)
        if tracking.utm_campaign:
            parts.append(tracking.utm_campaign)
        utm_detail = " / ".join(parts)

    if tracking.fbclid:
        return f"Meta Ads ({utm_detail})" if utm_detail else "Meta Ads (click)"
    if tracking.gclid:
        return f"Google Ads ({utm_detail})" if utm_detail else "Google Ads (click)"

    if utm_detail:
        return utm_detail

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
