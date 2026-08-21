# ROOT CAUSE — `SocialLoginRegistered=false` (PROVEN, not a guess)

## Kya prove hua (sandbox me reproduce kiya gaya)

Is repo me `npx cap add android` + `npx cap sync android` chalaya gaya.

**Case A — `dist/` build ke BINA sync:**

```
✔ Adding native android project in android
[warn] sync could not run--missing dist directory.
[success] android platform added!
```

Result:
```
android/app/src/main/assets/capacitor.plugins.json   -> FILE HI NAHI BANI
android/capacitor.settings.gradle                    -> FILE HI NAHI BANI
android/app/capacitor.build.gradle                   -> FILE HI NAHI BANI
```

Ye Capacitor CLI ka behaviour hai: agar `webDir` (`dist`) missing hai to sync
**silently skip** ho jaata hai — sirf ek `[warn]` line deta hai aur exit code
**0** (success!) return karta hai. Gradle phir bhi build ho jata hai, APK bhi
ban jati hai — bas usme **koi bhi plugin registered nahi hota**. App chalti hai,
`Capacitor.isNativePlatform()` true aata hai (bridge to core Capacitor ka hai),
lekin `Capacitor.isPluginAvailable("SocialLogin")` **false** — bilkul wahi toast
jo aap dekh rahe ho.

**Case B — pehle `npm run build`, phir sync:**

```
🔧 Configuring dynamic provider dependencies for SocialLogin
  ✔ Google: enabled ...
✔ Copying web assets from dist to android/app/src/main/assets/public
[info] Found 7 Capacitor plugins for android:
       @capacitor-community/admob@7.2.0
       @capacitor/app@7.1.2
       @capacitor/haptics@7.0.5
       @capacitor/network@7.0.4
       @capacitor/splash-screen@7.0.5
       @capacitor/status-bar@7.0.6
       @capgo/capacitor-social-login@7.20.0
```

Generated files (verified):

- `android/app/src/main/assets/capacitor.plugins.json`
  → `{ "pkg": "@capgo/capacitor-social-login", "classpath": "ee.forgr.capacitor.social.login.SocialLoginPlugin" }`
- `android/capacitor.settings.gradle` → `include ':capgo-capacitor-social-login'`
- `android/app/capacitor.build.gradle` → `implementation project(':capgo-capacitor-social-login')`
  aur `sourceCompatibility/targetCompatibility = JavaVersion.VERSION_21`

**Isliye root cause = native project me plugin generate hi nahi hua tha.**
JavaScript, Google Cloud clients, SHA-1, Web Client ID, Supabase — sab sahi hain,
inme koi change ki zaroorat nahi.

Do trigger the same bug: (1) `npx cap sync android` bina `npm run build` ke,
ya (2) `:capgo-capacitor-social-login` module ka Gradle compile fail hona
(Kotlin duplicate-class / androidTest AAR error) — us case me Android Studio
purani APK install kar deta hai jisme plugin nahi hota.

---

## Version compatibility (koi upgrade zaroori NAHI)

| Package | Installed | Required | Status |
|---|---|---|---|
| `@capacitor/core` | 7.4.x | `>=7.0.0` (peer) | ✅ |
| `@capacitor/android` | 7.4.x | 7.x | ✅ |
| `@capacitor/cli` | 7.4.x | 7.x | ✅ |
| `@capgo/capacitor-social-login` | **7.20.0** | Capacitor 7 | ✅ |

Plugin **100% Java** hai (koi Kotlin file nahi) → `compileDebugKotlin` task iske
liye kabhi nahi chalta. Uska build.gradle khud `compileSdk 35`, `minSdk 23`,
**Java 21** set karta hai. Plugin migrate karne ki koi zaroorat nahi.

`MainActivity` me kuch add karne ki zaroorat **nahi** — Google flow Credential
Manager use karta hai; `ModifiedMainActivityForSocialLoginPlugin` sirf Facebook/
Twitter ke `onActivityResult` ke liye hai. Aapka custom `MainActivity.java`
(`super.onCreate` call karta hai, `onActivityResult` override nahi karta)
Capacitor registration ko block nahi karta.

---

## FIX — exact sequence (PC par, ek baar me)

```bash
npm install
npm run build                            # 1️⃣ ye step skip mat karo
npx cap sync android                     # 2️⃣ ab "Found 7 Capacitor plugins" dikhega
node scripts/verify-social-login.mjs     # 3️⃣ proof
cd android && ./gradlew clean && cd ..   # Windows: gradlew.bat clean
```

Step 2 ke output me literally ye line honi chahiye:
`@capgo/capacitor-social-login@7.20.0`. Na dikhe → step 1 nahi chala.

Step 3 sab green hona chahiye. Koi bhi ✘ = us line me likha reason fix karo.

Phir Android Studio me:

1. **Phone se purani Sha-Verse app UNINSTALL karo** (warna stale APK reh jati hai).
2. File → **Sync Project with Gradle Files**
3. Build → **Clean Project** → **Rebuild Project**
4. Build Output me dekho: `:capgo-capacitor-social-login:compileDebugJavaWithJavac` ✓ + `BUILD SUCCESSFUL`
5. ▶ Run
6. Logcat filter `Capacitor` → `Loading plugin: SocialLogin` line aani chahiye = 100% confirm.

Agar Gradle me duplicate-Kotlin ya `checkDebugAndroidTestAarMetadata` error aaye
to `android-patches/GOOGLE_SIGNIN_FIX.md` ke patches lagao (Java 17 wala hissa
ab hata diya gaya hai — Java 21 chahiye).

## ⚠️ App live URL load karti hai

`capacitor.config.ts` me `server.url = https://www.sha-verse.com`. Iska matlab
APK ke andar ka JS use nahi hota — website ka JS chalta hai. Isliye:
- JS/diagnostic changes phone par tabhi dikhenge jab Lovable se **Publish** karoge.
- Lekin **plugin availability APK par depend karti hai**, website par nahi —
  isliye upar wala native fix zaroori hai.
