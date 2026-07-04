"""Mapping between landing-page service offers and Square catalog items.

Square's catalog has no native concept of "this item is the first-time-client
version of that item", so that relationship — and which variation name maps to
which artist tier — is configured here rather than hardcoded prices. Prices,
durations and team member assignments are always read live from Square so this
file only ever goes stale on structural catalog changes (new item added,
renamed), not on price changes.

To add a new landing-page offer: add an entry to SERVICE_OFFER_DEFINITIONS with
the Square item id for the first-time-client item and the item id for its
full-price counterpart used for the "regular price" strike-through.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class ServiceOfferDefinition:
    slug: str
    name: str
    offer_label: str | None
    description: str | None
    first_time_item_id: str
    regular_price_item_id: str | None  # item whose matching-tier variation is shown as "regular price"
    is_first_time_offer: bool = True


SERVICE_OFFER_DEFINITIONS: list[ServiceOfferDefinition] = [
    ServiceOfferDefinition(
        slug="first-time-manicure",
        name="Russian Manicure Gel Overlay",
        offer_label="First-Time Client Special",
        description=(
            "Cuticle care, precision nail shaping, and a long-wearing hard gel overlay "
            "in one flawless color — no length change."
        ),
        first_time_item_id="OPNE2Z2QTZR2USBD7AUJRRYF",  # "1st Time Regular Manicure Gel-Overlay"
        regular_price_item_id="OCMEURM3ONES53H4TCHRY5BS",  # "Regular Manicure Gel-Overlay"
    ),
    ServiceOfferDefinition(
        slug="first-time-pedicure",
        name="Pedicure Gel Overlay",
        offer_label="First-Time Client Special",
        description=(
            "A full pedicure with cuticle care and a durable hard gel overlay finish "
            "that keeps your color chip-free for weeks."
        ),
        first_time_item_id="QSJQCUYORMRDKQH4BTDUERIP",  # "1st Time-Client Pedicure Gel-Overlay"
        regular_price_item_id="MS7R7N3RWRJUT3U6MT2GL5W2",  # "Regular Pedicure Gel-Overlay"
    ),
]


def is_top_tier_variation_name(variation_name: str) -> bool:
    return "top" in variation_name.strip().lower()
