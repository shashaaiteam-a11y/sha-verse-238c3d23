# Android Native Permissions Patch — Sha-Verse

Apply these two changes on your PC after `npx cap add android`. They make
voice/video calls, file upload, and other `getUserMedia` features work inside
the native Android shell. **No JS / Lovable code needs to change.**

---

## 1. `android/app/src/main/AndroidManifest.xml`

Inside the root `<manifest>` element, ensure these `<uses-permission>` lines
exist (add any that are missing — do **not** remove anything that's already
there):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.microphone" android:required="false" />
```

> Note: `VIDEO_CAPTURE` / `AUDIO_CAPTURE` are **not** standard Android
> permissions — the legal pair is `CAMERA` + `RECORD_AUDIO`. The WebView
> bridge in `MainActivity` is what actually unlocks getUserMedia.

In the `<application ...>` opening tag, add (or confirm):

```xml
android:hardwareAccelerated="true"
```

## 2. Replace `MainActivity.java`

Path: `android/app/src/main/java/com/shaverse/app/MainActivity.java`

Copy the contents of [`android-patches/MainActivity.java`](./MainActivity.java)
over the auto-generated file. It:

- Requests `CAMERA` + `RECORD_AUDIO` at runtime on first launch.
- Sets `setMediaPlaybackRequiresUserGesture(false)` and DOM storage flags on
  the Capacitor WebView.
- Overrides `WebChromeClient.onPermissionRequest` to grant whatever the web
  page asks for — this is the missing bridge that causes the
  "Microphone/Camera permission denied" error even when the OS-level
  permission is already allowed.
- Enables Chrome DevTools remote debugging (`chrome://inspect`) so you can
  verify calls from a desktop.

## 3. Rebuild

```bash
npm run build
npx cap sync android
npx cap run android
```

## Verify

1. Fresh-install the APK (or `adb uninstall com.shaverse.app` first so Android
   re-prompts for permissions).
2. Open Chat → Start Video Call → accept the system permission dialog.
3. Camera + mic should connect instantly with no "denied" toast.
4. `chrome://inspect` should list the device — open DevTools → Console and
   confirm no `NotAllowedError` from `getUserMedia`.

## What this does NOT change

- No React / Lovable code is touched.
- No existing permissions are removed.
- Capacitor plugins, AdMob, splash, status bar configuration all keep working.
