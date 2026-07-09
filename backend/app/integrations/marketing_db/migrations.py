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

# Landing-page experimentation (A/B/n testing) + attribution. Additive to the tables above —
# `visits`/`submissions` stay exactly as they are. gen_random_uuid() is built into Postgres 13+
# core (no pgcrypto/uuid-ossp extension needed) — confirmed against the pgvector/pg16 base image.
_DDL_EXPERIMENTS = """
CREATE TABLE IF NOT EXISTS marketing.landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional cutoff: dashboard stats (page views/bookings/conversion) only count activity from
-- this point forward, across all variants on the page — lets an owner exclude their own
-- pre-launch test traffic from the numbers they use to evaluate real ad campaigns, without
-- deleting or altering the underlying event history.
ALTER TABLE marketing.landing_pages ADD COLUMN IF NOT EXISTS stats_since TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS marketing.landing_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id UUID NOT NULL REFERENCES marketing.landing_pages (id),
    name TEXT NOT NULL,
    weight INTEGER NOT NULL DEFAULT 20,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_landing_variants_page ON marketing.landing_variants (landing_page_id);

-- Stable, human-chosen slug (e.g. "holiday-gold") so a campaign link can request this
-- exact variant via ?v=<key>, independent of its random UUID. Nullable: existing
-- pure-A/B variants (randomly split, never linked to directly) don't need one.
ALTER TABLE marketing.landing_variants ADD COLUMN IF NOT EXISTS key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_landing_variants_page_key
    ON marketing.landing_variants (landing_page_id, key) WHERE key IS NOT NULL;

-- Free-text note on what this variant is testing and why (e.g. "urgency-focused headline +
-- green accent vs. control's neutral tone") — for a human skimming the list today, and later
-- an input an LLM agent can read/write when it proposes new variants for A/B testing.
ALTER TABLE marketing.landing_variants ADD COLUMN IF NOT EXISTS description TEXT;

CREATE TABLE IF NOT EXISTS marketing.experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id UUID NOT NULL REFERENCES marketing.landing_pages (id),
    status TEXT NOT NULL DEFAULT 'paused' CHECK (status IN ('active', 'paused')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_experiments_page ON marketing.experiments (landing_page_id);
-- At most one active experiment per landing page.
CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_experiments_active_page
    ON marketing.experiments (landing_page_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS marketing.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    landing_page_id UUID REFERENCES marketing.landing_pages (id),
    variant_id UUID REFERENCES marketing.landing_variants (id),
    event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'click', 'booking_started', 'booking_completed')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_events_session ON marketing.events (session_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_variant ON marketing.events (variant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_type ON marketing.events (event_type);
CREATE INDEX IF NOT EXISTS idx_marketing_events_created_at ON marketing.events (created_at);

CREATE TABLE IF NOT EXISTS marketing.attribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Square's real booking id (a string), not a UUID — matches submissions.square_booking_id so
    -- the two can be joined.
    booking_id TEXT NOT NULL,
    landing_page_id UUID REFERENCES marketing.landing_pages (id),
    variant_id UUID REFERENCES marketing.landing_variants (id),
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_attribution_booking_id ON marketing.attribution (booking_id);
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_variant ON marketing.attribution (variant_id);
"""

# SMS marketing consent — Square has no API for this at all (confirmed: Customer.preferences
# only has a read-only email_unsubscribed flag, nothing for SMS), so this is the sole source of
# truth. Append-only: a later opt-out is a new row, never an UPDATE, so the full consent/
# revocation history for a phone number is always reconstructable if consent is ever challenged.
_DDL_SMS_CONSENT = """
CREATE TABLE IF NOT EXISTS marketing.sms_consent (
    id BIGSERIAL PRIMARY KEY,
    phone_number TEXT NOT NULL,
    consented BOOLEAN NOT NULL,
    consent_text TEXT NOT NULL,
    consent_version TEXT NOT NULL,
    source TEXT NOT NULL,
    visitor_id UUID,
    ip_address TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_sms_consent_phone ON marketing.sms_consent (phone_number);
CREATE INDEX IF NOT EXISTS idx_marketing_sms_consent_occurred_at ON marketing.sms_consent (occurred_at);
"""

