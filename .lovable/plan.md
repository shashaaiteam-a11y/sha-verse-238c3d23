# Closed-App Android Notification Repair

## What the audit confirmed
- SHA-VERSE is registering valid Android FCM tokens and the latest real notification was accepted by Firebase.
- The Android package, Firebase app, Gradle plugin, Capacitor push plugin, permission, receiver, icon, and server payload match.
- The remaining failure is on Android notification display. The current channel ID is reused forever; Android preserves an old channel's blocked or low-importance state across reinstalls/updates, and app code cannot repair that channel after creation.

## Changes
1. Replace the existing notification channel with a versioned production channel ID so existing devices receive a fresh high-importance channel.
2. Update the Android manifest, native channel creation, Capacitor registration, and server FCM payload to use exactly the same new channel ID.
3. Keep the old channel untouched for safe upgrade compatibility; no database, authentication, in-app notification, or unrelated module changes.
4. Deploy the updated push sender and verify its response and project build.

## Device verification
- Build and install a new APK/AAB after `npm install`, `npm run build`, and `npx cap sync android`.
- Open SHA-VERSE once and allow notifications, then close it normally and send a real notification.
- Android force-stop is excluded: Android intentionally blocks all FCM delivery after Force stop until the app is opened again.
