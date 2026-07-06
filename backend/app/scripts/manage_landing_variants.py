"""CLI for managing marketing landing pages/variants.

Deliberately not a CMS — no web UI, no auth, just a thin scriptable layer directly
over the same `marketing.landing_pages` / `marketing.landing_variants` tables the
app already reads from at runtime. Run inside the backend container:

    docker compose exec backend python -m app.scripts.manage_landing_variants list-pages

    docker compose exec backend python -m app.scripts.manage_landing_variants add \\
        --slug mani --name "Holiday Gold" \\
        --headline "Holiday Glam, Booked in Seconds" \\
        --cta "Claim Your Holiday Slot" \\
        --accent-color "#B8860B"

The deep-link key (?v=<key>) is auto-generated from --name (e.g. "Holiday Gold" -> "holiday-gold")
unless --key is passed explicitly, or --no-key to skip having one entirely. A variant with a key
is reachable via mani.akluxnails.com/?v=<key> regardless of its weight — set --weight above 0 only
if it should also be eligible for the random A/B pool shown to regular organic/direct traffic.

    docker compose exec backend python -m app.scripts.manage_landing_variants rename \\
        --slug mani --name "Holiday Gold" --new-name "Winter Gold"

Renaming regenerates the key from the new name too (so the link always matches what the variant
is currently called) unless --key is passed to keep a specific link stable.
"""

import argparse
import asyncio
import json
import re
import sys

import asyncpg

from app.integrations.marketing_db.pool import close_pool, get_pool, init_pool


