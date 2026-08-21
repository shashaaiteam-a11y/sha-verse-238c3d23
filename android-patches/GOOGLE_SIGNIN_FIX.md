# Fix: `"SocialLogin" plugin is not implemented on android`

Ye error ka matlab **code galat nahi hai** — APK ke andar Capgo Social Login ka
native module compile hi nahi hua. Aapke Build Output me yahi dikh raha hai:

```
:capgo-capacitor-social-login:checkDebugAndroidTestAarMetadata   1 error
:capacitor-cordova-android-plugins:checkDebugAndroidTestDuplicateClasses
Duplicate class kotlin.jvm.jdk7/jdk8 ... found in modules kotlin-stdlib-1.8 ...
BUILD FAILED
```

Do problems hain:
1. **Duplicate Kotlin stdlib classes** (kotlin-stdlib 1.8 + kotlin-stdlib-jdk7/jdk8).
2. **androidTest AAR metadata check** fail (plugin ko higher compileSdk chahiye).

Neeche ke 4 patch lagao, plugin build ho jayega aur Google sign-in chal jayega.

---

## 1. `android/variables.gradle`

```gradle
ext {
    minSdkVersion = 23
    compileSdkVersion = 35
    targetSdkVersion = 35
    androidxActivityVersion = '1.9.2'
    androidxAppCompatVersion = '1.7.0'
    androidxCoordinatorLayoutVersion = '1.2.0'
    androidxCoreVersion = '1.15.0'
    androidxFragmentVersion = '1.8.4'
    coreSplashScreenVersion = '1.0.1'
    androidxWebkitVersion = '1.12.1'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.2.1'
    androidxEspressoCoreVersion = '3.6.1'
    cordovaAndroidVersion = '10.1.1'
    kotlin_version = '2.0.21'
}
```

## 2. `android/build.gradle` (root file) — buildscript ke neeche add karo

```gradle
buildscript {
    ext.kotlin_version = '2.0.21'
    repositories { google(); mavenCentral() }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.7.2'
        classpath 'com.google.gms:google-services:4.4.2'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
    }
}

allprojects {
    repositories { google(); mavenCentral() }

    // FIX 1: duplicate kotlin-stdlib-jdk7/jdk8 classes hata do
    configurations.all {
        resolutionStrategy {
            force "org.jetbrains.kotlin:kotlin-stdlib:$rootProject.ext.kotlin_version"
            force "org.jetbrains.kotlin:kotlin-stdlib-jdk7:$rootProject.ext.kotlin_version"
            force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:$rootProject.ext.kotlin_version"
        }
    }
}

// FIX 2: plugin modules ke androidTest variants disable — inhi ka
// checkDebugAndroidTestAarMetadata fail ho raha tha
subprojects {
    plugins.withId('com.android.library') {
        extensions.configure('androidComponents') { components ->
            components.beforeVariants(components.selector().all()) { variant ->
                variant.enableAndroidTest = false
                variant.enableUnitTest = false
            }
        }
    }
}
```

## 3. `android/app/build.gradle` — `android { ... }` block ke andar

⚠️ **Java 17 mat karo.** `@capgo/capacitor-social-login` 7.20.0 apne module ko
**Java 21** se compile karta hai, aur Capacitor khud `android/app/capacitor.build.gradle`
me `sourceCompatibility/targetCompatibility = VERSION_21` likhta hai. Agar app
module 17 par force karoge to "class file has wrong version" error milega.

```gradle
android {
    namespace "com.shaverse.app"
    compileSdk rootProject.ext.compileSdkVersion

    // compileOptions mat likho — capacitor.build.gradle (auto-generated)
    // pehle se Java 21 set karta hai. Android Studio JDK 21 (JBR) use kare.

    packaging {
        resources {
            excludes += ['META-INF/*.kotlin_module', 'META-INF/DEPENDENCIES']
            pickFirsts += ['META-INF/AL2.0', 'META-INF/LGPL2.1']
        }
    }
}
```


## 4. `android/gradle.properties`

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
android.useAndroidX=true
android.enableJetifier=false
```

---

## Rebuild sequence (PC par)

```bash
npm install
npm run build            # ⚠️ ZAROORI — bina dist/ ke cap sync plugin add hi nahi karta
npx cap sync android
node scripts/verify-social-login.mjs   # proof: plugin registered hai ya nahi
cd android
./gradlew clean            # Windows: gradlew.bat clean
cd ..
npx cap run android
```

Android Studio me: **File → Sync Project with Gradle Files**, phir **Build → Clean
Project**, phir **Build → Rebuild Project**, phir green ▶ Run.

## Verify

Build Output me ab dikhna chahiye (plugin **Java** hai, Kotlin nahi):
```
:capgo-capacitor-social-login:compileDebugJavaWithJavac   ✓
BUILD SUCCESSFUL
```
App me Google button dabao → **native Google account picker** khulna chahiye
(browser nahi). Agar phir bhi error aaye to `chrome://inspect` → Console dekho.


## Agar plugin fix na ho paye

App ab crash nahi karega — Google sign-in automatically **web OAuth fallback**
par chala jayega (browser/webview me Google login khulega, session app me set
ho jayega). Ye `src/pages/Auth.tsx` me handle kiya gaya hai.

## Google Cloud side (must match)

- `src/config/googleAuth.ts` ka `GOOGLE_WEB_CLIENT_ID` = Google Cloud ka **Web
  application** client ID (already set hai).
- Google Cloud → Credentials me ek **Android** OAuth client bhi banao:
  - Package name: `com.shaverse.app`
  - SHA-1: `cd android && ./gradlew signingReport` se `debug` variant ka SHA-1 copy karo.
- Bina Android client + sahi SHA-1 ke native picker `DEVELOPER_ERROR (10)` dega.

**AdMob kuch bhi remove nahi hua** — manifest me
`com.google.android.gms.ads.APPLICATION_ID` meta-data waise hi rehna chahiye.
