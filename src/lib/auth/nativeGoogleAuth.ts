import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { supabase } from "@/integrations/supabase/client";
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from "@/config/googleAuth";

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  await SocialLogin.initialize({
    google: {
      // ⚠️ Hamesha WEB client ID. Android client ID yahan NAHI aata —
      // Google Play Services APK ko SHA-1 + package name se pehchanta hai.
      webClientId: GOOGLE_WEB_CLIENT_ID,
      // Extra aliases some plugin versions read at runtime; not in the public types.
      clientId: GOOGLE_WEB_CLIENT_ID,
      serverClientId: GOOGLE_WEB_CLIENT_ID,
      ...(GOOGLE_IOS_CLIENT_ID ? { iOSClientId: GOOGLE_IOS_CLIENT_ID } : {}),
      // "online" mode is required so Google returns an idToken we can hand
      // to Supabase via signInWithIdToken.
      mode: "online",
    } as any,
  });
  initialized = true;
}

/**
 * Returns true when a native Google login should be used instead of the
 * Lovable managed web OAuth flow.
 */
export function shouldUseNativeGoogle(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Kya SocialLogin ka NATIVE module is APK me actually compile hua hai?
 *
 * Capacitor har registered plugin ko `capacitor.plugins.json` se load karta
 * hai. Agar `npx cap sync android` nahi chala, ya plugin ka Gradle module
 * build fail ho gaya, to plugin JS me to import ho jata hai lekin native
 * side missing rehta hai → "plugin is not implemented on android".
 * Isse hum PEHLE hi detect kar lete hain, call fail hone ka wait nahi karte.
 */
export function isNativeGooglePluginAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("SocialLogin");
}

/** Diagnostic string — toast/console me exact reason dikhane ke liye. */
export function nativeGoogleDiagnostics(): string {
  return [
    `platform=${Capacitor.getPlatform()}`,
    `native=${Capacitor.isNativePlatform()}`,
    `SocialLoginRegistered=${Capacitor.isPluginAvailable("SocialLogin")}`,
    `webClientId=${GOOGLE_WEB_CLIENT_ID ? "set" : "MISSING"}`,
  ].join(" | ");
}

/** True when the thrown error means the native module is not in the APK. */
function isUnimplemented(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | undefined;
  const msg = String(err?.message ?? e ?? "").toLowerCase();
  return (
    err?.code === "UNIMPLEMENTED" ||
    msg.includes("not implemented") ||
    msg.includes("not available") ||
    msg.includes("plugin is not")
  );
}

/**
 * Native Google sign-in for Capacitor (Android / iOS).
 *
 * Flow: open native Google account picker → get idToken → exchange it with
 * Lovable Cloud (Supabase) via signInWithIdToken. No webview, no /~oauth
 * redirect, so no 404 inside the standalone app.
 *
 * ⚠️ We do NOT gate on Capacitor.isPluginAvailable("SocialLogin"). That flag
 * reads Capacitor.PluginHeaders, which stays empty when the generated
 * capacitor.plugins.json is missing from the APK — even though the plugin is
 * registered natively in MainActivity and calls work fine. Gating on it forced
 * a browser fallback on perfectly good builds. Instead we call the plugin and
 * only fall back when the bridge itself answers UNIMPLEMENTED.
 */
export async function nativeGoogleSignIn(): Promise<void> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      "Google Web Client ID set nahi hai. src/config/googleAuth.ts me GOOGLE_WEB_CLIENT_ID paste karo."
    );
  }

  if (!Capacitor.isNativePlatform()) {
    const err = new Error("Not a native platform") as Error & { code?: string };
    err.code = "UNIMPLEMENTED";
    throw err;
  }

  try {
    await ensureInitialized();
  } catch (e) {
    if (isUnimplemented(e)) {
      const err = new Error(
        `SocialLogin native module APK me registered nahi hai (${nativeGoogleDiagnostics()})`
      ) as Error & { code?: string };
      err.code = "UNIMPLEMENTED";
      throw err;
    }
    throw e;
  }

  let res: unknown;
  try {
    res = await SocialLogin.login({
      provider: "google",
      options: {
        scopes: ["email", "profile"],
      },
    });
  } catch (e) {
    if (isUnimplemented(e)) {
      const err = new Error(
        `SocialLogin native module APK me registered nahi hai (${nativeGoogleDiagnostics()})`
      ) as Error & { code?: string };
      err.code = "UNIMPLEMENTED";
      throw err;
    }
    throw e;
  }


  // The plugin returns the Google credentials inside `result`. idToken shape
  // can vary slightly across versions, so read defensively.
  const result = ((res as unknown as { result?: Record<string, unknown> })
    ?.result ?? {}) as Record<string, unknown>;
  const idToken =
    (result.idToken as string | undefined) ??
    ((result.authentication as { idToken?: string } | undefined)?.idToken as
      | string
      | undefined);

  if (!idToken) {
    throw new Error(
      "Google se idToken nahi mila. Google Cloud me Android client (package com.shaverse.app + SHA-1) aur Web client ID check karo."
    );
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });

  if (error) throw error;
}
