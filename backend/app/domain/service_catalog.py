"""Mapping between landing-page cart items and Square catalog items.

Square's catalog has no native concept of "this item is the first-time-client
version of that item", so that relationship — and which variation name maps to
which artist tier — is configured here rather than hardcoded prices. Prices,
durations and team member assignments are always read live from Square so this
file only ever goes stale on structural catalog changes (new item added,
renamed), not on price changes.

The landing page lets a customer combine services into one appointment
(manicure + optional pedicure + optional nail-art design), matching the
Cloud Design's "Customize your visit" step. A separate "4-hand request" path
skips availability search entirely and maps to Square's own lead-capture
placeholder item, which the salon uses to call the customer back.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class ServiceOfferDefinition:
    """A tiered (Top Nail Artist / Nail Artist) service that can anchor an appointment."""

    slug: str
    name: str
    offer_label: str | None
    description: str | None
    first_time_item_id: str
    regular_price_item_id: str | None  # item whose matching-tier variation is shown as "regular price"
    is_first_time_offer: bool = True


@dataclass(frozen=True)
class FlatAddonDefinition:
    """A single-price add-on layered onto a tiered service (e.g. nail art)."""

    slug: str
    name: str
    description: str | None
    item_id: str
    requires_slug: str  # the ServiceOfferDefinition slug this add-on must be paired with


@dataclass(frozen=True)
class FourHandRequestDefinition:
    """A lead-capture-only path: no self-serve date/time, the salon calls back.

    Maps to a real Square catalog item built for exactly this purpose —
    'Request for 4-Hands Manicure & Pedicure Gel Overlay' — so the request
    still shows up as a booking on the salon's calendar.
    """

    slug: str
    name: str
    description: str
    item_id: str
    variation_id: str
    # Curated marketing figures, deliberately NOT read from Square — the real catalog price for
    # this item is genuinely $0 (call-for-pricing; final price is worked out on the follow-up
    # call). Shown instead of the $0/price_description on the landing page. display_compare_at_price
    # is optional so a future site using this same definition can drop the "before" price and just
    # show display_price flat, with no discount framing.
    display_price: float
    display_compare_at_price: float | None = None


SERVICE_OFFER_DEFINITIONS: list[ServiceOfferDefinition] = [
    ServiceOfferDefinition(
        slug="manicure",
        name="Russian Hard Gel Manicure",
        offer_label="First-Visit Special",
        description=(
            "Cuticle care, precision nail shaping, and a long-wearing hard gel overlay "
            "in one flawless color — no length change, no acrylic."
        ),
        first_time_item_id="OPNE2Z2QTZR2USBD7AUJRRYF",  # "1st Time Regular Manicure Gel-Overlay"
        regular_price_item_id="OCMEURM3ONES53H4TCHRY5BS",  # "Russian Gel-Overlay Manicure"
    ),
    ServiceOfferDefinition(
        slug="pedicure",
        name="Dry Russian Pedicure",
        offer_label="First-Visit Special",
        description="Dry European technique — no water soak — finished with a durable hard gel overlay.",
        first_time_item_id="QSJQCUYORMRDKQH4BTDUERIP",  # "1st Time-Client Pedicure Gel-Overlay"
        regular_price_item_id="MS7R7N3RWRJUT3U6MT2GL5W2",  # "Regular Pedicure Gel-Overlay"
    ),
]

FLAT_ADDON_DEFINITIONS: list[FlatAddonDefinition] = [
    FlatAddonDefinition(
        slug="design",
        name="Nail Art / Design",
        description="Price depends on design complexity, starting from $20.",
        item_id="7RJJPUA5OTN5LL33J2CL3G6M",  # "Design"
        requires_slug="manicure",
    ),
]

FOUR_HAND_REQUEST = FourHandRequestDefinition(
    slug="four-hand-request",
    name="4-Hand Service",
    description=(
        "Two nail techs work at once — get mani + pedi together, or finish twice as fast. "
        "We'll call you to schedule the date, time & final pricing."
    ),
    item_id="HOQVAY5LVBH65RJHISMHLQVF",  # "Request for 4-Hands Manicure & Pedicure Gel Overlay"
    variation_id="NUEKRALUQ5TSZZGP346BCL4Y",
    display_price=254.00,  # $299 - 15%, matching the same figure shown on akluxnails-home
    display_compare_at_price=299.00,
)


def is_top_tier_variation_name(variation_name: str) -> bool:
    return "top" in variation_name.strip().lower()
