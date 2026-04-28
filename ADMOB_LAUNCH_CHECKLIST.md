# AdMob → Play Store Launch Checklist

A 30-point gate. Don't skip steps — Google bans accounts for the smallest mistake.

---

## A. AdMob Account Setup

- [ ] **A1.** Create AdMob account at https://admob.google.com (use a Gmail you control long-term).
- [ ] **A2.** Add app → choose "Add a new app" → platform Android → "Is the app listed on a supported app store?" → **No** (not yet).
- [ ] **A3.** App name: **Sha-Verse**. Copy the generated **App ID** (`ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`).
- [ ] **A4.** Create 8 Ad Units (Ad units → Add ad unit). Names + formats:

  | # | Name | Format |
  |---|------|--------|
  | 1 | Sha Banner | Banner |
  | 2 | Sha Native Feed | Native advanced |
  | 3 | Sha Rewarded NovaChat | Rewarded |
  | 4 | Sha Rewarded Bookshelf | Rewarded |
  | 5 | Sha Rewarded Movion | Rewarded |
  | 6 | Sha Rewarded GroupBoost | Rewarded |
  | 7 | Sha Video Pre-roll | Rewarded |
  | 8 | Sha Video Mid-roll | Rewarded |

  Copy each Unit ID (`ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`).

  > **NO Interstitials** — your app rule.

## B. Switch Code to Real Ads

- [ ] **B1.** Open `src/lib/ads/adConfig.ts` → set `USE_TEST_ADS = false`.
- [ ] **B2.** In the same file, paste real Unit IDs into the `LIVE_AD_IDS` block.
- [ ] **B3.** Open `src/lib/ads/admobAppId.ts` → paste real App ID into `ADMOB_APP_ID_LIVE`.
- [ ] **B4.** Open `android/app/src/main/AndroidManifest.xml` → replace test App ID with real App ID in the `com.google.android.gms.ads.APPLICATION_ID` meta-data.
- [ ] **B5.** Open `capacitor.config.ts` → set `AdMob.initializeForTesting: false`.
- [ ] **B6.** Open `capacitor.config.ts` → **DELETE the entire `server` block** (so the released app uses bundled assets, not the Lovable preview URL).
- [ ] **B7.** Commit: `git commit -am "chore: switch to live AdMob"`.

## C. Generate Signed Release Bundle (AAB)

- [ ] **C1.** Generate keystore (ONCE — back this file up to 3 places, losing it = can never update app):
  ```bash
  cd android/app
  keytool -genkey -v -keystore sha-verse.keystore -alias sha-verse \
    -keyalg RSA -keysize 2048 -validity 10000
  ```
  Use a strong password. **Save passwords + .keystore in a password manager + cloud backup + USB drive.**

- [ ] **C2.** Edit `android/app/build.gradle`, inside `android { ... }`:
  ```gradle
  signingConfigs {
    release {
      storeFile file('sha-verse.keystore')
      storePassword System.getenv("KEYSTORE_PASS") ?: "<your-pass>"
      keyAlias 'sha-verse'
      keyPassword System.getenv("KEY_PASS") ?: "<your-pass>"
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
  }
  ```

- [ ] **C3.** Add to `.gitignore`:
  ```
  android/app/sha-verse.keystore
  android/key.properties
  ```

- [ ] **C4.** Build:
  ```bash
  npm run build
  npx cap sync android
  cd android
  ./gradlew bundleRelease
  ```
  Output: `android/app/build/outputs/bundle/release/app-release.aab` (~20–40 MB).

## D. Play Console Setup

- [ ] **D1.** Pay one-time **$25** at https://play.google.com/console.
- [ ] **D2.** Create app → fill basic details (app name, default language, app type = App, free/paid = Free).
- [ ] **D3.** **Store listing**:
  - App name (max 30 char): `Sha-Verse: Social Universe`
  - Short description (max 80): `Connect, share videos, read books, chat with AI — all in one app.`
  - Full description (max 4000): write 4-paragraph description with keywords.
  - App icon: 512×512 PNG.
  - Feature graphic: 1024×500 PNG.
  - Phone screenshots: 2–8 (min 1080px on shortest side).
- [ ] **D4.** **Privacy policy URL**: must be public. Host one at `https://sha-verse.com/privacy`. Mention: data collected (email, name, photos, location optional), AdMob personalized ads, analytics, contact email.
- [ ] **D5.** **App content** (left sidebar):
  - Privacy policy ✅
  - Ads → "Yes, my app contains ads" ✅
  - Content rating questionnaire (Social → likely Teen/13+).
  - Target audience: 13+.
  - Data safety form: declare every data type collected (email, photos, messages, etc.).
  - Government apps / financial apps / news apps: **No**.
- [ ] **D6.** **Production track** → Create new release → Upload `app-release.aab`.
- [ ] **D7.** Release notes (English): "Initial public release of Sha-Verse — your unified social, video, AI, books, and groups app."
- [ ] **D8.** Save → Review release → **Start rollout to Production**.

## E. Post-Submission

- [ ] **E1.** First review: 3–7 days. Watch email for "needs changes" notices.
- [ ] **E2.** Once **Approved**: app goes live at `https://play.google.com/store/apps/details?id=app.lovable.b16b27b99c4646308c45b59b2b0e9094`.
- [ ] **E3.** In **AdMob → Your app → App settings → Link to Play Store** → search & link. Required for highest fill rate.
- [ ] **E4.** Set up payments in AdMob: Settings → Payments → add bank account / address / tax info. Wait for verification PIN by post (2–4 weeks).
- [ ] **E5.** Reach **$100 lifetime earnings** → first payout sent automatically on the 21st of the next month.

---

## ⚠️ Account-Ban Risks (Read Twice)

| Action | Result |
|---|---|
| Click your own real ads (even once) | **Permanent AdMob ban**, all earnings forfeited |
| Ask friends/family to click ads | Permanent ban |
| Bot traffic / paid installs to inflate impressions | Permanent ban |
| Place ads on prohibited content (adult, copyrighted) | Permanent ban |
| Submit AAB with `USE_TEST_ADS = true` to Play Store | Earnings = $0 (still legal) |
| Forget AdMob meta-data in AndroidManifest | App **crashes on launch** for users |
| Keep `server.url` in capacitor.config.ts in release build | App loads from Lovable preview, breaks offline, fails review |

---

## Realistic Earnings Timeline (India audience, conservative)

| Month | DAU  | Daily impressions | Daily revenue (USD) |
|-------|------|-------------------|---------------------|
| 1     | 50   | ~400              | $0.20 – $0.80       |
| 3     | 500  | ~5,000            | $2 – $10            |
| 6     | 5K   | ~60,000           | $30 – $150          |
| 12    | 50K  | ~600,000          | $300 – $1,500       |

eCPM India: ~$0.50–$2 · US/EU: ~$3–$12 · Rewarded video: ~$10–$30 eCPM (highest).

**Levers for growth**: ASO (keywords), referral, push notifications (add later), share rewarded unlocks on social media, regular content updates.
