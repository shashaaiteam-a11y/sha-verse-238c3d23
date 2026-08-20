/**
 * Google sign-in configuration.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  WEB LOGIN par iska koi asar NAHI hota — website Lovable managed OAuth
 *  use karti rahegi. Yeh sirf native (Capacitor) app ke liye hai.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Sabse important baat (yahi confusion ka source hai):
 *  Native Google sign-in me app hamesha **WEB client ID** hi plugin ko deta
 *  hai — Android client ID kabhi code me nahi jata. Android client sirf
 *  Google Cloud me register hota hai (package name + SHA-1) taaki Google
 *  Play Services aapke APK ko "trusted" maane. Us Android client ki wajah se
 *  jo idToken milta hai uska `aud` = WEB client ID hota hai, aur Supabase
 *  (Lovable Cloud) usi WEB client ID se verify karta hai.
 */

/** Web application OAuth client (Google Cloud → Credentials → Web). */
export const GOOGLE_WEB_CLIENT_ID =
  "1045450930549-7km1bdvipje80098fa6tajfm9936n3nv.apps.googleusercontent.com";

/**
 * Android OAuth client — sirf reference / debugging ke liye rakha hai.
 * Ye plugin ko PASS NAHI hota (aur karna bhi nahi chahiye).
 *
 * Google Cloud → Credentials → "Sha-Verse Android"
 *   Package name : com.shaverse.app
 *   SHA-1        : GOOGLE_ANDROID_SHA1 (neeche)
 */
export const GOOGLE_ANDROID_CLIENT_ID =
  "1045450930549-p11fcoehj7esm5n94ih5g7jreve8pevv.apps.googleusercontent.com";

/** Debug keystore SHA-1 jo Google Cloud Android client me registered hai. */
export const GOOGLE_ANDROID_SHA1 =
  "EE:68:B0:33:BA:C6:B6:C9:46:59:68:DA:9A:9E:1B:E1:69:77:32:C1";

/** Android package name (AndroidManifest.xml ka `package` / appId). */
export const ANDROID_PACKAGE_NAME = "com.shaverse.app";

/**
 * iOS client ID (sirf tab chahiye jab iOS native build banao).
 * Android-only ke liye khaali chhod sakte ho.
 */
export const GOOGLE_IOS_CLIENT_ID = "";
