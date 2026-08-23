# "Using browser sign-in / Native Google picker is unavailable in this build"

## Ye message aata kyun hai?

App ka JS code Google button dabate hi ye check karta hai:

```ts
Capacitor.isPluginAvailable("SocialLogin")
```

Agar ye `false` aaya → matlab **APK ke andar SocialLogin ka NATIVE (Java/Kotlin)
module maujood hi nahi hai**. Tab app crash hone ke bajaye web OAuth par gir
jaata hai aur wahi toast dikhata hai.

Important: ye **Google Cloud ka issue nahi** hai. Aapka Android client
(`com.shaverse.app` + SHA-1 `EE:68:...:32:C1`) aur Web client dono bilkul sahi
hain (screenshots verify ho gaye). Problem purely Android build side ki hai.

Ab toast me exact diagnostic bhi print hota hai, jaise:

```
platform=android | native=true | SocialLoginRegistered=false | webClientId=set
```

- `SocialLoginRegistered=false` → plugin APK me nahi hai (99% yahi case hai).
- `SocialLoginRegistered=true` par phir bhi error → tab Google Cloud / client ID side dekho.

---

## Code me kya kiya gaya (aur kyun)

1. `src/config/googleAuth.ts`
   - `GOOGLE_WEB_CLIENT_ID` (pehle se sahi tha).
   - **naya**: `GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_ANDROID_SHA1`,
     `ANDROID_PACKAGE_NAME` — sirf reference/debug ke liye.
   - ⚠️ Android client ID plugin ko **jaan-boojh kar pass nahi kiya jata**.
     Google ka native flow hamesha **Web client ID** leta hai; Android client
     ka kaam sirf itna hai ki Play Services aapke APK (package + SHA-1) ko
     pehchan le. idToken ka `aud` Web client ID hi rehta hai, aur Lovable Cloud
     usi se verify karta hai. Agar Android client ID pass kar dete to
     `invalid audience` error aata.

2. `src/lib/auth/nativeGoogleAuth.ts`
   - `isNativeGooglePluginAvailable()` — call karne se **pehle** plugin
     registration check.
   - `nativeGoogleDiagnostics()` — exact reason string.

3. `src/pages/Auth.tsx`
   - Fallback toast ab reason dikhata hai, generic message nahi.

⚠️ App `server.url = https://www.sha-verse.com` load karta hai, isliye ye JS
changes tabhi phone par dikhenge jab aap Lovable se **Publish** karoge.

---

## Fix (Android side) — step by step

### 1. Plugin sync

```bash
npm install
npx cap sync android
```

Output me ye line **honi hi chahiye**:

```
√ Found N Capacitor plugins for android:
   ...
   @capgo/capacitor-social-login@7.x.x
```

Na dikhe → `node_modules` delete karke `npm install` dobara.

### 2. Verify karo ki plugin register hua (sabse pakka check)

Ye 2 files khol kar dekho:

- `android/app/src/main/assets/capacitor.plugins.json` me ye entry honi chahiye:

```json
{ "pkg": "@capgo/capacitor-social-login", "classpath": "ee.forgr.capacitor.social.login.SocialLoginPlugin" }
```

- `android/capacitor.settings.gradle` me:

```gradle
include ':capgo-capacitor-social-login'
project(':capgo-capacitor-social-login').projectDir = new File('../node_modules/@capgo/capacitor-social-login/android')
```

- `android/app/capacitor.build.gradle` me:

```gradle
implementation project(':capgo-capacitor-social-login')
```

In teeno me se koi bhi missing = sync properly nahi hua.

### 3. Gradle build errors fix

`android-patches/GOOGLE_SIGNIN_FIX.md` ke 4 patches lagao (Kotlin 2.0.21,
compileSdk 35, Java 21/JBR 21, androidTest disable). Kyunki agar
`:capgo-capacitor-social-login` module compile fail karta hai to Android Studio
kabhi-kabhi **purani APK** install kar deta hai — jisme plugin nahi hota.

Build Output me literally ye line dhoondo:

```
:capgo-capacitor-social-login:compileDebugJavaWithJavac   ✓
BUILD SUCCESSFUL
```

### 4. Purani APK hatao (ye step log log skip karte hain)

Phone me **Settings → Apps → Sha-Verse → Uninstall**.
Fir Android Studio: **Build → Clean Project → Rebuild Project → ▶ Run**.

### 5. Logcat se confirm

Android Studio → Logcat → filter `Capacitor`:

```
Capacitor: Loading plugin: SocialLogin
```

Ye line aaye = fix ho gaya, native picker khulega.
Na aaye = step 2 wali files me plugin missing hai.

---

## Google Cloud — already correct (koi change nahi chahiye)

| Cheez | Value | Status |
|---|---|---|
| Web client ID | `1045450930549-7km1bdvipje80098fa6tajfm9936n3nv...` | ✅ code + Lovable Cloud dono me |
| Android client ID | `1045450930549-p11fcoehj7esm5n94ih5g7jreve8pevv...` | ✅ sirf Cloud me, code me nahi |
| Package name | `com.shaverse.app` | ✅ |
| Debug SHA-1 | `EE:68:B0:33:BA:C6:B6:C9:46:59:68:DA:9A:9E:1B:E1:69:77:32:C1` | ✅ |

Play Store release ke liye **ek aur** Android client banana hoga Play Console →
App integrity → **App signing key certificate** wale SHA-1 ke saath, warna
release APK me picker `DEVELOPER_ERROR (10)` dega.

AdMob (`ca-app-pub-2928763177849470~4226601339`) ya koi doosri cheez in steps se
affect nahi hoti.
