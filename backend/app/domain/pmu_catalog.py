"""Mapping between the AK PMU landing page's booking flow and Square catalog items —
see docs/multi-tenant-akpmu-design.md and the "PMU deposit-first flow" work item.

Unlike mani's SERVICE_OFFER_DEFINITIONS (a tiered manicure/pedicure system), PMU's flow is three
distinct paths, not one combinable cart: a free/paid consultation (booked like a normal
appointment, no payment collected — matches mani's existing model), or a real procedure booked
deposit-first (the slot is reserved, then a real $100 card charge is collected via Square's
Payments API — see app.services.deposit_service — before the booking is treated as confirmed).

Landing page currently features Anna Kara's brow techniques only (two of her three Square catalog
items — "Powder&Ombre by Anna Kara" has no team_member assigned in Square yet, so it's excluded
here until that's fixed in the Square Dashboard; adding it back is a one-line addition once it is).
Only Anna Kara and Anastasiia Makarenko are active providers today — every team_member_id below is
one of the two.
"""

from dataclasses import dataclass

ANNA_KARA_TEAM_MEMBER_ID = "8Z286R826CDF2"
ANASTASIIA_TEAM_MEMBER_ID = "TMYEv4CekHMjdYfO"

ACTIVE_PROVIDER_IDS = [ANNA_KARA_TEAM_MEMBER_ID, ANASTASIIA_TEAM_MEMBER_ID]


@dataclass(frozen=True)
class PmuTechniqueDefinition:
    """A real procedure, booked deposit-first. duration_minutes/price are read live from Square
    (see PmuCatalogService), not hardcoded here — same "only structural mapping lives in code"
    convention as service_catalog.py.
    """

    slug: str
    name: str
    description: str
    item_id: str
    variation_id: str
    team_member_id: str


@dataclass(frozen=True)
class PmuConsultationDefinition:
    """Booked like any normal mani appointment — no payment collected here, matches the
    existing create_booking mechanics exactly. team_member_ids lists every provider the client
    can choose between for this consultation type.
    """

    slug: str
    name: str
    description: str
    item_id: str
    variation_id: str
    team_member_ids: list[str]


@dataclass(frozen=True)
class PmuDepositDefinition:
    """The $100 deposit charged via Square Payments once a technique+slot is reserved — a
    payment line item, not a bookable appointment, so it has no team_member_id of its own."""

    item_id: str
    variation_id: str
    amount_cents: int


PMU_TECHNIQUES: list[PmuTechniqueDefinition] = [
    PmuTechniqueDefinition(
        slug="nano-hairstrokes",
        name="Realistic Nano Hairstrokes",
        description="Ultra-fine, hair-like strokes for the most natural, realistic brow look — Anna's signature technique.",
        item_id="PNYBHJH3NKLLKHE2S7PRT3XD",
        variation_id="DKKDXNTXZ7URX76M4IUM3KOM",
        team_member_id=ANNA_KARA_TEAM_MEMBER_ID,
    ),
    PmuTechniqueDefinition(
        slug="combo",
        name="Combo — Hairstrokes & Shading",
        description="Hairstrokes at the front, soft shading through the body and tail for extra depth and fullness.",
        item_id="YUZPUA2RPNJGSLIZTMTGIV6C",
        variation_id="PIFYSXT2I7ZCN2BBLCDF6PAH",
        team_member_id=ANNA_KARA_TEAM_MEMBER_ID,
    ),
]

PMU_CONSULTATIONS: list[PmuConsultationDefinition] = [
    PmuConsultationDefinition(
        slug="online-consultation",
        name="Online Consultation",
        description="A free video call to talk through your brow goals and pick the right technique — no cost, no commitment.",
        item_id="52X2D4SLY64DGS637F2JO4CV",
        variation_id="6QH2EUW5RFS5DBRTS6ZFYT3Q",
        team_member_ids=ACTIVE_PROVIDER_IDS,
    ),
    PmuConsultationDefinition(
        slug="in-person-consultation",
        name="In-Person Consultation",
        description="Meet in studio to map your brow shape and confirm your technique together.",
        item_id="YIJY7CVQWNCDEMRCF5LD36ZE",
        variation_id="QGKYRG66BJ2DS54VRG6YO5ZN",
        team_member_ids=ACTIVE_PROVIDER_IDS,
    ),
]

PMU_DEPOSIT = PmuDepositDefinition(
    item_id="IHPE6FF7S4HDOWIDMRAV5QXX",
    variation_id="NVEO2SSBJ6RBHTL5UBA2WVOZ",
    amount_cents=10000,
)


def find_technique(slug: str) -> PmuTechniqueDefinition | None:
    return next((t for t in PMU_TECHNIQUES if t.slug == slug), None)


def find_consultation(slug: str) -> PmuConsultationDefinition | None:
    return next((c for c in PMU_CONSULTATIONS if c.slug == slug), None)
