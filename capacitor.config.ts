import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shaverse.app',
  appName: 'Sha-Verse',
  webDir: 'dist',
  plugins: {
    AdMob: {
      initializeForTesting: true,
    },
  },
};

export default config;
