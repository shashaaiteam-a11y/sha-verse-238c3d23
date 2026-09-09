/**
 * Public Firebase web config for browser push (FCM Web).
 *
 * These values are publishable by design (same class as the Supabase anon key).
 * The Android app does NOT use them — it reads android/app/google-services.json.
 *
 * Web push stays silently disabled until VITE_FIREBASE_VAPID_KEY is provided.
 */
export const firebaseWebConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyD_Uf7TWnAw8MDgKBazm6NGNZqlFF6mi5Y',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'sha-verse-supabase-34eb2',
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID ?? '990900245490',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

export const firebaseVapidKey: string = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '';

export const isWebPushConfigured = (): boolean =>
  Boolean(firebaseWebConfig.appId && firebaseVapidKey && firebaseWebConfig.messagingSenderId);
