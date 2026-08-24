# Android Production Packaging Fix

## Scope
Fix only the native Android packaging/configuration shown in the screenshots. Preserve all app modules, UI, features, AdMob metadata, and Google sign-in implementation.

## Changes
1. Remove the production `server.url` override so the installed Play Store app launches its bundled Capacitor WebView instead of handing startup to the public website/Chrome.
2. Raise Android compile/target API to 36 for the Google Play deadline shown in the screenshot, using a compatible Android Gradle Plugin/Gradle combination.
3. Remove obsolete dependency downgrades that conflict with the modern SDK while preserving the existing Capacitor and SocialLogin native modules.
4. Increment the Android release version code beyond the currently published code 8 so Play Console accepts the replacement bundle.
5. Verify Capacitor plugin registration, production web build, generated Android assets, and Gradle configuration where the sandbox permits it.

## Release Steps
Document the exact local sequence: pull, install, build, Capacitor sync, select JDK 21/API 36, generate a signed AAB, test it, and upload as a new production release.

## Technical Notes
- The existing Play Store binary cannot be changed remotely; the warning and Chrome-launch behavior disappear only after uploading and rolling out the corrected AAB.
- `google-services.json`, the AdMob app ID, Android package name, OAuth IDs, and SHA-1 setup remain untouched.
