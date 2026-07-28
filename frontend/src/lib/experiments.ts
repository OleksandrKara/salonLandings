import { apiGet, apiPost } from "@/api/client";
import { getOrCreateVisitorId } from "@/lib/visitorId";
import type { ExperimentResolution, LandingVariant, LandingVariantContent, TrackingEventType } from "@/types/api";

const VARIANT_ASSIGNMENT_KEY = "mani_variant_assignment";

interface VariantAssignment {
  landingPageId: string;
  variantId: string;
}

export function getPersistedVariantAssignment(): VariantAssignment | null {
  const stored = localStorage.getItem(VARIANT_ASSIGNMENT_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as VariantAssignment;
  } catch {
    return null;
  }
}

function persistVariantAssignment(assignment: VariantAssignment): void {
  localStorage.setItem(VARIANT_ASSIGNMENT_KEY, JSON.stringify(assignment));
}

/** Cumulative-weight random pick; trivially returns the sole item for a 1-element list
 * (the fallback case when no experiment is running needs no special-casing here).
 */
function pickWeighted(variants: LandingVariant[]): LandingVariant {
  const totalWeight = variants.reduce((sum, v) => sum + Math.max(v.weight, 0), 0);
  if (totalWeight <= 0) return variants[0];

  let roll = Math.random() * totalWeight;
  for (const variant of variants) {
    roll -= Math.max(variant.weight, 0);
    if (roll <= 0) return variant;
  }
  return variants[variants.length - 1];
}

const PEDICURE_CAMPAIGN_PATTERN = /pedi/i;

/** Matches both "...pedi" and "...pedicure" ad-campaign naming conventions (confirmed against
 * real marketing.contacts/visits history, e.g. "Сайт 14.07pedi" and "27.07pedicure video") —
 * "pedi" is a substring of "pedicure", so one case-insensitive check covers both spellings.
 * Reads the fresh URL first, falling back to the persisted snapshot for a same-session visit
 * that no longer carries the ad's query params — mirrors lib/tracking.ts's own snapshot logic,
 * duplicated (not imported) to avoid a circular import: tracking.ts already imports
 * getPersistedVariantAssignment from this file. */
function isPedicureTraffic(): boolean {
  const fresh = new URLSearchParams(window.location.search).get("utm_campaign");
  if (fresh) return PEDICURE_CAMPAIGN_PATTERN.test(fresh);
  try {
    const stored = JSON.parse(localStorage.getItem("mani_tracking_snapshot") ?? "null") as {
      utm_campaign?: string | null;
    } | null;
    return PEDICURE_CAMPAIGN_PATTERN.test(stored?.utm_campaign ?? "");
  } catch {
    return false;
  }
}

/** A variant with `pedicureOverride` set otherwise renders as its own plain content (e.g. an
 * exact copy of the control variant) — this is what swaps it to the pedicure-focused pitch,
 * and only for visitors whose traffic actually looks pedicure-tagged. */
function applyPedicureOverride(content: LandingVariantContent): LandingVariantContent {
  if (!content.pedicureOverride || !isPedicureTraffic()) return content;
  return { ...content, ...content.pedicureOverride, defaultService: "pedicure" };
}

function logEvent(
  eventType: TrackingEventType,
  landingPageId: string | null,
  variantId: string | null,
  metadata: Record<string, unknown> = {},
): void {
  apiPost("/api/tracking/event", {
    session_id: getOrCreateVisitorId(),
    landing_page_id: landingPageId,
    variant_id: variantId,
    event_type: eventType,
    metadata,
  }).catch(() => {
    // analytics only — nothing to recover, nothing to surface to the visitor
  });
}

/**
 * Resolves which variant this visitor should see for a landing page: fetches active
 * variants from the server (which alone decides eligibility — see backend
 * ExperimentService), reuses a previously-persisted assignment if it's still valid,
 * otherwise does a weighted random pick and persists it, then logs a page_view.
 * Never throws — any failure yields empty content so the caller renders the hardcoded
 * default copy.
 */
export async function resolveExperiment(slug: string): Promise<{
  landingPageId: string | null;
  variantId: string | null;
  content: LandingVariantContent;
}> {
  // A campaign link (e.g. mani.akluxnails.com/?v=holiday-gold) forces that exact variant —
  // guarantees the visitor sees creative matching the ad, bypassing the random A/B pool.
  const variantKey = new URLSearchParams(window.location.search).get("v");
  const query = variantKey ? `?variant_key=${encodeURIComponent(variantKey)}` : "";

  let resolution: ExperimentResolution;
  try {
    resolution = await apiGet<ExperimentResolution>(`/api/experiments/${slug}${query}`);
  } catch {
    return { landingPageId: null, variantId: null, content: {} };
  }

  if (resolution.variants.length === 0) {
    return { landingPageId: resolution.landing_page_id, variantId: null, content: {} };
  }

  const persisted = getPersistedVariantAssignment();
  const stillEligible = persisted && resolution.variants.find((v) => v.id === persisted.variantId);
  const chosen = stillEligible ?? pickWeighted(resolution.variants);

  if (resolution.landing_page_id) {
    persistVariantAssignment({ landingPageId: resolution.landing_page_id, variantId: chosen.id });
  }

  logEvent("page_view", resolution.landing_page_id, chosen.id);

  return {
    landingPageId: resolution.landing_page_id,
    variantId: chosen.id,
    content: applyPedicureOverride(chosen.content),
  };
}

export { logEvent as logExperimentEvent };