# Email marketing consent — same rationale/shape as sms_consent, kept as its own table (rather
# than a shared "channel" column) since the two have different semantics: SMS reflects an
# explicit customer choice, email is granted automatically on every booking regardless of it.
_DDL_EMAIL_CONSENT = """
CREATE TABLE IF NOT EXISTS marketing.email_consent (
    id BIGSERIAL PRIMARY KEY,
    email_address TEXT NOT NULL,
    consented BOOLEAN NOT NULL,
    consent_text TEXT NOT NULL,
    consent_version TEXT NOT NULL,
    source TEXT NOT NULL,
    visitor_id UUID,
    ip_address TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_email_consent_email ON marketing.email_consent (email_address);
CREATE INDEX IF NOT EXISTS idx_marketing_email_consent_occurred_at ON marketing.email_consent (occurred_at);
"""

# Leads captured as soon as Step 1 (name + phone, email optional) is submitted — before a real
# Square booking (and thus a Square customer) exists. phone_number is the dedup key since it's
# the only field guaranteed present at that point. original_traffic_source is set once, on first
# insert, and never overwritten on conflict — the booking columns stay null until/unless this
# contact later completes a real appointment (see update_contact_after_booking).
_DDL_CONTACTS = """
CREATE TABLE IF NOT EXISTS marketing.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL UNIQUE,
    given_name TEXT,
    email_address TEXT,
    original_traffic_source TEXT,
    marketing_traffic_source TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    referrer TEXT,
    sms_marketing_consent BOOLEAN,
    email_marketing_consent BOOLEAN,
    square_customer_id TEXT,
    square_booking_id TEXT,
    booking_status TEXT,
    booking_start_at TIMESTAMPTZ,
    booking_service_name TEXT,
    booking_price NUMERIC(10, 2),
    booking_artist_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_contacts_square_customer ON marketing.contacts (square_customer_id);
CREATE INDEX IF NOT EXISTS idx_marketing_contacts_created_at ON marketing.contacts (created_at);
"""

# landing_page_slug/variant_name describe the original capture context — resolved and
# denormalized (not a foreign key) at capture time so a later variant rename/delete never
# changes what a historical lead's record says it saw, and deleting a variant is never
# blocked by unrelated contacts data. device/os/browser reflect the most recent visit.
_DDL_CONTACTS_CAPTURE_CONTEXT = """
ALTER TABLE marketing.contacts ADD COLUMN IF NOT EXISTS landing_page_slug TEXT;
ALTER TABLE marketing.contacts ADD COLUMN IF NOT EXISTS variant_name TEXT;
ALTER TABLE marketing.contacts ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE marketing.contacts ADD COLUMN IF NOT EXISTS os_name TEXT;
ALTER TABLE marketing.contacts ADD COLUMN IF NOT EXISTS os_version TEXT;
ALTER TABLE marketing.contacts ADD COLUMN IF NOT EXISTS browser_name TEXT;
ALTER TABLE marketing.contacts ADD COLUMN IF NOT EXISTS browser_version TEXT;
"""

# Same landing_page_slug/variant_name denormalization as contacts, but on submissions — every
# submission (step1 lead capture, booking, four_hand_request) records which page/variant it came
# from, so the portal can show a contact's full multi-touch history, not just their latest state.
_DDL_SUBMISSIONS_LANDING_CONTEXT = """
ALTER TABLE marketing.submissions ADD COLUMN IF NOT EXISTS landing_page_slug TEXT;
ALTER TABLE marketing.submissions ADD COLUMN IF NOT EXISTS variant_name TEXT;
CREATE INDEX IF NOT EXISTS idx_marketing_submissions_customer_phone ON marketing.submissions (customer_phone);
CREATE INDEX IF NOT EXISTS idx_marketing_submissions_customer_email ON marketing.submissions (customer_email);
"""

