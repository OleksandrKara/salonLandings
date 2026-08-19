# Multi-tenant salonLandings: AK PMU as the second business

**Status:** Phase 0 in progress. Not yet reviewed/approved beyond a verbal go-ahead in chat —
treat as a living working doc, revise as reality intrudes.

## Why

AK PMU (Anna Kara PMU) needs its own public booking landing page, the way AK.LUX.NAILS has
`mani.akluxnails.com` today. salaryReview's owner dashboard already reports on `marketing.*`
data for one business; extending that to a second business means salonLandings itself needs a
real "business" concept — today it has none: `Settings` is a single global object (one Square
account, one set of env vars for the whole process), and none of the 11 `marketing.*` tables
have a business/tenant column.

## Decision: reuse salaryReview's `business`/`square_connection`, don't duplicate them

salonLandings and salaryReview already share one Postgres instance (salonLandings owns
`marketing.*`, salaryReview owns everything else). Rather than inventing a second "business"
table + a second encrypted-Square-credential store in salonLandings, salonLandings resolves both
by calling a small new **internal API** on salaryReview (same `X-Internal-Api-Key` shared-secret
channel already used for the four-hand-request/rebooking-promo relay — no new trust boundary):

- `GET /api/internal/businesses/by-domain?domain=<host>` → `{businessId, name, timezone}` or 404.
  salaryReview's `business` table gets a new nullable `public_domain` column (the hostname its
  landing page is served on) — set for business 1 (`mani.akluxnails.com`, backfilled) and left
  null for business 2 until AK PMU's domain is chosen.
- `GET /api/internal/businesses/{id}/square-credentials` → `{accessToken, locationId, environment}`
  (decrypted via salaryReview's existing `SquareCredentialCipher`). salonLandings caches this
  in-process for a short TTL (mirrors `SquareClient`'s own caching philosophy) rather than
  calling it per-request.

This means: onboarding a business in salaryReview (already-built `/onboarding` flow) is *the*
place a business's Square connection ever gets configured — salonLandings never stores or
manages Square credentials of its own, for either business.

## Business resolution: by domain, not by session

salonLandings has no visitor login, so `CurrentBusinessContext`-style session resolution (as
salaryReview uses for its authenticated staff portal) doesn't apply. Instead: a FastAPI
dependency resolves `business_id` from the request's `Host` header on every request, via the
by-domain lookup above (cached). Every route/repository call downstream takes/uses that resolved
`business_id` — same shape as `CurrentBusinessContext`, just sourced from the request's hostname
instead of a session attribute.

## `marketing.*` schema

Every one of the 11 tables (`visits`, `submissions`, `contacts`, `sms_consent`, `email_consent`,
`abuse_blocks`, `landing_pages`, `landing_variants`, `experiments`, `events`, `attribution`,
`funnel_events`) gets an additive `business_id BIGINT NOT NULL` (nullable-then-backfilled,
mirroring salaryReview's own V84+ migration shape), backfilled to business 1 for every existing
row (all of it is AK.LUX.NAILS' data today). No FK to salaryReview's `business` table across the
schema boundary (different repo owns each side) — `business_id` is a plain, trusted-source
integer, matching how salaryReview's own no-FK-path tables (V88) already handle a foreign id.

## Booking flow: reuse the design, not the flow logic

The owner wants AK PMU's landing to **reuse mani's design as-is (just swap images/copy)** —
not a bespoke UI. The one real *functional* difference is the booking flow itself: PMU needs
deposit/consultation-first (see salaryReview tasks.md 0.8), not instant-book-against-availability
like nails. The schema already anticipates this: `marketing.funnel_events.flow_key` was
deliberately designed generic ("adding a new landing page/flow later needs no schema change —
just a new flow_key") — so the deposit-first flow is a new flow definition alongside the
existing one, not a fork of the app or a new frontend.

## Phasing

- **Phase 0** (salaryReview side, additive, zero risk to live mani traffic): `public_domain`
  column on `business` + the two internal endpoints above.
- **Phase 1** (salonLandings): `business_id` on all 11 `marketing.*` tables, backfilled to
  business 1. No behavior change yet.
- **Phase 2**: Host-header business-resolution dependency; thread `business_id` through every
  repository/route. Square client construction reads per-business credentials via the internal
  API instead of global `Settings`. Verified end-to-end against an isolated instance before
  touching the live checkout (this repo has no dev/live directory split like salaryReview does —
  extra care needed here).
- **Phase 3**: deposit/consultation-first flow (`flow_key`) for PMU.
- **Phase 4**: AK PMU's actual domain (once chosen), content/copy (needs the owner's input, or
  drafted with help), nginx vhost + TLS, deploy config.
