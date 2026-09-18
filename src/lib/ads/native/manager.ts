/**
 * Central native ad manager.
 *
 * Responsibilities:
 * - single SDK initialisation
 * - one request per slot, with a minimum ad lifetime (Google recommends
 *   persisting a native ad for ~60s instead of refreshing aggressively)
 * - controlled exponential backoff on NO_FILL / network / timeout errors
 * - global in-flight cap so scrolling never triggers a request storm
 * - lifecycle cleanup of every attached native view
 *
 * It never fabricates impressions, never auto-scrolls and never issues
 * programmatic clicks — the Google Mobile Ads SDK owns all of that.
 */
import { ShaNativeAd, isNativeAdsSupported, type NativeAdEvent } from "./bridge";
import { adUnitForPlacement, type NativePlacementId } from "./placements";

export const MIN_AD_LIFETIME_MS = 60_000;
const MAX_CONCURRENT_LOADS = 2;
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 10 * 60_000;
const MAX_ATTEMPTS = 4;

type SlotState = "idle" | "loading" | "loaded" | "failed";

interface SlotRecord {
  placement: NativePlacementId;
  state: SlotState;
  loadedAt: number;
  attempts: number;
  nextRetryAt: number;
}

type SlotListener = (state: SlotState) => void;

const slots = new Map<string, SlotRecord>();
const listeners = new Map<string, Set<SlotListener>>();
const placementBackoff = new Map<NativePlacementId, { attempts: number; nextAt: number }>();

let inFlight = 0;
let initPromise: Promise<void> | null = null;
let eventsBound = false;

export type AdAnalyticsEvent =
  | "ad_request"
  | "ad_loaded"
  | "ad_impression"
  | "ad_clicked"
  | "ad_failed"
  | "ad_paid_event";

type AnalyticsSink = (
  event: AdAnalyticsEvent,
  placement: NativePlacementId,
  detail?: Record<string, unknown>,
) => void;

let analyticsSink: AnalyticsSink = () => {};

export function setAdAnalyticsSink(sink: AnalyticsSink) {
  analyticsSink = sink;
}

function notify(slotId: string) {
  const record = slots.get(slotId);
  if (!record) return;
  listeners.get(slotId)?.forEach((cb) => cb(record.state));
}

export function subscribeSlot(slotId: string, cb: SlotListener): () => void {
  let set = listeners.get(slotId);
  if (!set) {
    set = new Set();
    listeners.set(slotId, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
    if (set!.size === 0) listeners.delete(slotId);
  };
}

async function ensureInit(): Promise<void> {
  if (!isNativeAdsSupported()) return;
  if (!initPromise) {
    initPromise = ShaNativeAd.initialize().catch(() => {
      initPromise = null;
    }) as Promise<void>;
  }
  await initPromise;
  bindEvents();
}

function handleTerminal(slotId: string, ok: boolean) {
  const record = slots.get(slotId);
  if (!record || record.state !== "loading") return;
  inFlight = Math.max(0, inFlight - 1);
  if (ok) {
    record.state = "loaded";
    record.loadedAt = Date.now();
    record.attempts = 0;
    placementBackoff.delete(record.placement);
  } else {
    record.state = "failed";
    record.attempts += 1;
    const prev = placementBackoff.get(record.placement)?.attempts ?? 0;
    const attempts = Math.max(prev + 1, record.attempts);
    const delay = Math.min(BASE_BACKOFF_MS * 2 ** (attempts - 1), MAX_BACKOFF_MS);
    record.nextRetryAt = Date.now() + delay;
    placementBackoff.set(record.placement, { attempts, nextAt: record.nextRetryAt });
  }
  notify(slotId);
}

function bindEvents() {
  if (eventsBound || !isNativeAdsSupported()) return;
  eventsBound = true;

  const track = (event: AdAnalyticsEvent) => (data: NativeAdEvent) => {
    const record = slots.get(data.slotId);
    if (!record) return;
    analyticsSink(event, record.placement, {
      code: data.code,
      valueMicros: data.valueMicros,
      currency: data.currency,
      precision: data.precision,
    });
  };

  void ShaNativeAd.addListener("adRequest", track("ad_request"));
  void ShaNativeAd.addListener("adImpression", track("ad_impression"));
  void ShaNativeAd.addListener("adClicked", track("ad_clicked"));
  void ShaNativeAd.addListener("adPaid", track("ad_paid_event"));

  void ShaNativeAd.addListener("adLoaded", (data) => {
    track("ad_loaded")(data);
    handleTerminal(data.slotId, true);
  });
  void ShaNativeAd.addListener("adFailed", (data) => {
    track("ad_failed")(data);
    handleTerminal(data.slotId, false);
  });
}

/** Requests an ad for a slot, honouring throttling, backoff and the load cap. */
export async function requestSlot(slotId: string, placement: NativePlacementId): Promise<void> {
  if (!isNativeAdsSupported()) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  const now = Date.now();
  const existing = slots.get(slotId);

  if (existing) {
    if (existing.state === "loading") return;
    if (existing.state === "loaded" && now - existing.loadedAt < MIN_AD_LIFETIME_MS) return;
    if (existing.state === "failed") {
      if (existing.attempts >= MAX_ATTEMPTS) return;
      if (now < existing.nextRetryAt) return;
    }
  }

  const backoff = placementBackoff.get(placement);
  if (backoff && now < backoff.nextAt) return;
  if (inFlight >= MAX_CONCURRENT_LOADS) return;

  const record: SlotRecord = existing ?? {
    placement,
    state: "idle",
    loadedAt: 0,
    attempts: 0,
    nextRetryAt: 0,
  };
  record.placement = placement;
  record.state = "loading";
  slots.set(slotId, record);
  inFlight += 1;
  notify(slotId);

  try {
    await ensureInit();
    await ShaNativeAd.load({ slotId, adUnitId: adUnitForPlacement(placement), placement });
  } catch {
    handleTerminal(slotId, false);
  }
}

export async function updateSlotBounds(
  slotId: string,
  rect: { x: number; y: number; width: number; height: number; visible: boolean },
): Promise<void> {
  if (!isNativeAdsSupported()) return;
  if (slots.get(slotId)?.state !== "loaded") return;
  try {
    await ShaNativeAd.setBounds({ slotId, ...rect });
  } catch {
    /* never break the UI */
  }
}

export async function releaseSlot(slotId: string): Promise<void> {
  const record = slots.get(slotId);
  if (record?.state === "loading") inFlight = Math.max(0, inFlight - 1);
  slots.delete(slotId);
  listeners.delete(slotId);
  if (!isNativeAdsSupported()) return;
  try {
    await ShaNativeAd.destroy({ slotId });
  } catch {
    /* no-op */
  }
}

export function getSlotState(slotId: string): SlotState {
  return slots.get(slotId)?.state ?? "idle";
}
