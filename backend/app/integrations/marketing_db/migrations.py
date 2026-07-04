"""Idempotent DDL for the marketing schema, run once at startup.

Deliberately plain SQL rather than a migration framework (Alembic etc.) —
two tables, additive-only for now. Revisit if the schema grows enough to
need real migration history.
"""

import logging

from app.integrations.marketing_db.pool import get_pool

logger = logging.getLogger(__name__)

_DDL = """
CREATE SCHEMA IF NOT EXISTS marketing;

CREATE TABLE IF NOT EXISTS marketing.visits (
    id BIGSERIAL PRIMARY KEY,
    visitor_id UUID NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    landing_path TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    fbclid TEXT,
    gclid TEXT,
    user_agent TEXT,
    device_type TEXT,
    os_name TEXT,
    os_version TEXT,
    browser_name TEXT,
    browser_version TEXT,
    ip_address TEXT
);
CREATE INDEX IF NOT EXISTS idx_marketing_visits_visitor_id ON marketing.visits (visitor_id);
CREATE INDEX IF NOT EXISTS idx_marketing_visits_occurred_at ON marketing.visits (occurred_at);
CREATE INDEX IF NOT EXISTS idx_marketing_visits_utm_source ON marketing.visits (utm_source);

CREATE TABLE IF NOT EXISTS marketing.submissions (
    id BIGSERIAL PRIMARY KEY,
    visitor_id UUID,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submission_type TEXT NOT NULL,
    square_booking_id TEXT,
    service_name TEXT,
    price NUMERIC(10, 2),
    customer_email TEXT,
    customer_phone TEXT,
    landing_path TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    fbclid TEXT,
    gclid TEXT,
    user_agent TEXT,
    device_type TEXT,
    os_name TEXT,
    os_version TEXT,
    browser_name TEXT,
    browser_version TEXT,
    ip_address TEXT
);
CREATE INDEX IF NOT EXISTS idx_marketing_submissions_visitor_id ON marketing.submissions (visitor_id);
CREATE INDEX IF NOT EXISTS idx_marketing_submissions_occurred_at ON marketing.submissions (occurred_at);
CREATE INDEX IF NOT EXISTS idx_marketing_submissions_type ON marketing.submissions (submission_type);
"""


async def run_migrations() -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(_DDL)
    logger.info("Marketing schema migrations applied")
