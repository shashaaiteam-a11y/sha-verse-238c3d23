import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { supabase } from "@/integrations/supabase/client";
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from "@/config/googleAuth";

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  await SocialLogin.initialize({
    google: {
      webClientId: GOOGLE_WEB_CLIENT_ID,
      ...(GOOGLE_IOS_CLIENT_ID ? { iOSClientId: GOOGLE_IOS_CLIENT_ID } : {}),
      // "online" mode is required so Google returns an idToken we can hand
      // to Supabase via signInWithIdToken.
      mode: "online",
    },
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
 * Native Google sign-in for Capacitor (Android / iOS).
 *
 * Flow: open native Google account picker → get idToken → exchange it with
 * Lovable Cloud (Supabase) via signInWithIdToken. No webview, no /~oauth
 * redirect, so no 404 inside the standalone app.
 */
export async function nativeGoogleSignIn(): Promise<void> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      "Google Web Client ID set nahi hai. src/config/googleAuth.ts me GOOGLE_WEB_CLIENT_ID paste karo."
    );
  }

  await ensureInitialized();

  const res = await SocialLogin.login({
    provider: "google",
    options: {
      scopes: ["email", "profile"],
    },
  });

  // The plugin returns the Google credentials inside `result`. idToken shape
  // can vary slightly across versions, so read defensively.
  const result = (res as { result?: Record<string, unknown> })?.result ?? {};
  const idToken =
    (result.idToken as string | undefined) ??
    ((result as { authentication?: { idToken?: string } }).authentication
      ?.idToken as string | undefined);

  if (!idToken) {
    throw new Error("Google se idToken nahi mila. Setup (Web client ID) check karo.");
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });

  if (error) throw error;
}
