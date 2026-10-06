"""PMU procedure menu (owner request 2026-10-06): what a client can book online on
pmu-annakara.com, built live from the business's own Square catalog and its categories.

Unlike app.domain.pmu_catalog (a hand-kept list of item/variation ids that broke the booking form
whenever an item was re-created in Square), nothing here names a Square id: a service is any
bookable appointment item, placed in a section by its Square category. A new or renamed service
shows up by itself; a deleted one simply disappears.

Sections, in order: PMU (brows, lips, eyes), Paramedical, Brows & Lashes, For our clients
(touch-ups, color boosters), Makeup (message us, nothing in Square to book), Nails (on
akluxnails.com). Consultations, deposits and internal items are never listed.

Deposit (owner decision 2026-10-06): $100 when the service costs $300 or more, nothing below.
"""

from __future__ import annotations

from app.domain.schemas import (
    PmuMenuArtistChoice,
    PmuMenuGroup,
    PmuMenuOption,
    PmuMenuResponse,
    PmuMenuSection,
    PmuMenuService,
)

DEPOSIT_THRESHOLD = 300.0
DEPOSIT_AMOUNT = 100.0

# Square category name (upper case) -> (section key, group title). First match wins, in this order,
# so an item filed under several categories ("EYEBROWS/LIPS") lands in the first one listed here.
_CATEGORY_RULES: list[tuple[str, str, str]] = [
    ("COLOR BOOSTER", "clients", "Color booster"),
    ("TOUCH UP", "clients", "Touch-up"),
    ("EYEBROWS", "pmu", "Brows"),
    ("LIPS", "pmu", "Lips"),
    ("EYELINER", "pmu", "Eyes"),
    ("PARAMEDICAL TATTOOING", "paramedical", "Paramedical tattooing"),
    ("BROWS & LASHES", "lashes", "Brows & lashes"),
]

_SECTIONS: list[tuple[str, str, str]] = [
    ("pmu", "Permanent makeup", "Brows, lips and eyes"),
    ("paramedical", "Paramedical", "Scar, stretch mark and vitiligo camouflage, areola, scalp"),
    ("lashes", "Brows & lashes", "Lamination, tint and shaping"),
    ("clients", "For our clients", "Touch-ups and color boosters"),
]

# Never listed, whatever their category: consultations have their own booking flow, the rest are
# internal (deposits, model sessions) or add-ons booked by staff.
_EXCLUDED_NAME_PARTS = ("consultation", "deposit", "model")
_EXCLUDED_CATEGORIES = {"DEPOSIT", "WAX"}

NAILS_URL = "https://akluxnails.com/"


def deposit_for(price: float) -> float:
    return DEPOSIT_AMOUNT if price >= DEPOSIT_THRESHOLD else 0.0


def build_menu(items, category_names: dict[str, str], artist_name, application_id: str, location_id: str) -> PmuMenuResponse:
    """`items` are Square catalog ITEM objects, `category_names` maps category id -> name and
    `artist_name(team_member_id)` returns a display name (or None for an inactive member)."""
    groups: dict[tuple[str, str], list[PmuMenuService]] = {}
    for item in items:
        service = _service(item, category_names, artist_name)
        if service is None:
            continue
        section_key, group_title, menu_service = service
        bucket = groups.setdefault((section_key, group_title), [])
        same = next((s for s in bucket if s.name.lower() == menu_service.name.lower()), None)
        if same is None:
            bucket.append(menu_service)
        else:
            # Square sometimes has one item per artist under the same name (SMP): one service here.
            options = sorted(same.options + menu_service.options, key=lambda o: o.price)
            bucket[bucket.index(same)] = same.model_copy(update={
                "options": options, "artists": _artist_choices(options), "price_from": options[0].price})

    sections: list[PmuMenuSection] = []
    for key, title, subtitle in _SECTIONS:
        section_groups = [
            PmuMenuGroup(key=f"{key}-{gt.lower().replace(' ', '-').replace('&', 'and')}", title=gt,
                         services=sorted(svcs, key=lambda s: (s.price_from, s.name)))
            for (sk, gt), svcs in groups.items() if sk == key
        ]
        order = [g for _, sk, g in _CATEGORY_RULES if sk == key]
        section_groups.sort(key=lambda g: order.index(g.title) if g.title in order else len(order))
        if section_groups:
            sections.append(PmuMenuSection(key=key, title=title, subtitle=subtitle, groups=section_groups))
    sections.append(PmuMenuSection(key="makeup", title="Makeup", subtitle="Wedding and event makeup: message us",
                                   groups=[], contact_only=True))
    sections.append(PmuMenuSection(key="nails", title="Nails", subtitle="Manicure and pedicure at AK.LUX.NAILS",
                                   groups=[], external_url=NAILS_URL))
    return PmuMenuResponse(sections=sections, square_application_id=application_id, square_location_id=location_id)


