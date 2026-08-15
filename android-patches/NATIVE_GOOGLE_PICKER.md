# Fix: APK me Google account picker ki jagah web "Sign in to continue to sha-verse.com" page

## Kya ho raha hai
Aapko jo screen dikh rahi hai wo **web OAuth page** hai (Chrome Custom Tab).
Iska matlab: native plugin (`@capgo/capacitor-social-login`) APK me kaam nahi kar
raha, isliye app apne **web fallback** par chali gayi (`src/pages/Auth.tsx`).

Native Google picker (aapke phone ke gmail accounts ki list) tabhi khulega jab
teeno cheezein sahi hon:

1. Plugin native module APK me compile ho (Gradle build success).
2. Google Cloud me **Android OAuth client** bana ho — package name + SHA-1.
3. `GOOGLE_WEB_CLIENT_ID` (Web client) app aur Lovable Cloud dono me same ho.

Abhi 99% chance (1) ya (2) missing hai.

---

## Step 1 — Plugin native module install karo

PC par project folder me:

```bash
npm install
npm run build
npx cap sync android
```

Output me ye line dikhni chahiye:
```
√ Found 9 Capacitor plugins for android:
   ...
   @capgo/capacitor-social-login@7.x.x
```
Agar ye plugin list me **nahi** hai → sync fail hua hai, dobara chalao.

## Step 2 — Gradle errors fix (duplicate kotlin classes)

`android-patches/GOOGLE_SIGNIN_FIX.md` ke 4 patches lagao:
- `android/variables.gradle` → kotlin_version = '2.0.21', compileSdk 35
- `android/build.gradle` → resolutionStrategy force kotlin-stdlib + androidTest disable
- `android/app/build.gradle` → Java 17 + jvmTarget 17
- `android/gradle.properties` → jvmargs 4096m

Phir Android Studio me: **File → Sync Project with Gradle Files** →
**Build → Clean Project** → **Build → Rebuild Project**.

Build Output me ye dikhna chahiye:
```
:capgo-capacitor-social-login:compileDebugKotlin   ✓
BUILD SUCCESSFUL
```
Jab tak ye line nahi aati, native picker nahi khulega.

## Step 3 — SHA-1 fingerprint nikaalo (SABSE ZAROORI)

Android Studio ke neeche **Terminal** tab kholo, project root me:

```bash
cd android
./gradlew signingReport        # Windows: gradlew.bat signingReport
```

Output me `Variant: debug` wale block se copy karo:
```
SHA1: A1:B2:C3:...:FF
```
(Play Store release ke liye: Play Console → Setup → App integrity →
**App signing key certificate** ka SHA-1 bhi add karna hoga.)

## Step 4 — Google Cloud Console me Android client banao

1. https://console.cloud.google.com → apna project select karo.
2. Left menu → **APIs & Services → Credentials**.
3. Upar **+ CREATE CREDENTIALS → OAuth client ID**.
4. Application type: **Android**.
5. Name: `Sha-Verse Android`
6. Package name: `com.shaverse.app`
7. SHA-1 certificate fingerprint: Step 3 wala SHA-1 paste karo.
8. **CREATE**.

Debug aur release dono SHA-1 ke liye alag-alag Android client banao (ya baad me
add karo). Bina iske native picker `DEVELOPER_ERROR (10)` deta hai aur app web
page par gir jaati hai — bilkul wahi jo aapko dikh raha hai.

⚠️ Android client ka client ID app me **paste nahi karna**. App me sirf
**Web client ID** rehta hai (`src/config/googleAuth.ts`) — yahi correct hai.

## Step 5 — Web client ID verify

`src/config/googleAuth.ts`:
```
GOOGLE_WEB_CLIENT_ID = "1045450930549-7km1bdvipje80098fa6tajfm9936n3nv.apps.googleusercontent.com"
```
Ye exact same ID Lovable Cloud → Users → Authentication Settings → Google me bhi
honi chahiye. Alag hui to `signInWithIdToken` "invalid audience" dega.

## Step 6 — Rebuild aur test

```bash
npm run build
npx cap sync android
npx cap run android
```

App me Google button dabao:
- ✅ Sahi: neeche se **bottom sheet** khulti hai jisme aapke phone ke gmail
  accounts list hote hain.
- ❌ Galat: Chrome khulta hai "Sign in — to continue to sha-verse.com".

## Debug kaise karein

Phone USB se connected rakho, PC Chrome me `chrome://inspect` kholo →
apne app ka WebView **inspect** → Console tab. Google button dabao aur error
dekho:

| Console message | Matlab | Fix |
|---|---|---|
| `"SocialLogin" plugin is not implemented on android` | plugin compile nahi hua | Step 1 + 2 |
| `DEVELOPER_ERROR` / `code 10` | SHA-1 / package name mismatch | Step 3 + 4 |
| `12501` / `canceled` | user ne cancel kiya | normal |
| `invalid audience` / `Unacceptable audience` | Web client ID mismatch | Step 5 |
| `Using browser sign-in` toast | fallback chala | Step 1–4 dobara |

App me ab ek toast bhi aayega ("Using browser sign-in") jab native picker
unavailable ho — isse turant pata chal jayega ki fallback chala hai.

## Note
Web fallback bhi **kaam karta hai** — login ho jaata hai, session set hota hai.
Ye sirf UX ka farq hai. Play Store launch se pehle native picker chalu karna
better hai, par ye blocker nahi hai.

AdMob ya koi bhi doosri cheez in steps se affect nahi hoti.
