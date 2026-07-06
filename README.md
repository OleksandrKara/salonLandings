# salonLandings

Public booking landing page for **AK.LUX.NAILS**, served at [mani.akluxnails.com](https://mani.akluxnails.com).
FastAPI backend + Square integration, React/Vite frontend, with a built-in A/B testing and
marketing-attribution layer.

## What this is

A conversion-focused landing page where a walk-in visitor can browse services/artists, check
real availability, and book an appointment directly against Square — no phone call required.
Every visit and booking is tagged with UTM/ad-click data so ad spend can be tied back to real
revenue (see [salaryReview](#related-repo-salaryreview) below).

## Architecture

```
Browser
  │
  ▼
nginx (mani.akluxnails.com, TLS via Certbot)
  │
  ├── /            → frontend (React/Vite, static build served by a Node container)
  └── /api/*        → backend (FastAPI)
                         │
                         ├── Square API (catalog, availability, bookings, customers)
                         ├── Cloudflare Turnstile (bot check on booking submission)
                         └── Postgres "marketing" schema (shared with salaryReview)
```

The Postgres `marketing` schema is **owned and migrated exclusively by this repo**
(`app/integrations/marketing_db/migrations.py`, plain idempotent DDL — no migration framework,
by design, until the schema outgrows that). [salaryReview](#related-repo-salaryreview) reads
from it but never writes or alters it.

## Features

- **Booking flow** — service catalog, artist selection, live availability, and booking creation
  against Square (`app/integrations/square/`), with post-booking hooks (`app/hooks/post_booking.py`)
  that attach marketing-attribution data back onto the Square customer record.
- **A/B testing / experiments** — landing pages can run multiple `variants` under an `experiment`;
  visits and page-view events are attributed to a variant and rolled up into per-variant
  performance (page views, contacts, bookings, conversion rate) on the owner dashboard in
  salaryReview.
- **Marketing attribution** — every visit records referrer, UTM params, `fbclid`/`gclid`, device,
  and OS/browser (`marketing.visits`); `traffic_source.py` turns that into a human-readable label
  ("Meta Ads (ig / Instagram_Stories / ...)", "Direct", "Google (organic)", etc.) used throughout
  the owner dashboard and ads-attributed-revenue reporting.
- **Contacts & consent** — every booking captures versioned SMS/email marketing consent
  (`app/domain/consent.py`) — server-controlled wording with a version tag, so the audit trail
  always reflects exactly what the customer was shown, independent of whether the checkbox was
  checked (SMS is opt-in; email consent is implied from completing a booking, consistent with
  CAN-SPAM's lighter bar vs. TCPA's for SMS).
- **Abuse guard** — rate-limiting / blocking for booking and tracking endpoints
  (`app/services/abuse_guard.py`, `marketing.abuse_blocks`), reviewable from the owner dashboard.

## Tech stack

| | |
|---|---|
| Backend | FastAPI, Pydantic Settings, `asyncpg`, official `squareup` SDK |
| Frontend | React 18, Vite, TypeScript |
| Database | Postgres (`marketing` schema; shared instance with salaryReview) |
| Bot protection | Cloudflare Turnstile |
| Deploy | Docker Compose, nginx reverse proxy, GitHub Actions → SSH to VPS |

## Repo structure

```
backend/
  app/
    api/routes/        # FastAPI routers: services, artists, availability, bookings,
                        # tracking, experiments, contacts
    core/               # settings, logging, cache
    domain/             # schemas, service catalog, consent language
    hooks/               # post-booking side effects (attribution write-back to Square)
    integrations/
      square/            # Square API client + typed wrappers per domain
      marketing_db/       # connection pool, migrations, repository for the marketing schema
      turnstile.py         # Cloudflare bot-check verification
    services/            # business logic (booking, availability, catalog, tracking, abuse guard)
    scripts/              # one-off/admin scripts (e.g. managing landing page variants)
frontend/
  src/
    features/
      landing/            # the public landing page sections (hero, services, reviews, footer, ...)
      booking/             # the booking flow
    api/, lib/, types/     # typed API client, shared utilities, shared types
nginx/                    # versioned snapshot of the live nginx vhost config
.github/workflows/deploy.yml   # CI (test) + CD (SSH deploy to VPS on main)
```

## Local development

Backend needs a `backend/.env` (gitignored) with at least:

```
SQUARE_ACCESS_TOKEN=...
SQUARE_LOCATION_ID=...
CORS_ALLOW_ORIGINS=http://localhost:5173
MARKETING_DB_HOST=...
MARKETING_DB_PASSWORD=...
```

See `app/core/config.py` for the full list of settings (all with sane defaults except the
Square credentials, which are required).

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

Or bring up the full stack (built images, against the real `.env`) with:

```bash
docker compose up -d --build
```

## Deployment

`main` deploys automatically on every push, via `.github/workflows/deploy.yml`:

1. **test** — backend import/compile sanity check (no real test suite exists yet — see below)
   plus frontend typecheck + production build.
2. **deploy** (only on push to `main`, after `test` passes) — SSHes into the VPS, `git reset --hard
   origin/main`, and runs `docker compose up -d --build`.

⚠️ Because deploy does a hard reset, any uncommitted work sitting in the VPS working tree at
merge time is discarded — always commit or stash before merging.

There is currently **no automated test suite** for the backend (`backend/tests/` is empty) or
frontend. CI's backend step is only an import/compile check. This is a known gap, not a design
choice — worth prioritizing before the retention-machine work below, since that feature will
touch billing-adjacent, consent-gated messaging where a regression is costly.

## Related repo: salaryReview

[salaryReview](../salaryReview) is the internal owner/manager dashboard
(salon.akluxnails.com, Spring Boot + Next.js). It reads the same `marketing` Postgres schema
this repo owns — variant performance, ads-attributed revenue, contacts, abuse blocks — and
layers a RAG knowledge-assistant, payroll, and reporting on top. The two repos share a Postgres
instance but not a codebase; schema changes only ever happen here.

## Roadmap: Retention Machine

The next major feature is a retention/re-engagement system — turning the contact and booking
history already being captured (`marketing.contacts`, Square customer/booking data, consent
records) into automated SMS and email outreach, rather than a one-time booking funnel.

**Planned building blocks:**

- **Segments** — audience definitions built from data already on hand: recency (e.g. "no visit
  in 60+ days"), lifetime value / visit frequency, preferred service/artist, no-shows, and
  ad-attribution source. Segments should be computable from the existing `marketing.contacts` +
  Square customer data without new tracking.
- **SMS via Twilio** — win-back nudges, appointment reminders, and last-minute opening alerts.
  Consent is already tracked per-customer (`marketing.sms_consent`, versioned wording in
  `app/domain/consent.py`) — sends must gate strictly on that, and honor STOP/opt-out per TCPA.
- **Email via Mailchimp** — sync segments to Mailchimp audiences and run campaigns (win-back
  series, promotions, occasion-based flows). `mailchimp_api_key` / `mailchimp_audience_id` are
  already reserved (no-op) in `app/core/config.py`, anticipating this.
- **AI for last-minute openings** — when a cancellation opens a same-day/next-day slot, use the
  segment data to pick the best-fit clients to notify (past bookers of that time/service,
  proximity, historical likelihood of filling last-minute slots) and draft the outreach
  automatically, rather than a blanket blast.

**Open questions to resolve before implementation:**

- Where segment/campaign state lives — a new `marketing` schema addition (keeping this repo as
  the sole owner) vs. a separate service.
- Rate limits / quiet hours and opt-out handling for SMS, to stay TCPA-compliant.
- Whether AI-picked last-minute-opening targeting needs a human-approval step before sending, at
  least initially.
