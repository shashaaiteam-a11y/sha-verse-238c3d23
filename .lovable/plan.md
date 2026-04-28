# SHA-VERSE: Native App + AdMob + Play Store Launch Plan

Aapka app code-side se kaafi mature hai. Yeh plan 5 phases me divided hai. Har phase me **kya karna hai + example + verification** diya hai.

---

## CURRENT STATE ANALYSIS (Health Check)

**✅ Already Done (Good news):**
- Capacitor 7 + Android + iOS plugins installed
- `@capacitor-community/admob` v8 already in dependencies
- Complete ads infrastructure: 16 ad components (Banner, Native, Rewarded, Pre-roll, Mid-roll, Sponsored, Sticky)
- `USE_TEST_ADS = true` flag in `src/lib/ads/adConfig.ts` (Google official test IDs in use — ✅ safe)
- Frequency capping logic: 20 ads/day, 2hr cooldown, new-user reduction
- DB tables: `ad_impressions`, `user_ad_preferences`, `rewarded_ad_unlocks`
- 6 modules functional: Home, Movion, NovaChat, Bookshelf, Groups, Profile
- Realtime: messaging, reactions, stories, notifications (channel-suffix stability rule applied)
- Security: 0 active issues from last scan, RLS hardened, audit log added
- PWA manifest + icons present

