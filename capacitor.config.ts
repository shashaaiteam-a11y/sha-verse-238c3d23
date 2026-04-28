import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Sha-Verse Capacitor configuration.
 *
 * ⚠️ BEFORE PLAY STORE RELEASE:
 *   1. DELETE the entire `server` block below (otherwise the released app will
 *      load from the Lovable preview URL instead of the bundled `dist/` assets).
 *   2. Set `AdMob.initializeForTesting` to `false`.
 *   3. Replace test AdMob App ID in android/app/src/main/AndroidManifest.xml
 *      with the real one from your AdMob console.
 *
 * See NATIVE_BUILD_GUIDE.md and ADMOB_LAUNCH_CHECKLIST.md for full steps.
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.b16b27b99c4646308c45b59b2b0e9094',
  appName: 'Sha-Verse',
  webDir: 'dist',
  // ⚠️ DEV ONLY — remove before release build
  server: {
    url: 'https://b16b27b9-9c46-4630-8c45-b59b2b0e9094.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#2563eb',
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
    AdMob: {
      // ⚠️ Flip to `false` before Play Store release.
      initializeForTesting: true,
      testingDevices: [],
      requestTrackingAuthorization: true,
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
