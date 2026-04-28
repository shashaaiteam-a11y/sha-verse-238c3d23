# Native Build Guide — Sha-Verse on Android

Run all commands on **your own PC** (Windows / Mac / Linux). Lovable sandbox cannot build native binaries.

## Prerequisites
- **Node.js 18+** and **npm**
- **Android Studio** (latest) — installs Android SDK, build tools, emulator
- **JDK 17** (Android Studio bundles one)
- A **physical Android phone** with Developer Options + USB Debugging ON _(recommended over emulator for testing AdMob)_

---

## Step 1 — Export & Clone

1. In Lovable: **GitHub → Push to GitHub** → create repo `sha-verse`.
2. On your PC:
   ```bash
   git clone https://github.com/<your-username>/sha-verse.git
   cd sha-verse
   npm install
   ```

## Step 2 — Add Android Platform (one time)

```bash
npx cap add android
npx cap sync android
```
This creates the `android/` folder. Commit it to git.

## Step 3 — Configure AdMob App ID in AndroidManifest

Open `android/app/src/main/AndroidManifest.xml`. Inside the `<application>` tag (anywhere) add:

```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-3940256099942544~3347511713"/>
```

> This is the Google **test** App ID — safe to use during development.
> Replace with your real App ID before Play Store release (see `ADMOB_LAUNCH_CHECKLIST.md`).

Make sure these permissions exist (usually already there):
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
```

## Step 4 — Generate App Icons & Splash

```bash
npm install --save-dev @capacitor/assets
mkdir -p resources
# Drop a 1024x1024 PNG named logo.png into resources/
# Drop a 2732x2732 PNG named splash.png into resources/ (centered logo on bg)
npx capacitor-assets generate --android
```

## Step 5 — Build & Run

**Option A: Real device (recommended for AdMob)**
1. Connect phone via USB, accept "Allow USB debugging" prompt.
2. Verify connection: `adb devices` should list it.
3. Run:
   ```bash
   npm run build
   npx cap sync android
   npx cap run android
   ```

**Option B: Emulator**
1. Open Android Studio → Device Manager → create a Pixel 6 / API 34 emulator.
2. Start emulator.
3. `npx cap run android` and pick the emulator.

## Step 6 — Verify Test Ads

When the app launches:

- **Browser console (chrome://inspect → your device)** must show:
  ```
  🧪 TEST ADS MODE ACTIVE — Real ads disabled.
  [AdMob] initialized { testMode: true }
  ```
- Open NovaChat → tap "Watch ad to unlock 10 messages" → a Google **TEST** rewarded video should play, ending with the reward toast.
- Scroll Home feed → after every 5 posts you should see a banner with the "🧪 Test Ad" badge.

If you see real ads instead of test ads, **stop** and flip `USE_TEST_ADS = true` in `src/lib/ads/adConfig.ts`.

## Step 7 — Iterate

When you make changes in Lovable:
```bash
git pull
npm install            # only if package.json changed
npm run build
npx cap sync android   # copies dist/ + plugin updates into android/
npx cap run android
```

> **Hot reload**: while `server.url` is in `capacitor.config.ts`, the installed app loads live from the Lovable preview — you don't need to rebuild for UI changes. Native plugin / config changes still require `cap sync`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| App crashes on launch | AdMob App ID missing from `AndroidManifest.xml`. |
| `npx cap run android` says "no devices" | `adb devices` empty → re-enable USB debugging, change USB cable, or revoke + re-authorize on phone. |
| White screen | Wrong `server.url` or missing internet. Check phone wifi & re-sync. |
| "SDK location not found" | Open project in Android Studio once (`npx cap open android`) so it auto-creates `local.properties`. |
| Gradle build slow first time | Normal — downloads ~1.5 GB of dependencies. |

## Next Step
Once test ads work cleanly, proceed to [`ADMOB_LAUNCH_CHECKLIST.md`](./ADMOB_LAUNCH_CHECKLIST.md) for the real-ads switch and Play Store upload.
