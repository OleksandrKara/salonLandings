import re

from fastapi import Request
from user_agents import parse as parse_user_agent

# Matches the tool/scraper signatures actually observed hammering the akluxnails-home landing
# page (see salaryReview's investigation into its inflated visitor counts) — not a generic
# "bot"/"crawler" match (the `user_agents` library's own `is_bot` only catches self-identifying
# bots like FlowIQLabsBot below; it does NOT flag Wget, curl, or headless-Chrome scrapers, which
# were empirically checked and confirmed to slip past it). Deliberately excludes real search
# engine crawlers (Googlebot, Bingbot, etc.) — these landing pages want to stay indexable.
_BOT_USER_AGENT_PATTERN = re.compile(
    r"^Wget|^curl/|HeadlessChrome|python-requests|Go-http-client|FlowIQLabsBot", re.IGNORECASE
)


def is_bot_request(request: Request) -> bool:
    """True for traffic that should never be recorded as a real visit/event — see
    _BOT_USER_AGENT_PATTERN. Checked independently of derive_client_context so tracking routes can
    skip the DB write entirely rather than just labeling the row.
    """
    ua_string = request.headers.get("user-agent", "")
    return bool(_BOT_USER_AGENT_PATTERN.search(ua_string))


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
