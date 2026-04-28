/**
 * Thin wrapper around @capacitor-community/admob.
 *
 * - On native (Android/iOS): forwards calls to the real AdMob SDK.
 * - On web (Lovable preview, PWA): becomes a no-op so existing UI placeholders
 *   keep rendering exactly as before.
 *
 * This wrapper is the ONLY place that imports the AdMob plugin so the web
 * build never pulls in native-only code paths.
 */

import { Capacitor } from '@capacitor/core';
import { USE_TEST_ADS } from './adConfig';

export const isNative = (): boolean => Capacitor.isNativePlatform();

let initialized = false;

export async function initAdMob(): Promise<void> {
  if (!isNative() || initialized) return;
  try {
    const { AdMob } = await import('@capacitor-community/admob');
    await AdMob.initialize({
      initializeForTesting: USE_TEST_ADS,
      testingDevices: [],
    });
    initialized = true;
    // eslint-disable-next-line no-console
    console.log('[AdMob] initialized', { testMode: USE_TEST_ADS });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[AdMob] init failed', err);
  }
}

export async function showBanner(adUnitId: string): Promise<void> {
  if (!isNative()) return;
  try {
    const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
    await AdMob.showBanner({
      adId: adUnitId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: USE_TEST_ADS,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[AdMob] showBanner failed', err);
  }
}

export async function hideBanner(): Promise<void> {
  if (!isNative()) return;
  try {
    const { AdMob } = await import('@capacitor-community/admob');
    await AdMob.hideBanner();
  } catch {
    /* no-op */
  }
}

/** Show a rewarded video ad. Returns true if the user earned the reward. */
export async function showRewarded(adUnitId: string): Promise<boolean> {
  if (!isNative()) {
    // Web fallback: simulate a 3s ad in test mode so dev flow still works.
    await new Promise((r) => setTimeout(r, USE_TEST_ADS ? 3000 : 0));
    return true;
  }
  try {
    const { AdMob } = await import('@capacitor-community/admob');
    await AdMob.prepareRewardVideoAd({ adId: adUnitId, isTesting: USE_TEST_ADS });
    const result = await AdMob.showRewardVideoAd();
    return !!result; // SDK resolves with reward info on success
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[AdMob] showRewarded failed', err);
    return false;
  }
}
