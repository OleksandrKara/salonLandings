"""Mapping between the AK PMU landing page's booking flow and Square catalog items —
see docs/multi-tenant-akpmu-design.md and the "PMU deposit-first flow" work item.

Unlike mani's SERVICE_OFFER_DEFINITIONS (a tiered manicure/pedicure system), PMU's flow is three
distinct paths, not one combinable cart: a free/paid consultation (booked like a normal
appointment, no payment collected — matches mani's existing model), or a real procedure booked
deposit-first (the slot is reserved, then a real $100 card charge is collected via Square's
Payments API — see app.services.deposit_service — before the booking is treated as confirmed).

Landing page features both active providers' brow techniques (2026-08-19: originally Anna-only,
expanded after finding live that Anna's Square calendar has zero configured availability for any
service — see the owner's own report — while Anastasiia's does). Where Square has genuinely
separate catalog items per provider at different prices (Nano Hairstrokes), each provider's
version is its own technique entry; where Square already has one shared item both can perform
(Combo — the plain "Eyebrows Combo Technique - Hairstrokes&Shading" item, not the "...by Anna Kara"
-suffixed one, which is Anna-exclusive and was dropped in favor of this shared, actually-bookable
one), team_member_ids lists both and the chosen slot itself carries which provider it's with —
same pattern PmuConsultationDefinition already uses. Anna's own "Powder&Ombre by Anna Kara" still
has no team_member assigned in Square (a real data gap there, not fixed by this expansion) so it
stays excluded; Anastasiia's separate "Powder&Ombre by Anastasiia" item is included instead.
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
    convention as service_catalog.py. team_member_ids lists every provider who can perform this
    specific catalog item/variation — usually one (Square prices this provider's own variation
    differently from the others'), sometimes more than one where Square already has a single
    shared item. The selected availability slot carries which provider it's actually with.
    """

    slug: str
    name: str
    description: str
    item_id: str
    variation_id: str
    team_member_ids: list[str]
    # False for a technique that should still be bookable by slug (find_technique, availability,
    # booking) but must not appear in the landing page's own public technique list — see the
    # touch-up/color-booster entries below, reachable only via a direct emailed link.
    public: bool = True


@dataclass(frozen=True)
class PmuConsultationDefinition:
    """Booked like any normal mani appointment — no payment collected here, matches the
    existing create_booking mechanics exactly. team_member_ids lists every provider the client
    can choose between for this consultation type. is_online drives the confirmation SMS's own
    "we'll call you" vs. "we'll be waiting for you at {address}" clause (see
    notify_consultation_request_sms) — explicit data here rather than inferred from slug string
    matching at the call site, so a future third consultation type can't silently pick the wrong
    branch just by not matching an expected slug spelling.
    """

    slug: str
    name: str
    description: str
    item_id: str
    variation_id: str
    team_member_ids: list[str]
    is_online: bool


@dataclass(frozen=True)
class PmuDepositDefinition:
    """The $100 deposit charged via Square Payments once a technique+slot is reserved — a
    payment line item, not a bookable appointment, so it has no team_member_id of its own."""

    item_id: str
    variation_id: str
    amount_cents: int


