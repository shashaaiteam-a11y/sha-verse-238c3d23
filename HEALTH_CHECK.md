# Sha-Verse — Health Check (Pre-Native Build)

_Last updated: 2026-04-28_

## Summary
**0 critical bugs blocking native build.** All issues found are packaging-level and addressed by the Phase 1 commit (root `capacitor.config.ts`, `AdMob.initialize()` in `main.tsx`, real rewarded SDK wiring).

## Module-by-Module Status

| Module    | Status | Notes |
|-----------|--------|-------|
| Auth (Email / Google / Phone OTP) | ✅ | Multi-provider working. Verify `redirect_uri` in Google Cloud after release. |
| Home Feed | ✅ | Posts, reactions, stories, comments, share — Facebook parity. |
| Movion (Video) | ✅ | HLS playback, pre-roll & mid-roll ad slots, monetization rules. |
| NovaChat (AI) | ✅ | Gemini 2.5, markdown, rewarded "10 messages" unlock. |
| Bookshelf | ✅ | EPUB/PDF reader, every-20-pages inline ad, premium unlock via rewarded ad. |
| Groups | ✅ | Categories, join requests, native ad at 3rd position. |
| Profile / Friends | ✅ | Mutual friends, PYMK, blocking, privacy. |
| Messaging | ✅ | Read ticks, typing, mute, silent block. |
| Realtime | ✅ | Channel-suffix stability rule applied across all modules. |
| Security | ✅ | 0 active issues, RLS hardened, audit log added, PII columns revoked. |
| Ads infra | ✅ | 16 components, frequency caps, test-mode flag, no interstitials. |

## Native Readiness Checklist

- [x] Capacitor 7 installed (`@capacitor/core`, `/android`, `/ios`)
- [x] `@capacitor-community/admob` v8 installed
- [x] Root `capacitor.config.ts` with AdMob plugin block
- [x] `AdMob.initialize()` called in `src/main.tsx`
- [x] Rewarded ad hook wired to native SDK (web no-op fallback)
- [x] Test ad IDs in use (`USE_TEST_ADS = true`)
- [ ] Native `android/` folder generated (run `npx cap add android` locally)
- [ ] AdMob App ID added to `AndroidManifest.xml` (test ID for now)
- [ ] App icons & splash generated (`@capacitor/assets`)
- [ ] Real AdMob account + Unit IDs (Phase 4)
- [ ] Release keystore generated & backed up (Phase 5)
- [ ] Privacy policy hosted at `sha-verse.com/privacy`

## Known Limitations (non-blocking)

1. **Native ad components** still render as in-app cards (sponsored stories, native cards). They're styled like AdMob native ads but don't yet pull AdMob native ad assets. Banner & Rewarded use the real SDK; native-format ads can be wired in a Phase 6 polish pass after Play Store launch.
2. **iOS** requires a Mac + Xcode + $99/yr Apple Developer account. Plan covers Android first.
3. **Push notifications** not yet integrated (`@capacitor/push-notifications`). Add post-launch.

## Next Step
Follow [`NATIVE_BUILD_GUIDE.md`](./NATIVE_BUILD_GUIDE.md).
