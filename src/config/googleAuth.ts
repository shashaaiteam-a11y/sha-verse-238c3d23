/**
 * Google native sign-in configuration (Android / iOS only).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  WEB LOGIN par iska koi asar NAHI hota — website Lovable managed OAuth
 *  use karti rahegi. Yeh sirf native (Capacitor) app ke liye hai.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Yahan apna **Web client ID** paste karo (Google Cloud Console se).
 * Native Google sign-in jo idToken deta hai uska `aud` = yeh Web client ID
 * hota hai, aur Lovable Cloud ke Google provider me bhi yahi client ID set
 * hona chahiye (Users → Authentication Settings → Google).
 *
 * Format: "1234567890-abcd....apps.googleusercontent.com"
 */
export const GOOGLE_WEB_CLIENT_ID = "";

/**
 * iOS client ID (sirf tab chahiye jab iOS native build banao).
 * Android-only ke liye khaali chhod sakte ho.
 */
export const GOOGLE_IOS_CLIENT_ID = "";
