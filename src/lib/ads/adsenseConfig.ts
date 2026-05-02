/**
 * 🌐 SHA-VERSE ADSENSE CONFIG (Web only)
 *
 * AdSense = web ads (sha-verse.com).
 * AdMob   = app ads (Play Store) — completely separate (see adConfig.ts).
 *
 * Click rules (CRITICAL):
 *   ❌ NEVER click your own ads (owner / same WiFi / same IP) — instant lifetime ban.
 *   ❌ NEVER ask friends/family to click — incentivized clicks = ban.
 *   ✅ Real visitors clicking organically = how you actually earn.
 *
 * Production-only: AdSense script loads ONLY on the live domain (sha-verse.com).
 * Preview / localhost / Lovable sandbox → script never loads → zero accidental clicks.
 *
 * Setup:
 *   1. Apply at https://adsense.google.com (site needs ~3-6 months age + quality content)
 *   2. Once approved, paste your Publisher ID below as `ADSENSE_PUBLISHER_ID`
 *   3. Create ad units in AdSense dashboard → paste their slot IDs in ADSENSE_SLOTS
 *   4. Deploy.
 */

// 🟡 Replace with your real publisher ID once AdSense approves your site
//    Format: ca-pub-XXXXXXXXXXXXXXXX
export const ADSENSE_PUBLISHER_ID = "";

// Ad slot IDs from AdSense dashboard (numeric strings). Leave empty to disable that slot.
export const ADSENSE_SLOTS = {
  homeTop: "",
  homeFeed: "",
  sidebar: "",
  footer: "",
  inArticle: "",
} as const;

/** Production hosts where AdSense should actually load. */
const PRODUCTION_HOSTS = ["sha-verse.com", "www.sha-verse.com"];

/** True only when running on the real production website (not preview/localhost/native app). */
export const isAdSenseEligible = (): boolean => {
  if (typeof window === "undefined") return false;
  // Capacitor native app → use AdMob, not AdSense
  // @ts-expect-error Capacitor global may exist at runtime
  if (window.Capacitor?.isNativePlatform?.()) return false;
  const host = window.location.hostname;
  return PRODUCTION_HOSTS.includes(host) && ADSENSE_PUBLISHER_ID.startsWith("ca-pub-");
};
