import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.shaverse.app",
  appName: "Sha-Verse",
  webDir: "dist",
  // Production builds must boot the bundled webDir in Capacitor's WebView.
  // Never add server.url here: it is a live-reload override and can hand app
  // startup/navigation to the public website or external browser.

  // Native WebView background matches app theme so overscroll bounce
  // never shows a white flash (Facebook / WhatsApp / YouTube pattern).
  backgroundColor: "#0F172A",
  android: {
    backgroundColor: "#0F172A",
    allowMixedContent: true,
  },
  ios: {
    backgroundColor: "#0F172A",
    // We handle insets in CSS via env(safe-area-inset-*)
    contentInset: "never",
  },
  plugins: {
    AdMob: {
      initializeForTesting: false,
    },
    StatusBar: {
      // App content extends behind the status bar so env(safe-area-inset-top)
      // returns a real value on Android (matches Facebook / WhatsApp / YouTube behavior).
      overlaysWebView: true,
      style: "DEFAULT",
      backgroundColor: "#00000000",
    },
    SocialLogin: {
      google: {
        webClientId: "1045450930549-7km1bdvipje80098fa6tajfm9936n3nv.apps.googleusercontent.com",
        clientId: "1045450930549-7km1bdvipje80098fa6tajfm9936n3nv.apps.googleusercontent.com",
        serverClientId: "1045450930549-7km1bdvipje80098fa6tajfm9936n3nv.apps.googleusercontent.com",
      },
    },
  },
};

export default config;
