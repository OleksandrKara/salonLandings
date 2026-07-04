import logging

from app.integrations.marketing_db.pool import get_pool

logger = logging.getLogger(__name__)


class MarketingRepository:
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
                browser_name, browser_version, ip_address
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
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
        )