def find_option(menu: PmuMenuResponse, variation_id: str) -> tuple[PmuMenuService, PmuMenuOption] | None:
    for section in menu.sections:
        for group in section.groups:
            for service in group.services:
                for option in service.options:
                    if option.variation_id == variation_id:
                        return service, option
    return None


def _service(item, category_names: dict[str, str], artist_name):
    if getattr(item, "is_deleted", False):
        return None
    data = item.item_data
    if data is None or (data.product_type or "") != "APPOINTMENTS_SERVICE":
        return None
    name = (data.name or "").strip()
    if not name or any(part in name.lower() for part in _EXCLUDED_NAME_PARTS):
        return None
    cat_ids = [c.id for c in (data.categories or []) if getattr(c, "id", None)]
    if getattr(data, "category_id", None):
        cat_ids.append(data.category_id)
    cat_names = [(category_names.get(cid) or "").upper() for cid in cat_ids]
    if any(c in _EXCLUDED_CATEGORIES for c in cat_names):
        return None
    placement = next(((sk, gt) for cat, sk, gt in _CATEGORY_RULES if cat in cat_names), None)
    if placement is None:
        return None

    options: list[PmuMenuOption] = []
    for variation in data.variations or []:
        vd = variation.item_variation_data
        if vd is None or not vd.available_for_booking:
            continue
        team = [tm for tm in (vd.team_member_ids or []) if artist_name(tm)]
        if not team:
            continue
        price = ((vd.price_money.amount if vd.price_money else 0) or 0) / 100
        label = (vd.name or "").strip()
        if label.lower() in ("regular", "standard", "default", ""):
            label = None
        options.append(PmuMenuOption(
            variation_id=variation.id,
            variation_version=variation.version,
            label=label,
            team_member_ids=team,
            artist_names=[artist_name(tm) for tm in team],
            price=price,
            duration_minutes=(vd.service_duration or 0) // 60_000,
            deposit_amount=deposit_for(price),
        ))
    if not options:
        return None
    options.sort(key=lambda o: o.price)
    description = (data.description or "").strip() or None
    return placement[0], placement[1], PmuMenuService(
        id=item.id, name=name, description=description, options=options, artists=_artist_choices(options),
        price_from=options[0].price)


def _artist_choices(options: list[PmuMenuOption]) -> list[PmuMenuArtistChoice]:
    """One row per artist. When several variations list the same artist (Square's "Anastasiia"
    and "Anna Kara" variations of Ombre / Powder both list both artists), the variation named after
    the artist wins; otherwise the cheapest one that lists them."""
    artists: dict[str, str] = {}
    for o in options:
        for tm, name in zip(o.team_member_ids, o.artist_names):
            artists.setdefault(tm, name)
    choices: list[PmuMenuArtistChoice] = []
    for tm, name in artists.items():
        mine = [o for o in options if tm in o.team_member_ids]
        first = name.split()[0].lower()[:5]
        named = [o for o in mine if o.label and o.label.lower().replace(" ", "").startswith(first)]
        o = (named or mine)[0]
        choices.append(PmuMenuArtistChoice(team_member_id=tm, artist_name=name, variation_id=o.variation_id,
                                           price=o.price, duration_minutes=o.duration_minutes,
                                           deposit_amount=o.deposit_amount))
    choices.sort(key=lambda c: c.price)
    return choices
