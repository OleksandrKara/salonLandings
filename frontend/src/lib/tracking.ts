import { apiPost } from "@/api/client";
import { getPersistedVariantAssignment } from "@/lib/experiments";
import { getOrCreateVisitorId } from "@/lib/visitorId";
import type { TrackingSnapshot } from "@/types/api";

const SNAPSHOT_KEY = "mani_tracking_snapshot";

function captureSnapshotFromUrl(): TrackingSnapshot {
  const params = new URLSearchParams(window.location.search);
  return {
    visitor_id: getOrCreateVisitorId(),
    landing_path: window.location.pathname,
    referrer: document.referrer || null,
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
    fbclid: params.get("fbclid"),
    gclid: params.get("gclid"),
  };
}

/**
 * Attribution snapshot for this browser: persisted across the whole visit
 * (and future visits) so the booking modal can attach the same source info
 * a submission that happens minutes later, long after the ad-click URL
 * params would otherwise be gone. Refreshed only when a new ad click (fresh
 * UTM/click-id params) lands on the page, so a later distinct campaign visit
 * correctly overrides stale attribution instead of being stuck on the first
 * one forever.
 */
export function getTrackingSnapshot(): TrackingSnapshot {
  const params = new URLSearchParams(window.location.search);
  const hasFreshAdParams = ["utm_source", "fbclid", "gclid"].some((key) => params.has(key));

  if (!hasFreshAdParams) {
    const stored = localStorage.getItem(SNAPSHOT_KEY);
    if (stored) {
      try {
        return withVariantAssignment(JSON.parse(stored) as TrackingSnapshot);
      } catch {
        // fall through and recapture if the stored value is corrupt
      }
    }
  }

  const snapshot = captureSnapshotFromUrl();
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  return withVariantAssignment(snapshot);
}

/**
 * The variant assignment is merged in fresh on every call (not baked into the cached
 * SNAPSHOT_KEY payload) so it always reflects the visitor's current experiment
 * assignment, independent of whether the UTM-based snapshot above was a cache hit.
 */
function withVariantAssignment(snapshot: TrackingSnapshot): TrackingSnapshot {
  const assignment = getPersistedVariantAssignment();
  if (!assignment) return snapshot;
  return { ...snapshot, landing_page_id: assignment.landingPageId, variant_id: assignment.variantId };
}

/** Fire-and-forget: a failed tracking call must never affect the visitor's experience. */
export function recordVisit(): void {
  const snapshot = getTrackingSnapshot();
  apiPost("/api/tracking/visit", snapshot).catch(() => {
    // analytics only — nothing to recover, nothing to surface to the visitor
  });
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Meta's standard event for appointment bookings; fired once a booking or 4-hand request is confirmed. */
export function recordMetaBookingConversion(): void {
  window.fbq?.("track", "Schedule");
}
