/**
 * AdMob Application IDs.
 *
 * The App ID is also referenced in `android/app/src/main/AndroidManifest.xml`
 * under `com.google.android.gms.ads.APPLICATION_ID`. Both must match.
 *
 * ⚠️ Before Play Store release, paste your real App ID into ADMOB_APP_ID_LIVE
 * AND update AndroidManifest.xml.
 */

// Google official test App ID — safe to use during development.
export const ADMOB_APP_ID_TEST = "ca-app-pub-3940256099942544~3347511713";

// ⚠️ Replace with your real App ID from https://admob.google.com before launch.
export const ADMOB_APP_ID_LIVE = "ca-app-pub-2928763177849470~4226601339";

export const ADMOB_APP_ID = ADMOB_APP_ID_LIVE || ADMOB_APP_ID_TEST;
