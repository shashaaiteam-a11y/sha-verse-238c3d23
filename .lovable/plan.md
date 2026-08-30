# AdMob Production Delivery Fix and Verification

## Goal
Ensure the Play Store Android build declares Advertising ID access, then distinguish an app/build configuration problem from AdMob inventory/account-side no-fill.

## Changes
1. Add `com.google.android.gms.permission.AD_ID` to the active Android manifest and the maintained manifest patch copy.
2. Verify native configuration and production build inputs without changing ad placement, frequency, IDs, or UI.
3. Add database guards that prevent channel owners from changing monetization approval/financial metrics and prevent creators from self-assigning authoritative badges; keep legitimate payout contact/icon updates working.
4. Mark the two mandatory security findings fixed after backend verification.

## Verification
- Confirm the permission is present in both manifests.
- Run focused TypeScript/tests only if affected; rely on the harness for full build validation.
- Verify the database guards and provide exact local rebuild/sync/install and `adb logcat` commands to identify `NO_FILL`, invalid request, or SDK initialization failures.

## User Steps After the Change
Pull the latest project, run `npm install`, `npm run build`, `npx cap sync android`, create/upload a newly signed AAB with a higher version code, then install that Play-delivered build. Confirm the Play Advertising ID declaration and AdMob seller-information settings separately.
