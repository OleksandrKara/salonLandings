"""PMU procedure menu built from Square categories (app.services.pmu_menu)."""

from types import SimpleNamespace as NS

from app.services import pmu_menu

CATS = {"c-brows": "EYEBROWS", "c-para": "PARAMEDICAL TATTOOING", "c-dep": "DEPOSIT", "c-lash": "BROWS & LASHES",
        "c-tu": "TOUCH UP"}
ARTISTS = {"tm-anna": "Anna K.", "tm-ana": "Anastasiia M."}


def item(id_, name, cats, variations, product_type="APPOINTMENTS_SERVICE"):
    return NS(id=id_, is_deleted=False, item_data=NS(
        name=name, description=None, product_type=product_type, category_id=None,
        categories=[NS(id=c) for c in cats], variations=variations))


def var(id_, name, price, team, minutes=120, bookable=True):
    return NS(id=id_, version=1, item_variation_data=NS(
        name=name, price_money=NS(amount=int(price * 100)), service_duration=minutes * 60_000,
        available_for_booking=bookable, team_member_ids=team))


def menu(items):
    return pmu_menu.build_menu(items, CATS, ARTISTS.get, "app", "loc")


def all_services(m):
    return {s.name: (sec.key, g.title, s) for sec in m.sections for g in sec.groups for s in g.services}


def test_sections_deposit_and_exclusions():
    m = menu([
        item("i1", "Ombre / Powder Brows", ["c-brows"], [var("v1", "Anastasiia", 600, ["tm-ana", "tm-anna"]),
                                                          var("v2", "Anna Kara", 650, ["tm-ana", "tm-anna"])]),
        item("i2", "Brow Tint", ["c-lash"], [var("v3", "Regular", 50, ["tm-ana"], 30)]),
        item("i3", "Deposit", ["c-dep"], [var("v4", "Regular", 100, ["tm-ana"])]),
        item("i4", "Online Consultation", ["c-brows"], [var("v5", "Regular", 0, ["tm-ana"])]),
        item("i5", "Touch-Up (8-10 month)", ["c-tu"], [var("v6", "Regular", 300, ["tm-ana"])]),
        item("i6", "Old thing", ["c-brows"], [var("v7", "Regular", 300, ["tm-gone"])]),
    ])
    s = all_services(m)
    assert set(s) == {"Ombre / Powder Brows", "Brow Tint", "Touch-Up (8-10 month)"}
    assert s["Ombre / Powder Brows"][0] == "pmu" and s["Brow Tint"][0] == "lashes" and s["Touch-Up (8-10 month)"][0] == "clients"
    assert s["Brow Tint"][2].artists[0].deposit_amount == 0
    assert s["Touch-Up (8-10 month)"][2].artists[0].deposit_amount == 100
    assert [x.key for x in m.sections][-2:] == ["makeup", "nails"]


def test_artist_gets_the_variation_named_after_them():
    m = menu([item("i1", "Ombre / Powder Brows", ["c-brows"], [var("v1", "Anastasiia", 600, ["tm-ana", "tm-anna"]),
                                                                var("v2", "Anna Kara", 650, ["tm-ana", "tm-anna"])])])
    artists = {a.artist_name: (a.variation_id, a.price) for a in all_services(m)["Ombre / Powder Brows"][2].artists}
    assert artists == {"Anastasiia M.": ("v1", 600), "Anna K.": ("v2", 650)}


def test_same_name_items_merge_into_one_service():
    m = menu([item("i1", "SMP", ["c-para"], [var("v1", "Regular", 600, ["tm-ana"])]),
              item("i2", "SMP", ["c-para"], [var("v2", "Regular", 900, ["tm-anna"])])])
    sv = all_services(m)["SMP"][2]
    assert {a.artist_name: a.price for a in sv.artists} == {"Anastasiia M.": 600, "Anna K.": 900}
    assert pmu_menu.find_option(m, "v2")[1].price == 900


def test_deposit_policy_note_records_the_owner_wording():
    from app.services.pmu_service import deposit_policy_note

    note = deposit_policy_note(100)
    assert "$100 deposit goes toward the procedure" in note
    assert "24 hours' notice" in note
    assert "same-day cancellation or reschedule, or a no-show" in note


def test_ttl_cache_refresh_swaps_in_a_new_value_without_a_gap():
    from app.core.cache import TTLCache

    cache = TTLCache(300)
    assert cache.get_or_fetch(lambda: "old") == "old"
    assert cache.refresh(lambda: "new") == "new"
    assert cache.get_or_fetch(lambda: "never called") == "new"
