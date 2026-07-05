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
        "SELECT id, key, name, weight, active, content FROM marketing.landing_variants "
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
            INSERT INTO marketing.landing_variants (landing_page_id, name, weight, content, active, key)
            VALUES ($1, $2, $3, $4::jsonb, true, $5)
            RETURNING id
            """,
            page["id"],
            args.name,
            args.weight,
            json.dumps(content),
            key,
        )
    except asyncpg.exceptions.UniqueViolationError:
        print(f"Key '{key}' is already used by another variant on '{args.slug}'. Pass --key to choose a different one.", file=sys.stderr)
        return

    reach = f"deep link: ?v={key}" if key else "no key — only reachable via the random A/B pool"
    pool_note = "also eligible for the random A/B pool" if args.weight > 0 else "campaign-only (weight 0)"
    print(f"Created variant '{args.name}' ({row['id']}) — {reach}, {pool_note}")
    print(f"Content: {json.dumps(content, indent=2)}")


async def cmd_set_active(args: argparse.Namespace, active: bool) -> None:
    pool = get_pool()
    result = await pool.execute("UPDATE marketing.landing_variants SET active = $1 WHERE key = $2", active, args.key)
    print(f"{result} — variant(s) with key '{args.key}' set to active={active}")


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
    p_add.set_defaults(func=cmd_add)

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

    p_set_key = sub.add_parser("set-key", help="Assign a deep-link key to an existing variant, looked up by name")
    p_set_key.add_argument("--slug", default="mani")
    p_set_key.add_argument("--name", required=True, help="Exact existing variant name, e.g. 'Control'")
    p_set_key.add_argument("--key", required=True, help="New deep-link key, e.g. 'control'")
    p_set_key.set_defaults(func=cmd_set_key)

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