PMU_TECHNIQUES: list[PmuTechniqueDefinition] = [
    PmuTechniqueDefinition(
        slug="nano-hairstrokes-anna",
        name="Realistic Nano Hairstrokes — Anna Kara",
        description="Ultra-fine, hair-like strokes for the most natural, realistic brow look — Anna's signature technique.",
        # 2026-08-20: Square-side catalog reorg merged Anna's and Anastasiia's previously separate
        # Nano Hairstrokes items into one shared item ("Eyebrows Realistic NANO Hairstrokes
        # Technique") with a variation per provider — same shape nano-hairstrokes-anastasiia and
        # combo already used. The old item_id/variation_id below were archived/deleted, breaking
        # GET /api/pmu/catalog entirely (a single missing catalog id 502s the whole batch fetch).
        item_id="3NXKMI2RHESZHQQQK6JIMR7C",
        variation_id="FKO7JLSXCFPSH7XM47F5GLK7",
        team_member_ids=[ANNA_KARA_TEAM_MEMBER_ID],
    ),
    PmuTechniqueDefinition(
        slug="nano-hairstrokes-anastasiia",
        name="Realistic Nano Hairstrokes — Anastasiia",
        description="The same ultra-fine, hair-like stroke technique, by Anastasiia.",
        item_id="3NXKMI2RHESZHQQQK6JIMR7C",
        variation_id="J5R6SKNOYPCNFBZOZQOZGSNC",
        team_member_ids=[ANASTASIIA_TEAM_MEMBER_ID],
    ),
    PmuTechniqueDefinition(
        slug="combo",
        name="Combo — Hairstrokes & Shading",
        description="Hairstrokes at the front, soft shading through the body and tail for extra depth and fullness. By Anna or Anastasiia — whichever slot you pick.",
        item_id="3EC565HBKF7WZHJ7EMABT2JQ",
        variation_id="DGBRMKMTWOV5C5HF2C7LBQHZ",
        team_member_ids=ACTIVE_PROVIDER_IDS,
    ),
    PmuTechniqueDefinition(
        slug="powder-ombre-anastasiia",
        name="Powder & Ombré — Anastasiia",
        description="A soft, gradient powder-fill look, fuller toward the tail — by Anastasiia.",
        # 2026-08-20: same Square-side reorg as nano-hairstrokes-anna above — this used to be its
        # own standalone item, now it's the "Anastasia" variation of the shared "Ombre / Powder
        # Brows" item (which also has an "Anna Kara" variation now, RYFYN3T6MZVRW3OBGKQPVZHI —
        # not wired up here since adding Anna as a second provider for this technique is a real
        # scope decision, not part of this stale-id fix).
        item_id="XYYARZTVGB7FEDAAD7R3L6FN",
        variation_id="UZ4T47IZTIK4KCPRQMA3UNC4",
        team_member_ids=[ANASTASIIA_TEAM_MEMBER_ID],
    ),
    # Maintenance procedures for existing clients — not part of the "new client picks a technique"
    # flow above, so not linked from the main landing page techniques list; only reachable via a
    # direct emailed link (see salaryReview's touchup_reminder/color_booster_reminder email
    # templates). Added 2026-09-05: these five Square items (three Touch-Up tiers, two Color
    # Booster tiers) previously had available_for_booking=False and no team_member_ids assigned in
    # Square (a real availability-search blocker, same class of gap as Anna's Powder&Ombre above) —
    # both were fixed live via the Catalog API for all five items so the picture is consistent, but
    # only the two tiers matching each reminder's actual trigger window are wired up here:
    # touch-up fires at ~4-6 weeks (the "1-6 month" tier), color-booster at ~1 year (the
    # "10 month-1 year" tier). The other three tiers (6-8mo / 8-10mo touch-up, 1-2yr booster) exist
    # in Square for staff to charge manually but have no reminder or deep link pointing at them.
    PmuTechniqueDefinition(
        slug="touch-up",
        name="Touch-Up (1-6 month)",
        description="A required part of the process, not an add-on — locks in your result for the long run.",
        item_id="P5CCSK4COM4QJH53KDSK4R7U",
        variation_id="E5BZJGW3T2DV7LKXT5KXITRT",
        team_member_ids=ACTIVE_PROVIDER_IDS,
        public=False,
    ),
    PmuTechniqueDefinition(
        slug="color-booster",
        name="Color Booster (10 month-1 year)",
        description="The yearly refresh permanent makeup needs to keep holding — required on schedule, not optional.",
        item_id="3SO5XYJ5GVLRIJJFXQIXSIJB",
        variation_id="PR4GXWJN24E7HO76QCLL6H4K",
        team_member_ids=ACTIVE_PROVIDER_IDS,
        public=False,
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
        is_online=True,
    ),
    PmuConsultationDefinition(
        slug="in-person-consultation",
        name="In-Person Consultation",
        description="Meet in studio to map your brow shape and confirm your technique together.",
        item_id="YIJY7CVQWNCDEMRCF5LD36ZE",
        variation_id="QGKYRG66BJ2DS54VRG6YO5ZN",
        team_member_ids=ACTIVE_PROVIDER_IDS,
        is_online=False,
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
