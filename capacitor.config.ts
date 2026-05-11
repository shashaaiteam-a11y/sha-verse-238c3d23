import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shaverse.app',
  appName: 'Sha-Verse',
  webDir: 'dist',
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
