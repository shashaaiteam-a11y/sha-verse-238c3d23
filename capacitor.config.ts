import type { CapacitorConfig } from '@capacitor/cli';

/**
 * 📱 SHA-VERSE Capacitor Configuration
 *
 * ⚠️ DEVELOPMENT vs PRODUCTION:
 *
 * DEVELOPMENT (Lovable preview pe live testing):
 *   - `server.url` enabled rakhein → app Lovable preview se live load karega
 *   - `npx cap sync` ke baad emulator/phone pe Lovable ka latest version dikhega
 *
 * PRODUCTION (Play Store ke liye build):
 *   - `server` block ko COMMENT OUT ya REMOVE karein (neeche dekhein)
 *   - App `dist/` folder se local build use karega
 *   - `npm run build && npx cap sync && npx cap open android` chalayein
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.b16b27b99c4646308c45b59b2b0e9094',
  appName: 'Sha-Verse',
  webDir: 'dist',

  // 🔴 PRODUCTION BUILD KE LIYE: Yeh `server` block COMMENT OUT karein
  server: {
    url: 'https://b16b27b9-9c46-4630-8c45-b59b2b0e9094.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#2563eb',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#2563eb',
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },

  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
  },

  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
