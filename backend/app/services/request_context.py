from fastapi import Request
from user_agents import parse as parse_user_agent


def derive_client_context(request: Request) -> dict:
    """Device/OS/browser/IP derived from the raw HTTP request — more
    reliable than trusting anything the client claims about itself.
    """
    ua_string = request.headers.get("user-agent", "")
    ua = parse_user_agent(ua_string)

    if ua.is_bot:
        device_type = "bot"
    elif ua.is_mobile:
        device_type = "mobile"
    elif ua.is_tablet:
        device_type = "tablet"
    elif ua.is_pc:
        device_type = "desktop"
    else:
        device_type = "unknown"

    forwarded_for = request.headers.get("x-forwarded-for")
    ip_address = forwarded_for.split(",")[0].strip() if forwarded_for else (request.client.host if request.client else None)

    return {
        "user_agent": ua_string or None,
        "device_type": device_type,
        "os_name": ua.os.family or None,
        "os_version": ua.os.version_string or None,
        "browser_name": ua.browser.family or None,
        "browser_version": ua.browser.version_string or None,
        "ip_address": ip_address,
    }