**⚠️ Issues / Missing for Native Launch:**
1. **No root `capacitor.config.ts`** — only one inside `omnihub-suite-main/` subfolder. Need root config.
2. **No `android/` or `ios/` folder** — these get generated locally on user's machine after GitHub export (cannot be created in Lovable sandbox).
3. **AdMob plugin not initialized** in app entry — `AdMob.initialize()` call missing from `src/main.tsx` or `App.tsx`.
4. **Banner/Native ad components currently render placeholder UI** — not yet wired to real `@capacitor-community/admob` calls (they show "Test Ad" badges but don't call native SDK).
5. **Real AdMob Unit IDs empty** in `LIVE_AD_IDS` block — must be filled before Play Store.
6. **`AndroidManifest.xml` AdMob App ID** needs to be added (mandatory by Google or app crashes on launch).
7. **No splash icon assets generated** for Android (need `@capacitor/assets` run).
8. **No signed release keystore** instructions documented.

**No critical bugs found** in module logic (security scans clean, realtime stable, RLS scoped). Issues are **packaging-level**, not feature-level.

---

## PHASE 1 — Pre-Native Code Fixes (in Lovable)

These changes I will make in the Lovable editor before you export to GitHub.

### 1.1 Create root `capacitor.config.ts`
```ts
// capacitor.config.ts (root)
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.b16b27b99c4646308c45b59b2b0e9094',
  appName: 'Sha-Verse',
  webDir: 'dist',
  server: {
    url: 'https://b16b27b9-9c46-4630-8c45-b59b2b0e9094.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 2000, backgroundColor: '#2563eb' },
    StatusBar: { style: 'LIGHT', backgroundColor: '#2563eb' },
    AdMob: {
      requestTrackingAuthorization: true,
      testingDevices: [],
      initializeForTesting: true, // ← flip to false after Play Store launch
    },
  },
  android: { allowMixedContent: true },
};
export default config;
```
> **Note**: `server.url` is for hot-reload during dev. Before final release build, this block must be **removed** (otherwise app loads from Lovable preview instead of bundled assets). I'll document this clearly.

### 1.2 Initialize AdMob SDK at app boot
Add to `src/main.tsx`:
```ts
import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  AdMob.initialize({
    initializeForTesting: true, // test mode
    testingDevices: [],
  }).catch(console.error);
}
```

### 1.3 Wire BannerAd component to real native SDK
Currently `BannerAd.tsx` shows a placeholder div. Update it to call:
```ts
AdMob.showBanner({
  adId: AD_IDS.banner,
  adSize: BannerAdSize.ADAPTIVE_BANNER,
  position: BannerAdPosition.BOTTOM_CENTER,
  isTesting: USE_TEST_ADS,
});
```
Plus matching wiring for Rewarded (`AdMob.showRewardVideoAd`) and Interstitial (skip — your rule says no interstitials).

### 1.4 Add `.env`-like AdMob App ID placeholder
Create `src/lib/ads/admobAppId.ts`:
```ts
// Replace with real App ID from AdMob console before Play Store
export const ADMOB_APP_ID_TEST = 'ca-app-pub-3940256099942544~3347511713';
export const ADMOB_APP_ID_LIVE = ''; // ← paste here on launch day
```

### 1.5 Add `HEALTH_CHECK.md` documenting findings
Module-by-module status, known limitations, and pre-launch checklist.

### 1.6 Add `NATIVE_BUILD_GUIDE.md`
Step-by-step terminal commands the user will run on their own machine after GitHub export.

---

## PHASE 2 — Export & First Native Build (on YOUR machine)

You cannot run these commands inside Lovable — Capacitor needs Android Studio/Xcode locally.

### 2.1 Export project to GitHub
- Lovable top-right → **GitHub → Push to GitHub** → create new repo `sha-verse`.

### 2.2 Clone & install on your PC
```bash
git clone https://github.com/<your-username>/sha-verse.git
cd sha-verse
npm install
```

### 2.3 Add Android platform
```bash
npx cap add android
npx cap sync android
```
This generates the `android/` folder.

### 2.4 Edit `android/app/src/main/AndroidManifest.xml`
Inside `<application>` tag, add:
```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-3940256099942544~3347511713"/>
```
(test ID — replace with your real App ID before Play Store).

Also add internet permission (usually already there):
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
```

### 2.5 Generate icons & splash
```bash
npm install --save-dev @capacitor/assets
# Place 1024x1024 logo.png and 2732x2732 splash.png in resources/
npx capacitor-assets generate
```

### 2.6 Run on emulator / device
```bash
npx cap run android
```
**Real-time example**: If you have a phone connected via USB with developer mode ON, the app installs on it directly. If using Android Studio emulator, start emulator first.

---

## PHASE 3 — Testing on Device (Test Ads Phase)

### 3.1 Smoke-test every module
| Module | What to test |
|---|---|
| Auth | Email signup, Google login, phone OTP |
| Home | Post create, reactions (👍❤️😆😢😡), share, comments, stories |
| Movion | Video upload, HLS playback, pre-roll test ad shows, mid-roll at 50% on 3min+ video |
| NovaChat | Send message, get Gemini response, "watch ad for 10 messages" rewarded button |
| Bookshelf | Open EPUB, page turns, every-20-pages inline ad, premium unlock via rewarded ad |
| Groups | Join, post, group native ad at 3rd position |
| Profile | Edit profile, upload cover, friend request, block |
| Realtime | Two devices: send message, see ticks, see typing, see reactions update live |

### 3.2 Verify Test Ads load
Open app → look for "🧪 Test Ad" badge on every ad slot. Console must show:
```
🧪 TEST ADS MODE ACTIVE — Real ads disabled.
```
If real ads load instead of test, **STOP** — you'd risk AdMob ban.

### 3.3 Performance check
- Memory under 250MB on a mid-range phone
- No crashes after 30min usage
- Realtime channels reconnect after airplane-mode toggle

### 3.4 Fix anything broken
Report back to me with screenshots + console logs. I'll patch in Lovable, you `git pull && npx cap sync android && npx cap run android`.

---

## PHASE 4 — Switch to Real AdMob (Pre-Publish)

### 4.1 Create AdMob account
1. Go to https://admob.google.com → Sign in with Google.
2. Add app → choose "Not yet published" → name "Sha-Verse" → Android.
3. Copy **App ID** (format `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`).

### 4.2 Create Ad Units (one per placement)
Create these 10 ad units in AdMob console:
- Banner (home feed, sticky)
- Native (home feed, group, sponsored cards)
- Rewarded (NovaChat unlock, bookshelf premium, ad-free hour, post boost)
- Rewarded Interstitial → skip (your rule: no interstitials)
- Video — pre-roll
- Video — mid-roll
- Video — shorts

Copy each Unit ID (format `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`).

### 4.3 Paste real IDs in code
Edit `src/lib/ads/adConfig.ts`:
```ts
export const USE_TEST_ADS = false;   // ← FLIP

const LIVE_AD_IDS = {
  banner: "ca-app-pub-1234.../1111111111",
  native: "ca-app-pub-1234.../2222222222",
  rewarded: "ca-app-pub-1234.../3333333333",
  // ... fill all 10
};
```
And `admobAppId.ts`:
```ts
export const ADMOB_APP_ID_LIVE = "ca-app-pub-1234...~5555555555";
```
And `AndroidManifest.xml` → replace test App ID with live.
And `capacitor.config.ts` → `initializeForTesting: false`.

### 4.4 ⚠️ DO NOT click your own ads
Even one click on a real ad on your own device = permanent AdMob ban. Use a friend's device for final QA, or keep test ads on your own phone forever.

---

## PHASE 5 — Play Store Publishing & Earning

### 5.1 Generate signed release APK/AAB
```bash
# In android/ folder, generate keystore (DO THIS ONCE, BACK IT UP)
keytool -genkey -v -keystore sha-verse.keystore -alias sha-verse \
  -keyalg RSA -keysize 2048 -validity 10000
```
**Store this `.keystore` file safely** — losing it means you can never update your app.

In `android/app/build.gradle`:
```gradle
signingConfigs {
  release {
    storeFile file('../../sha-verse.keystore')
    storePassword System.getenv("KEYSTORE_PASS")
    keyAlias 'sha-verse'
    keyPassword System.getenv("KEY_PASS")
  }
}
buildTypes {
  release { signingConfig signingConfigs.release }
}
```

### 5.2 Remove dev server URL
In `capacitor.config.ts`, **delete the `server` block** completely so app uses bundled assets:
```ts
// REMOVE this for release:
// server: { url: '...', cleartext: true }
```
Then:
```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 5.3 Create Play Console account
- https://play.google.com/console → $25 one-time fee.
- Create app → fill: name, short description (80 char), full description (4000 char), category (Social).
- Upload: 512x512 icon, feature graphic 1024x500, 2-8 phone screenshots.
- Privacy policy URL — host one on your domain `sha-verse.com/privacy`.
- Content rating questionnaire.
- Data safety form (declare: collects email, name, photos, location?).
- Target audience: 13+ (since social features).

### 5.4 Upload AAB
- Production track → Create new release → Upload `app-release.aab` → Review → Roll out.
- First review: typically 3–7 days.

### 5.5 Link AdMob ↔ Play Store
- In AdMob → app → "Link to Play Store" → select your published app. Required for higher fill-rate ads.

### 5.6 Earning timeline (realistic example)
| Week | Daily Active Users | Daily ad impressions | Daily revenue (est.) |
|---|---|---|---|
| 1 | 50 | ~400 | $0.20 – $0.80 |
| 4 | 500 | ~5,000 | $2 – $10 |
| 12 | 5,000 | ~60,000 | $30 – $150 |
| 6 months | 50,000 | ~600,000 | $300 – $1,500 |

eCPM in India: $0.50–$2 typical. Higher in US/EU.
**Minimum payout**: $100 (AdMob holds money until you cross this; pays via bank transfer).

### 5.7 Growth levers
- ASO (App Store Optimization): keywords in title + description
- Share rewarded-unlock features on social media
- Refer-a-friend (already in your social graph)
- Push notifications for re-engagement (add `@capacitor/push-notifications` later)

---

## DELIVERABLES (what I will create when you approve)

1. `capacitor.config.ts` — root config with AdMob plugin block
2. `src/main.tsx` — AdMob.initialize() on native
3. `src/lib/ads/admobAppId.ts` — App ID constants
4. `src/components/ads/BannerAd.tsx` — wired to real native banner
5. `src/components/ads/RewardedAdButton.tsx` — wired to real native rewarded
6. `src/hooks/useRewardedAd.ts` — call native SDK in production, simulate in test
7. `HEALTH_CHECK.md` — module-by-module status
8. `NATIVE_BUILD_GUIDE.md` — every command you'll run on your PC, with expected output
9. `ADMOB_LAUNCH_CHECKLIST.md` — 30-point pre-publish checklist

**No existing module logic, UI, or features will be changed** — only the ad rendering layer (currently stubs) gets connected to the real native SDK, gated by `Capacitor.isNativePlatform()` so web preview keeps working exactly as today.

---

## QUESTIONS BEFORE I IMPLEMENT

1. **Android only first, or Android + iOS together?** (iOS needs Mac + $99/yr Apple Dev account.)
2. **AdMob account ready ya pehle test ads pe hi build karein?** (Recommended: test ads first, switch later.)
3. **App icon + splash screen design ready hai?** Ya placeholder use karein abhi?

Approve karne ke baad I'll execute Phase 1 changes in Lovable, then guide you through Phase 2–5 on your machine.
