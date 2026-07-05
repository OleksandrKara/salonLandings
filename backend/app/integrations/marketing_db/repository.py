import datetime as dt
import json
import logging

from app.integrations.marketing_db.pool import get_pool

logger = logging.getLogger(__name__)


class MarketingRepository:
    async def get_landing_page_by_slug(self, slug: str):
        pool = get_pool()
        return await pool.fetchrow(
            "SELECT id, name, slug FROM marketing.landing_pages WHERE slug = $1", slug
        )

    async def get_active_experiment(self, landing_page_id):
        pool = get_pool()
        return await pool.fetchrow(
            "SELECT id, landing_page_id, status FROM marketing.experiments "
            "WHERE landing_page_id = $1 AND status = 'active'",
            landing_page_id,
        )

    async def list_active_variants(self, landing_page_id):
        pool = get_pool()
        return await pool.fetch(
            "SELECT id, name, weight, content, active FROM marketing.landing_variants "
            "WHERE landing_page_id = $1 AND active = true AND weight > 0 ORDER BY created_at ASC",
            landing_page_id,
        )

    async def get_fallback_variant(self, landing_page_id):
        """The single canonical variant to show when no experiment is running (or the active
        experiment has no eligible variants) — the oldest active variant for the page.
        """
        pool = get_pool()
        return await pool.fetchrow(
            "SELECT id, name, weight, content, active FROM marketing.landing_variants "
            "WHERE landing_page_id = $1 AND active = true AND weight > 0 ORDER BY created_at ASC LIMIT 1",
            landing_page_id,
        )

    async def get_variant_by_key(self, landing_page_id, key: str):
        """Deterministic lookup for a campaign link (?v=<key>) — bypasses weight/experiment
        gating entirely so a weight-0 campaign-only variant is still directly reachable.
        """
        pool = get_pool()
        return await pool.fetchrow(
            "SELECT id, name, weight, content, active FROM marketing.landing_variants "
            "WHERE landing_page_id = $1 AND key = $2 AND active = true",
            landing_page_id,
            key,
        )

    async def insert_event(
        self,
        *,
        session_id: str,
        landing_page_id: str | None,
        variant_id: str | None,
        event_type: str,
        metadata: dict,
    ) -> None:
        pool = get_pool()
        await pool.execute(
            """
            INSERT INTO marketing.events (session_id, landing_page_id, variant_id, event_type, metadata)
            VALUES ($1, $2, $3, $4, $5)
            """,
            session_id,
            landing_page_id,
            variant_id,
            event_type,
            json.dumps(metadata),
        )

    async def insert_attribution(
        self,
        *,
        booking_id: str,
        landing_page_id: str | None,
        variant_id: str | None,
        source: str | None,
    ) -> None:
        pool = get_pool()
        await pool.execute(
            """
            INSERT INTO marketing.attribution (booking_id, landing_page_id, variant_id, source)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (booking_id) DO NOTHING
            """,
            booking_id,
            landing_page_id,
            variant_id,
            source,
        )

    async def insert_visit(self, *, visitor_id: str, fields: dict) -> None:
        pool = get_pool()
        await pool.execute(
            """
            INSERT INTO marketing.visits (
                visitor_id, landing_path, referrer,
                utm_source, utm_medium, utm_campaign, utm_term, utm_content,
                fbclid, gclid, user_agent, device_type, os_name, os_version,
                browser_name, browser_version, ip_address
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            """,
            visitor_id,
            fields.get("landing_path"),
            fields.get("referrer"),
            fields.get("utm_source"),
            fields.get("utm_medium"),
            fields.get("utm_campaign"),
            fields.get("utm_term"),
            fields.get("utm_content"),
            fields.get("fbclid"),
            fields.get("gclid"),
            fields.get("user_agent"),
            fields.get("device_type"),
            fields.get("os_name"),
            fields.get("os_version"),
            fields.get("browser_name"),
            fields.get("browser_version"),
            fields.get("ip_address"),
        )

    async def insert_submission(self, *, visitor_id: str | None, submission_type: str, fields: dict) -> None:
        pool = get_pool()
        await pool.execute(
            """
            INSERT INTO marketing.submissions (
                visitor_id, submission_type, square_booking_id, service_name, price,
                customer_email, customer_phone, landing_path, referrer,
                utm_source, utm_medium, utm_campaign, utm_term, utm_content,
                fbclid, gclid, user_agent, device_type, os_name, os_version,
                browser_name, browser_version, ip_address, landing_page_slug, variant_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
            """,
            visitor_id,
            submission_type,
            fields.get("square_booking_id"),
            fields.get("service_name"),
            fields.get("price"),
            fields.get("customer_email"),
            fields.get("customer_phone"),
            fields.get("landing_path"),
            fields.get("referrer"),
            fields.get("utm_source"),
            fields.get("utm_medium"),
            fields.get("utm_campaign"),
            fields.get("utm_term"),
            fields.get("utm_content"),
            fields.get("fbclid"),
            fields.get("gclid"),
            fields.get("user_agent"),
            fields.get("device_type"),
            fields.get("os_name"),
            fields.get("os_version"),
            fields.get("browser_name"),
            fields.get("browser_version"),
            fields.get("ip_address"),
            fields.get("landing_page_slug"),
            fields.get("variant_name"),
        )

    async def insert_sms_consent(
        self,
        *,
        phone_number: str,
        consented: bool,
        consent_text: str,
        consent_version: str,
        source: str,
        visitor_id: str | None,
        ip_address: str | None,
    ) -> None:
        pool = get_pool()
        await pool.execute(
            """
            INSERT INTO marketing.sms_consent
                (phone_number, consented, consent_text, consent_version, source, visitor_id, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            phone_number,
            consented,
            consent_text,
            consent_version,
            source,
            visitor_id,
            ip_address,
        )

    async def insert_email_consent(
        self,
        *,
        email_address: str,
        consented: bool,
        consent_text: str,
        consent_version: str,
        source: str,
        visitor_id: str | None,
        ip_address: str | None,
    ) -> None:
        pool = get_pool()
        await pool.execute(
            """
            INSERT INTO marketing.email_consent
                (email_address, consented, consent_text, consent_version, source, visitor_id, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            email_address,
            consented,
            consent_text,
            consent_version,
            source,
            visitor_id,
            ip_address,
        )

    async def resolve_landing_context(
        self, *, landing_page_id: str | None, variant_id: str | None
    ) -> tuple[str | None, str | None]:
        """Resolves the (opaque, UUID) landing_page_id/variant_id from a tracking snapshot into
        human-readable slug/name, denormalized onto the contact at capture time rather than
        stored as a foreign key — so a later variant rename/delete never changes what a
        historical lead's record says it saw, and deleting a variant is never blocked by
        unrelated contacts data.
        """
        pool = get_pool()
        page_slug = None
        variant_name = None
        if landing_page_id:
            row = await pool.fetchrow("SELECT slug FROM marketing.landing_pages WHERE id = $1", landing_page_id)
            page_slug = row["slug"] if row else None
        if variant_id:
            row = await pool.fetchrow("SELECT name FROM marketing.landing_variants WHERE id = $1", variant_id)
            variant_name = row["name"] if row else None
        return page_slug, variant_name

    async def upsert_contact_step1(
        self,
        *,
        phone_number: str,
        given_name: str,
        email_address: str | None,
        traffic_source: str,
        utm_source: str | None,
        utm_medium: str | None,
        utm_campaign: str | None,
        referrer: str | None,
        landing_page_slug: str | None,
        variant_name: str | None,
        device_type: str | None,
        os_name: str | None,
        os_version: str | None,
        browser_name: str | None,
        browser_version: str | None,
        square_customer_id: str | None,
    ) -> None:
        """First-touch capture at Step 1 — before a Square customer exists *of our making*.
        Dedup key is phone_number (the only field guaranteed present); original_traffic_source,
        and the landing_page_slug/variant_name describing what the lead first saw, are set on
        first insert and intentionally absent from the DO UPDATE SET clause below, so a repeat
        visit updates only the "latest" fields (traffic source, device/os/browser) and never
        overwrites first-touch attribution.

        square_customer_id here is the result of a *lookup*, not a creation — a Square customer
        that already existed before this lead was ever captured (e.g. booked in person, or
        through Square directly, in the past). COALESCE on conflict: once found, never clobber
        it with null just because a later lookup attempt failed or found nothing.
        """
        pool = get_pool()
        await pool.execute(
            """
            INSERT INTO marketing.contacts (
                phone_number, given_name, email_address,
                original_traffic_source, marketing_traffic_source,
                utm_source, utm_medium, utm_campaign, referrer,
                landing_page_slug, variant_name,
                device_type, os_name, os_version, browser_name, browser_version,
                square_customer_id, updated_at
            ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now())
            ON CONFLICT (phone_number) DO UPDATE SET
                given_name = EXCLUDED.given_name,
                email_address = COALESCE(EXCLUDED.email_address, marketing.contacts.email_address),
                marketing_traffic_source = EXCLUDED.marketing_traffic_source,
                utm_source = EXCLUDED.utm_source,
                utm_medium = EXCLUDED.utm_medium,
                utm_campaign = EXCLUDED.utm_campaign,
                referrer = EXCLUDED.referrer,
                device_type = EXCLUDED.device_type,
                os_name = EXCLUDED.os_name,
                os_version = EXCLUDED.os_version,
                browser_name = EXCLUDED.browser_name,
                browser_version = EXCLUDED.browser_version,
                square_customer_id = COALESCE(EXCLUDED.square_customer_id, marketing.contacts.square_customer_id),
                updated_at = now()
            """,
            phone_number,
            given_name,
            email_address,
            traffic_source,
            utm_source,
            utm_medium,
            utm_campaign,
            referrer,
            landing_page_slug,
            variant_name,
            device_type,
            os_name,
            os_version,
            browser_name,
            browser_version,
            square_customer_id,
        )

    async def update_contact_after_booking(
        self,
        *,
        phone_number: str,
        given_name: str,
        email_address: str | None,
        traffic_source: str,
        utm_source: str | None,
        utm_medium: str | None,
        utm_campaign: str | None,
        referrer: str | None,
        landing_page_slug: str | None,
        variant_name: str | None,
        device_type: str | None,
        os_name: str | None,
        os_version: str | None,
        browser_name: str | None,
        browser_version: str | None,
        sms_consent: bool,
        email_consent: bool,
        square_customer_id: str,
        square_booking_id: str,
        booking_status: str,
        booking_start_at: str | None,
        booking_service_name: str,
        booking_price: float | None,
        booking_artist_name: str | None,
    ) -> None:
        """Links a contact to its real Square booking once one is created. Same upsert shape
        as upsert_contact_step1 (original_traffic_source and the landing_page_slug/variant_name
        first-touch capture context both untouched on conflict) — also handles the edge case
        where a booking happens without a prior Step-1 capture (e.g. a network hiccup dropped
        that call), inserting a fresh contact row instead of erroring.
        """
        # asyncpg validates the Python type against the column type itself — an explicit SQL
        # cast doesn't help; it needs a real datetime.datetime, not a string, for timestamptz.
        parsed_start_at = dt.datetime.fromisoformat(booking_start_at) if booking_start_at else None

        pool = get_pool()
        await pool.execute(
            """
            INSERT INTO marketing.contacts (
                phone_number, given_name, email_address,
                original_traffic_source, marketing_traffic_source,
                utm_source, utm_medium, utm_campaign, referrer,
                landing_page_slug, variant_name,
                device_type, os_name, os_version, browser_name, browser_version,
                sms_marketing_consent, email_marketing_consent,
                square_customer_id, square_booking_id, booking_status, booking_start_at,
                booking_service_name, booking_price, booking_artist_name, updated_at
            ) VALUES (
                $1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23, $24, now()
            )
            ON CONFLICT (phone_number) DO UPDATE SET
                given_name = EXCLUDED.given_name,
                email_address = COALESCE(EXCLUDED.email_address, marketing.contacts.email_address),
                marketing_traffic_source = EXCLUDED.marketing_traffic_source,
                utm_source = EXCLUDED.utm_source,
                utm_medium = EXCLUDED.utm_medium,
                utm_campaign = EXCLUDED.utm_campaign,
                referrer = EXCLUDED.referrer,
                device_type = EXCLUDED.device_type,
                os_name = EXCLUDED.os_name,
                os_version = EXCLUDED.os_version,
                browser_name = EXCLUDED.browser_name,
                browser_version = EXCLUDED.browser_version,
                sms_marketing_consent = EXCLUDED.sms_marketing_consent,
                email_marketing_consent = EXCLUDED.email_marketing_consent,
                square_customer_id = EXCLUDED.square_customer_id,
                square_booking_id = EXCLUDED.square_booking_id,
                booking_status = EXCLUDED.booking_status,
                booking_start_at = EXCLUDED.booking_start_at,
                booking_service_name = EXCLUDED.booking_service_name,
                booking_price = EXCLUDED.booking_price,
                booking_artist_name = EXCLUDED.booking_artist_name,
                updated_at = now()
            """,
            phone_number,
            given_name,
            email_address,
            traffic_source,
            utm_source,
            utm_medium,
            utm_campaign,
            referrer,
            landing_page_slug,
            variant_name,
            device_type,
            os_name,
            os_version,
            browser_name,
            browser_version,
            sms_consent,
            email_consent,
            square_customer_id,
            square_booking_id,
            booking_status,
            parsed_start_at,
            booking_service_name,
            booking_price,
            booking_artist_name,
        )
