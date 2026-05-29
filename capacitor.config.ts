import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shaverse.app',
  appName: 'Sha-Verse',
  webDir: 'dist',
  // ⚡ HOT-RELOAD (sirf development ke liye):
  // Jab tak ye `server.url` yahan hai, installed app live Lovable preview se
  // load hoti hai — UI changes turant dikhte hain, baar baar build nahi karna padta.
  // ⚠️ PLAY STORE / PRODUCTION release se PEHLE poora `server` block HATA dena,
  //    warna app store ki jagah preview URL load karegi.
  server: {
    url: 'https://b16b27b9-9c46-4630-8c45-b59b2b0e9094.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  // Native WebView background matches app theme so overscroll bounce
  // never shows a white flash (Facebook / WhatsApp / YouTube pattern).
  backgroundColor: '#0F172A',
  android: {
    backgroundColor: '#0F172A',
    allowMixedContent: true,
  },
  ios: {
    backgroundColor: '#0F172A',
    // We handle insets in CSS via env(safe-area-inset-*)
    contentInset: 'never',
  },
  plugins: {
    AdMob: {
      initializeForTesting: true,
    },
    StatusBar: {
      // App content extends behind the status bar so env(safe-area-inset-top)
      // returns a real value on Android (matches Facebook / WhatsApp / YouTube behavior).
      overlaysWebView: true,
      style: 'DEFAULT',
      backgroundColor: '#00000000',
    },
  },
};

export default config;
