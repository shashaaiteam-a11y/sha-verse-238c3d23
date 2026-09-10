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
    // Capacitor 7 applies system-bar and display-cutout margins only where
    // Android 15+ enforces edge-to-edge, without changing older Android layouts.
    adjustMarginsForEdgeToEdge: "auto",
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
      // System-bar backgrounds are owned by Android's edge-to-edge rendering.
      // The plugin remains only for light/dark icon appearance.
      style: "DEFAULT",
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