def slugify(name: str) -> str:
    """Turns a display name into a URL-safe deep-link key, e.g. "Holiday Gold!" -> "holiday-gold"."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or "variant"


async def cmd_list_pages(_args: argparse.Namespace) -> None:
    pool = get_pool()
    rows = await pool.fetch("SELECT id, name, slug FROM marketing.landing_pages ORDER BY created_at ASC")
    if not rows:
        print("No landing pages yet.")
        return
    for row in rows:
        print(f"{row['slug']:20s} {row['name']:30s} {row['id']}")


async def cmd_add_page(args: argparse.Namespace) -> None:
    pool = get_pool()
    existing = await pool.fetchrow("SELECT id FROM marketing.landing_pages WHERE slug = $1", args.slug)
    if existing:
        print(f"Landing page '{args.slug}' already exists ({existing['id']}).")
        return
    row = await pool.fetchrow(
        "INSERT INTO marketing.landing_pages (name, slug) VALUES ($1, $2) RETURNING id",
        args.name,
        args.slug,
    )
    print(f"Created landing page '{args.slug}' ({row['id']}).")


async def cmd_list(args: argparse.Namespace) -> None:
    pool = get_pool()
    page = await pool.fetchrow("SELECT id, name FROM marketing.landing_pages WHERE slug = $1", args.slug)
    if page is None:
        print(f"No landing page with slug '{args.slug}'.", file=sys.stderr)
        return
    rows = await pool.fetch(
        "SELECT id, key, name, weight, active, content, description FROM marketing.landing_variants "
        "WHERE landing_page_id = $1 ORDER BY created_at ASC",
        page["id"],
    )
    print(f"Landing page: {page['name']} ({args.slug})\n")
    for row in rows:
        status = "active" if row["active"] else "inactive"
        key = row["key"] or "-"
        print(f"  [{status:8s}] weight={row['weight']:<4} key={key:20s} name={row['name']}  ({row['id']})")
        content = json.loads(row["content"]) if isinstance(row["content"], str) else row["content"]
        if content:
            print(f"             content={json.dumps(content)}")
        if row["description"]:
            print(f"             description: {row['description']}")


def _build_content(args: argparse.Namespace) -> dict:
    content = {}
    if args.headline:
        content["heroHeadline"] = args.headline
    if args.subheadline:
        content["heroSubheadline"] = args.subheadline
    if args.cta:
        content["ctaText"] = args.cta
    if args.hero_image_url:
        content["heroImageUrl"] = args.hero_image_url
    if args.accent_color:
        content["accentColor"] = args.accent_color
    if getattr(args, "terminology", None):
        content["terminology"] = args.terminology
    return content


async def cmd_add(args: argparse.Namespace) -> None:
    pool = get_pool()
    page = await pool.fetchrow("SELECT id FROM marketing.landing_pages WHERE slug = $1", args.slug)
    if page is None:
        print(f"No landing page with slug '{args.slug}'. Create it first with 'add-page'.", file=sys.stderr)
        return

    content = _build_content(args)
    if not content:
        print("Refusing to create a variant with no content overrides at all — nothing would differ from the default.", file=sys.stderr)
        return

    key = None if args.no_key else (args.key or slugify(args.name))

    try:
        row = await pool.fetchrow(
            """
            INSERT INTO marketing.landing_variants (landing_page_id, name, weight, content, active, key, description)
            VALUES ($1, $2, $3, $4::jsonb, true, $5, $6)
            RETURNING id
            """,
            page["id"],
            args.name,
            args.weight,
            json.dumps(content),
            key,
            args.description,
        )
    except asyncpg.exceptions.UniqueViolationError:
        print(f"Key '{key}' is already used by another variant on '{args.slug}'. Pass --key to choose a different one.", file=sys.stderr)
        return

    reach = f"deep link: ?v={key}" if key else "no key — only reachable via the random A/B pool"
    pool_note = "also eligible for the random A/B pool" if args.weight > 0 else "campaign-only (weight 0)"
    print(f"Created variant '{args.name}' ({row['id']}) — {reach}, {pool_note}")
    print(f"Content: {json.dumps(content, indent=2)}")
    if args.description:
        print(f"Description: {args.description}")


async def cmd_set_active(args: argparse.Namespace, active: bool) -> None:
    pool = get_pool()
    result = await pool.execute("UPDATE marketing.landing_variants SET active = $1 WHERE key = $2", active, args.key)
    print(f"{result} — variant(s) with key '{args.key}' set to active={active}")


async def cmd_delete(args: argparse.Namespace) -> None:
    """Permanently removes a variant, looked up by name. Refuses if it has any recorded
    events/attribution unless --force is passed, since that's real tracked history, not just
    config — --force deletes that history too (events/attribution rows), not just the variant,
    so there's nothing left over to violate the foreign key.
    """
    pool = get_pool()
    page = await pool.fetchrow("SELECT id FROM marketing.landing_pages WHERE slug = $1", args.slug)
    if page is None:
        print(f"No landing page with slug '{args.slug}'.", file=sys.stderr)
        return

    variant = await pool.fetchrow(
        "SELECT id FROM marketing.landing_variants WHERE landing_page_id = $1 AND name = $2",
        page["id"],
        args.name,
    )
    if variant is None:
        print(f"No variant named '{args.name}' on '{args.slug}'.", file=sys.stderr)
        return
    variant_id = variant["id"]

    event_count = await pool.fetchval("SELECT COUNT(*) FROM marketing.events WHERE variant_id = $1", variant_id)
    attribution_count = await pool.fetchval("SELECT COUNT(*) FROM marketing.attribution WHERE variant_id = $1", variant_id)
    if (event_count or attribution_count) and not args.force:
        print(
            f"Variant '{args.name}' has {event_count} event(s) and {attribution_count} attribution "
            f"row(s) recorded. Pass --force to delete it (and that history) anyway.",
            file=sys.stderr,
        )
        return

    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("DELETE FROM marketing.events WHERE variant_id = $1", variant_id)
            await conn.execute("DELETE FROM marketing.attribution WHERE variant_id = $1", variant_id)
            await conn.execute("DELETE FROM marketing.landing_variants WHERE id = $1", variant_id)

    print(
        f"Deleted variant '{args.name}' ({variant_id}) from '{args.slug}', "
        f"including {event_count} event(s) and {attribution_count} attribution row(s)."
    )


async def cmd_set_headline(args: argparse.Namespace) -> None:
    """Sets (or clears, with --headline "") a variant's heroHeadline content override, looked up
    by name — every other content key (accentColor, ctaText, terminology, etc.) is left
    untouched. Clearing it falls back to the default HEADLINE constant, same as a variant that
    never had one — useful for isolating a single variable (e.g. color) across variants that
    otherwise differ in headline too.
    """
    pool = get_pool()
    page = await pool.fetchrow("SELECT id FROM marketing.landing_pages WHERE slug = $1", args.slug)
    if page is None:
        print(f"No landing page with slug '{args.slug}'.", file=sys.stderr)
        return
    variant = await pool.fetchrow(
        "SELECT id FROM marketing.landing_variants WHERE landing_page_id = $1 AND name = $2",
        page["id"],
        args.name,
    )
    if variant is None:
        print(f"No variant named '{args.name}' on '{args.slug}'.", file=sys.stderr)
        return

    if args.headline:
        await pool.execute(
            "UPDATE marketing.landing_variants SET content = content || jsonb_build_object('heroHeadline', $1::text) WHERE id = $2",
            args.headline,
            variant["id"],
        )
        print(f"Set heroHeadline for '{args.name}' on '{args.slug}' to: {args.headline}")
    else:
        await pool.execute(
            "UPDATE marketing.landing_variants SET content = content - 'heroHeadline' WHERE id = $1",
            variant["id"],
        )
        print(f"Cleared the heroHeadline override for '{args.name}' on '{args.slug}' — it now shows the default headline.")


async def cmd_rename(args: argparse.Namespace) -> None:
    """Renames a variant and regenerates its deep-link key from the new name, so the
    ?v=<key> URL always matches what the variant is currently called — pass --key to
    keep a specific link stable (e.g. one already shared in a live ad) despite the rename.
    """
    pool = get_pool()
    page = await pool.fetchrow("SELECT id FROM marketing.landing_pages WHERE slug = $1", args.slug)
    if page is None:
        print(f"No landing page with slug '{args.slug}'.", file=sys.stderr)
        return

    existing = await pool.fetchrow(
        "SELECT id FROM marketing.landing_variants WHERE landing_page_id = $1 AND name = $2",
        page["id"],
        args.name,
    )
    if existing is None:
        print(f"No variant named '{args.name}' on '{args.slug}'.", file=sys.stderr)
        return

    new_key = args.key or slugify(args.new_name)
    try:
        await pool.execute(
            "UPDATE marketing.landing_variants SET name = $1, key = $2 WHERE id = $3",
            args.new_name,
            new_key,
            existing["id"],
        )
    except asyncpg.exceptions.UniqueViolationError:
        print(f"Key '{new_key}' is already used by another variant on '{args.slug}'. Pass --key to choose a different one.", file=sys.stderr)
        return

    print(f"Renamed '{args.name}' -> '{args.new_name}' — now reachable via ?v={new_key}")


async def cmd_set_key(args: argparse.Namespace) -> None:
    """Assigns a deep-link key to an existing variant (e.g. one already in the random
    A/B pool that has no key yet) so it becomes directly reachable via ?v=<key> too.
    """
    pool = get_pool()
    page = await pool.fetchrow("SELECT id FROM marketing.landing_pages WHERE slug = $1", args.slug)
    if page is None:
        print(f"No landing page with slug '{args.slug}'.", file=sys.stderr)
        return
    try:
        result = await pool.execute(
            "UPDATE marketing.landing_variants SET key = $1 WHERE landing_page_id = $2 AND name = $3",
            args.key,
            page["id"],
            args.name,
        )
    except asyncpg.exceptions.UniqueViolationError:
        print(f"Key '{args.key}' is already used by another variant on '{args.slug}'. Choose a different one.", file=sys.stderr)
        return
    print(f"{result} — variant '{args.name}' on '{args.slug}' now reachable via ?v={args.key}")


async def cmd_set_weight(args: argparse.Namespace) -> None:
    """Sets an existing variant's weight — its share of the random A/B pool relative to the
    other active variants' weights (they don't need to sum to 100; it's a ratio, e.g. three
    variants at 1/1/1 split traffic exactly as evenly as 33/33/34 would). Weight 0 removes it
    from the random pool entirely while leaving any deep-link key still reachable.
    """
    pool = get_pool()
    page = await pool.fetchrow("SELECT id FROM marketing.landing_pages WHERE slug = $1", args.slug)
    if page is None:
        print(f"No landing page with slug '{args.slug}'.", file=sys.stderr)
        return
    result = await pool.execute(
        "UPDATE marketing.landing_variants SET weight = $1 WHERE landing_page_id = $2 AND name = $3",
        args.weight,
        page["id"],
        args.name,
    )
    print(f"{result} — weight set to {args.weight} for variant '{args.name}' on '{args.slug}'")


async def cmd_set_description(args: argparse.Namespace) -> None:
    """Sets (or clears, with --description "") the free-text note on what a variant is
    testing and why — the main way to backfill this on variants that already exist, or for
    an agent proposing new variants to record its own reasoning independently of `add`.
    """
    pool = get_pool()
    page = await pool.fetchrow("SELECT id FROM marketing.landing_pages WHERE slug = $1", args.slug)
    if page is None:
        print(f"No landing page with slug '{args.slug}'.", file=sys.stderr)
        return
    result = await pool.execute(
        "UPDATE marketing.landing_variants SET description = $1 WHERE landing_page_id = $2 AND name = $3",
        args.description or None,
        page["id"],
        args.name,
    )
    print(f"{result} — description set for variant '{args.name}' on '{args.slug}'")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manage marketing landing pages/variants")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list-pages", help="List all landing pages").set_defaults(func=cmd_list_pages)

    p_add_page = sub.add_parser("add-page", help="Create a genuinely new landing page/template (not just a variant)")
    p_add_page.add_argument("--slug", required=True)
    p_add_page.add_argument("--name", required=True)
    p_add_page.set_defaults(func=cmd_add_page)

    p_list = sub.add_parser("list", help="List variants for a landing page")
    p_list.add_argument("--slug", default="mani")
    p_list.set_defaults(func=cmd_list)

    p_add = sub.add_parser("add", help="Add a new variant (header/color variation)")
    p_add.add_argument("--slug", default="mani")
    p_add.add_argument("--name", required=True, help="Internal label, e.g. 'Holiday Gold'")
    p_add.add_argument("--key", default=None, help="Campaign key for ?v=<key> deep-links; auto-generated from --name if omitted")
    p_add.add_argument("--no-key", action="store_true", help="Don't assign a key at all — only reachable via the random A/B pool")
    p_add.add_argument("--weight", type=int, default=0, help="0 (default) = campaign-only; >0 = also eligible for the random A/B pool")
    p_add.add_argument("--headline", default=None)
    p_add.add_argument("--subheadline", default=None)
    p_add.add_argument("--cta", default=None, help="Primary button text")
    p_add.add_argument("--hero-image-url", default=None)
    p_add.add_argument("--accent-color", default=None, help="Hex brand color, e.g. '#B8860B' — full palette derived automatically")
    p_add.add_argument(
        "--terminology",
        choices=["russian", "european"],
        default=None,
        help="'european' swaps every 'Russian manicure' branding mention across the page for 'European manicure' wording (same service, different terminology test)",
    )
    p_add.add_argument("--description", default=None, help="What this variant is testing and why, e.g. 'Urgency-focused headline + green accent vs. control'")
    p_add.set_defaults(func=cmd_add)

    p_delete = sub.add_parser("delete", help="Permanently delete a variant, looked up by name")
    p_delete.add_argument("--slug", default="mani")
    p_delete.add_argument("--name", required=True, help="Exact existing variant name, e.g. 'Verification Test 2'")
    p_delete.add_argument("--force", action="store_true", help="Also delete its recorded events/attribution, if any")
    p_delete.set_defaults(func=cmd_delete)

    p_deactivate = sub.add_parser("deactivate", help="Deactivate a variant by key")
    p_deactivate.add_argument("--key", required=True)
    p_deactivate.set_defaults(func=lambda a: cmd_set_active(a, False))

    p_activate = sub.add_parser("activate", help="Reactivate a variant by key")
    p_activate.add_argument("--key", required=True)
    p_activate.set_defaults(func=lambda a: cmd_set_active(a, True))

    p_rename = sub.add_parser("rename", help="Rename a variant; its ?v=<key> deep link is regenerated from the new name")
    p_rename.add_argument("--slug", default="mani")
    p_rename.add_argument("--name", required=True, help="Exact current variant name, e.g. 'Holiday Gold'")
    p_rename.add_argument("--new-name", required=True, help="New display name")
    p_rename.add_argument("--key", default=None, help="Override the auto-generated key, e.g. to keep a link stable")
    p_rename.set_defaults(func=cmd_rename)

    p_set_weight = sub.add_parser("set-weight", help="Set an existing variant's random-A/B-pool weight, looked up by name")
    p_set_weight.add_argument("--slug", default="mani")
    p_set_weight.add_argument("--name", required=True, help="Exact existing variant name, e.g. 'Version_1'")
    p_set_weight.add_argument("--weight", type=int, required=True, help="0 removes it from the random pool; otherwise its share relative to other variants' weights")
    p_set_weight.set_defaults(func=cmd_set_weight)

    p_set_headline = sub.add_parser("set-headline", help="Set or clear a variant's heroHeadline content override, looked up by name")
    p_set_headline.add_argument("--slug", default="mani")
    p_set_headline.add_argument("--name", required=True, help="Exact existing variant name, e.g. 'Version_4'")
    p_set_headline.add_argument("--headline", default="", help="New headline; omit or pass '' to clear it (falls back to the default)")
    p_set_headline.set_defaults(func=cmd_set_headline)

    p_set_key = sub.add_parser("set-key", help="Assign a deep-link key to an existing variant, looked up by name")
    p_set_key.add_argument("--slug", default="mani")
    p_set_key.add_argument("--name", required=True, help="Exact existing variant name, e.g. 'Control'")
    p_set_key.add_argument("--key", required=True, help="New deep-link key, e.g. 'control'")
    p_set_key.set_defaults(func=cmd_set_key)

    p_set_description = sub.add_parser("set-description", help="Set (or clear) what a variant is testing and why, looked up by name")
    p_set_description.add_argument("--slug", default="mani")
    p_set_description.add_argument("--name", required=True, help="Exact existing variant name, e.g. 'Control'")
    p_set_description.add_argument("--description", default="", help="New description; omit or pass '' to clear")
    p_set_description.set_defaults(func=cmd_set_description)

    return parser


async def main() -> None:
    args = build_parser().parse_args()
    await init_pool()
    try:
        await args.func(args)
    finally:
        await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
