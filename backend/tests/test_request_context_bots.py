from types import SimpleNamespace

from app.services.request_context import is_bot_request


def _req(ua: str):
    return SimpleNamespace(headers={"user-agent": ua})


def test_crawlers_are_not_recorded_as_visits():
    assert is_bot_request(_req("AdsBot-Google (+http://www.google.com/adsbot.html)"))
    assert is_bot_request(_req("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"))
    assert is_bot_request(_req("curl/8.0"))


def test_real_browsers_are_recorded():
    assert not is_bot_request(_req(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"))
    assert not is_bot_request(_req(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"))


def test_self_declared_scanners_are_not_recorded():
    # Seen in akluxnails.com marketing.visits, 2026-10-12.
    for ua in (
        "Software Security Research/1.0 (+https://goose.softsec.ruhr-uni-bochum.de)",
        "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
        "Hello from Palo Alto Networks, find out more about our scans in https://docs-cortex.paloaltonetworks.com/",
        "Mozilla/5.0 (compatible; CensysInspect/1.1; +https://about.censys.io/)",
        "Mozilla/5.0 zgrab/0.x",
        "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        "Mozilla/5.0",
        "Mozilla/5.0 (compatible)",
    ):
        assert is_bot_request(_req(ua)), ua