# Raw utm_source/medium/campaign are empty for a direct visit or an organic referral (no
# campaign link involved) — that's correct, but it left the portal with nothing at all to show
# for "traffic source" on those submissions. classify_traffic_source() already solves exactly
# this for contacts.original_traffic_source/marketing_traffic_source (falls back through
# fbclid/gclid/referrer to "Direct / No referrer" — never blank); store that same classification
# per submission too.
_DDL_SUBMISSIONS_TRAFFIC_SOURCE = """
ALTER TABLE marketing.submissions ADD COLUMN IF NOT EXISTS traffic_source TEXT;
"""

# Every request rejected by the booking abuse guard (rate limit, honeypot, timing, failed
# Turnstile check) — a dedicated table rather than reusing marketing.events, since this is
# operational/security visibility for the owner, not funnel analytics, and has no
# landing_page_id/variant_id to attach to. Read by the owner portal's "blocked attempts" panel.
_DDL_ABUSE_BLOCKS = """
CREATE TABLE IF NOT EXISTS marketing.abuse_blocks (
    id BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    endpoint TEXT NOT NULL,
    reason TEXT NOT NULL,
    phone_number TEXT,
    ip_address TEXT
);
CREATE INDEX IF NOT EXISTS idx_marketing_abuse_blocks_occurred_at ON marketing.abuse_blocks (occurred_at);
"""

# Generic booking-funnel step progress, shared by every landing page's booking flow (mani,
# akluxnails-home's homepage, and any future one) even though the flows themselves have
# different numbers of steps and different step names/order (e.g. mani asks for contact info at
# step 1; homepage asks for it last). A dedicated table rather than cramming this into
# marketing.events, whose event_type CHECK constraint every existing row already depends on —
# this is purely additive and touches nothing else.
#
# Genericity comes from (flow_key, step_index, step_count_total), not from forcing every flow to
# share step_key names: flow_key identifies which flow definition produced the event, step_index
# is that step's 0-based position, step_count_total is how many steps that flow had *at event
# time* (denormalized so a later flow redesign never retroactively changes what an older row
# meant). Adding a new landing page/flow later needs no schema change — just a new flow_key.
_DDL_FUNNEL_EVENTS = """
CREATE TABLE IF NOT EXISTS marketing.funnel_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    landing_page_id UUID REFERENCES marketing.landing_pages (id),
    variant_id UUID REFERENCES marketing.landing_variants (id),
    flow_key TEXT NOT NULL,
    step_key TEXT NOT NULL,
    step_index INTEGER NOT NULL,
    step_count_total INTEGER NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_funnel_events_session ON marketing.funnel_events (session_id);
CREATE INDEX IF NOT EXISTS idx_marketing_funnel_events_variant ON marketing.funnel_events (variant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_funnel_events_flow_step ON marketing.funnel_events (flow_key, step_index);
CREATE INDEX IF NOT EXISTS idx_marketing_funnel_events_created_at ON marketing.funnel_events (created_at);
"""


async def run_migrations() -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(_DDL)
        await conn.execute(_DDL_EXPERIMENTS)
        await conn.execute(_DDL_SMS_CONSENT)
        await conn.execute(_DDL_EMAIL_CONSENT)
        await conn.execute(_DDL_CONTACTS)
        await conn.execute(_DDL_CONTACTS_CAPTURE_CONTEXT)
        await conn.execute(_DDL_SUBMISSIONS_LANDING_CONTEXT)
        await conn.execute(_DDL_SUBMISSIONS_TRAFFIC_SOURCE)
        await conn.execute(_DDL_ABUSE_BLOCKS)
        await conn.execute(_DDL_FUNNEL_EVENTS)
    logger.info("Marketing schema migrations applied")
