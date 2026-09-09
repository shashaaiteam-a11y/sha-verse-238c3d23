# MOVION / PULSE / MOTION — FILE MAP (READ-ONLY FORENSIC AUDIT)

Audit date: 2026-09-08. Project root: `/dev-server`.
Scope: read-only. No production source file was modified, renamed, deleted or migrated for this audit.
Labels used: `NOT FOUND`, `PARTIALLY IMPLEMENTED`, `IMPLEMENTED BUT CURRENTLY UNUSED`, `DUPLICATED IMPLEMENTATION`, `UNCONFIRMED — REQUIRES VERIFICATION`.

---

## 0. Critical global fact

`src/App.tsx:116` → `const MOVION_ENABLED = false;`

`src/App.tsx:119-122`:
```
const MovionRoot    = MOVION_ENABLED ? Movion      : MovionComingSoon;
const MovionWatch   = MOVION_ENABLED ? VideoWatch  : MovionComingSoon;
const MovionChannel = MOVION_ENABLED ? ChannelPage : MovionComingSoon;
const MotionRoute   = MOVION_ENABLED ? Motion      : MovionComingSoon;
```
Therefore **every** Movion/Motion/Video route currently renders `src/pages/MovionComingSoon.tsx` at runtime.
Only exception: `/movion/admin` → `MovionAdmin`, which is NOT swapped by the flag (guarded by `AdminRoute`, `src/App.tsx:359`) — the admin surface is live while the rest of the module is hidden.

`ModulePrefetcher` (`src/App.tsx:183-204`) still idle-prefetches the Movion chunk regardless of the flag, so the disabled code is still bundled and downloaded.

---

## 1. Three parallel implementations (DUPLICATED IMPLEMENTATION)

| # | Tree | Entry | Status |
|---|------|-------|--------|
| A | `src/movion/**` | `src/pages/Movion.tsx` → nested routes | Full YouTube/Shorts clone with own store, contexts, algorithms. Unreachable while flag is false. |
| B | `src/pages/{VideoWatch,ChannelPage,MovionLibrary,CreatorStudio,MovionAdmin}.tsx` + `src/components/movion/**` | lazy imports in `src/App.tsx` via `src/modules/movion/pages/*` | The implementation App.tsx actually resolves; has Mux/HLS + qualities. Also flag-gated (except admin). |
| C | `src/pages/Motion.tsx` + `src/components/motion/**` + `src/hooks/useMotion.ts` | `/motion` | Third, separate feed over the same `videos`/`channels` tables, different UI + hook family. |
| D | `omnihub-suite-main/**` | — | Full legacy duplicate repository copy (own `src/movion`, own migrations). Noted only; not analysed. |

`src/modules/movion/pages/*.tsx` (6 files) are one-line re-export shims, e.g.
`src/modules/movion/pages/Movion.tsx:1` → `export { default } from '@/pages/Movion';`
`src/modules/movion/index.ts` states the real implementation lives under `src/movion/`.

---

## 2. Routing (`src/App.tsx`)

| Route | Component (flag ON) | Component (today) | Guard | Line |
|---|---|---|---|---|
| `/movion/*` | `Movion` (`src/pages/Movion.tsx`) | `MovionComingSoon` | `ProtectedRoute` | 162, 286 |
| `/video/:videoId` | `VideoWatch` | `MovionComingSoon` | `ProtectedRoute` | 288-290 |
| `/channel/:channelId` | `ChannelPage` | `MovionComingSoon` | `ProtectedRoute` | 291-294 |
| `/motion` | `Motion` | `MovionComingSoon` | `ProtectedRoute` | 350 |
| `/movion/admin` | `MovionAdmin` | `MovionAdmin` (live) | `AdminRoute` | 359 |

Nested routes inside `src/pages/Movion.tsx` (providers: `MovionStoreProvider`, `UndoProvider`, `MovionLayout`):
`/`, `/shorts`, `/shorts/:videoId`, `/watch/:videoId`, `/channel/:channelId`, `/subscriptions`, `/library`, `/upload`, `/studio`, wildcard → `MovionHome`.

---

## 3. Frontend file inventory

### 3.1 `src/movion/**` (tree A — unreachable today)
`algorithms.ts`, `constants.ts`, `store.tsx`, `types.ts`
`contexts/MenuContext.tsx`, `contexts/UndoContext.tsx`
`hooks/useMovionSubscriptions.ts`
`pages/`: `MovionHome.tsx`, `MovionShorts.tsx`, `MovionWatch.tsx`, `MovionChannel.tsx`, `MovionSubscriptions.tsx`, `MovionLibrary.tsx`, `MovionUpload.tsx`, `MovionStudio.tsx`
`components/`: `ActionButton`, `ChannelBadge`, `CommentItem`, `Logo`, `MovionLayout`, `MovionNotificationPanel`, `MovionSearchOverlay`, `ShortsCard`, `ShortsPlayer`, `SubscribeButton`, `Toast`, `VideoCard`, `VideoCardMenu`, `index.ts`

### 3.2 `src/components/movion/**` (tree B)
`VideoCard.tsx`, `ShortsCard.tsx` (no importer found — UNCONFIRMED, possibly orphaned), `HLSVideoPlayer.tsx`, `VideoPlayerWithAds.tsx`, `TranscodingStatus.tsx`, `PulseViewer.tsx`, `PulseCard.tsx`, `UploadEntryDialog.tsx`, `UploadVideoDialog.tsx`, `LongVideoUploadDialog.tsx`, `PulseUploadDialog.tsx`, `VideoEditDialog.tsx`, `ChannelSettingsDialog.tsx`, `CreatorEarningsDashboard.tsx`, `MovionHeader.tsx`, `MovionSidebar.tsx`, `EtcMenu.tsx`

### 3.3 `src/components/motion/**` (tree C)
`MotionCard.tsx`, `QuickMotionCard.tsx`, `MotionHeader.tsx`, `MotionSidebar.tsx`, `MotionCategoryTabs.tsx`, `BoostDialog.tsx`, `types.ts`

### 3.4 Shared video components (used by Home Feed / Profile, outside Movion)
`src/components/VideoThumb.tsx`, `src/hooks/useVideoAutoPlay.ts`, `src/lib/media/audioPreference.ts`

---

## 4. Hook inventory (`src/hooks/**` + `src/movion/hooks/**`)

| Hook | Tables / RPC / FN | Realtime | Callers | Status |
|---|---|---|---|---|
| `useVideos.ts` | `videos`, `video_views`, `video_qualities`, `transcoding_jobs`; RPC `calculate_trending_scores`; EF `mux-transcode` | none | `pages/VideoWatch.tsx`, `movion/components/ShortsPlayer.tsx` | live path |
| `useShorts.ts` | `videos` (`is_short` true/false), joined `channels` | own channel `shorts-realtime:*` on `videos` INSERT/UPDATE, 3 s debounce | movion tree | see §7 |
| `useMovionAlgorithms.ts` | none (pure over rows) | — | only `src/movion/pages/*` | unreachable today |
| `src/movion/algorithms.ts` | none | — | **no importers anywhere** | IMPLEMENTED BUT CURRENTLY UNUSED |
| `useMovionRealtime.ts` | `watch_history`, `watch_later`, `saved_videos`, `playlists`, `subscriptions`, `channels`, `likes`, `videos` | 2 channels (`movion-realtime-{uid}-*`, `movion-global-videos-*`) | only `src/movion/pages/*` | unreachable today |
| `useWatchHistory.ts` | `watch_history` | none | both trees | PARTIALLY IMPLEMENTED (see §8) |
| `useWatchLater.ts` / `useSavedVideos.ts` / `usePlaylists.ts` | `watch_later`, `saved_videos`, `playlists`, `playlist_videos` | via `useMovionRealtime` only | `pages/MovionLibrary.tsx`, `VideoWatch.tsx`, `PulseViewer.tsx` | live path |
| `useVideoLikes.ts` | `likes`, `video_dislikes` | per-video channel `video-likes-{id}` | both trees | live path, optimistic updates |
| `useVideoComments.ts` | `comments` | per-video channel `video-comments-{id}` | both trees | live path |
| `useSubscriptions.ts` | `subscriptions` | — | tree B | live path |
| `src/movion/hooks/useMovionSubscriptions.ts` | `subscriptions` | — | `movion/components/SubscribeButton.tsx` | DUPLICATED IMPLEMENTATION |
| `useVideoQualities.ts` | `video_qualities`, `transcoding_jobs` (5 s poll while pending/processing) | — | `pages/VideoWatch.tsx` | live path |
| `useMovionSearch.ts` | `videos`, `channels`; 300 ms debounce | — | `movion/components/MovionSearchOverlay.tsx` | unreachable today |
| `useMovionNotifications.ts` | `subscriptions`, `videos`; localStorage `movion_seen_notifications`, 24 h interval | own channel | `movion/components/MovionLayout.tsx`, `MovionNotificationPanel.tsx` | unreachable today |
| `useLikedVideos.ts` | `likes` | — | only `src/movion/pages/MovionLibrary.tsx` | IMPLEMENTED BUT CURRENTLY UNUSED (live library uses other hooks) |
| `useMotion.ts` | `videos` + `channels` (`channel_type='video'`), `likes`, `subscriptions`, `saved_videos`, `watch_history`, `video_views` | — | tree C (`src/pages/Motion.tsx`) | DUPLICATED IMPLEMENTATION of `useVideos`/`useShorts` |
| `useMotionBoosts.ts` | `creator_boosts` | — | `components/motion/BoostDialog.tsx` | live in tree C |
| `useCreatorDashboard.ts` | `channels`, `videos`, `creator_badges`; RPC `increment_creator_badge_motions` | — | `movion/pages/MovionStudio.tsx` | unreachable today |
| `useMonetization.ts` | `channel_monetization`, `creator_earnings`, `payout_requests`; RPC `apply_for_partner` | — | `components/movion/CreatorEarningsDashboard.tsx` | live path |
| `useChannels.ts` | `channels` | — | both trees + bookshelf | shared |
| `useHiddenVideos.ts` | local persistence of "not interested" ids | — | `MovionShorts.tsx`, `movion/components/VideoCard.tsx` | unreachable today |
| `useVideoManagement.ts`, `useCopyrightSystem.ts`, `useChannelApproval.ts` | `video_management_requests`, `copyright_claims`/`content_fingerprints`, `channels.approval_status` | — | admin / studio surfaces | PARTIALLY IMPLEMENTED |

---

## 5. Video players (three distinct implementations — DUPLICATED IMPLEMENTATION)

1. `src/movion/components/ShortsPlayer.tsx` — raw `<video loop playsInline>`, manual play/pause on `isActive`, lazy `src` gated by `shouldPreload || isActive`, double-tap like, progress bar via `onTimeUpdate`, comments sheet, `ShareDialog`. No HLS, no quality switch, no captions.
2. `src/components/movion/HLSVideoPlayer.tsx` — `hls.js` (`enableWorker`, `lowLatencyMode`, `backBufferLength: 90`), `MANIFEST_PARSED` level list, fatal-error fallback to raw `video_url`, native HLS path for Safari, manual quality menu over `video_qualities`, native browser `controls`. No captions.
3. `src/components/VideoThumb.tsx` — feed/profile inline player: scroll autoplay via `useVideoAutoPlay`, global persisted mute preference, tap-to-play/pause, fullscreen with `webkitEnterFullscreen` fallback, error/retry remount.

---

## 6. Pulse / Shorts classification

- Short vs long is the boolean column `videos.is_short` (not duration-derived): `useShorts.ts:46`, `useVideos.ts:249`, `useMovionAlgorithms.ts:77`.
- Active-item detection in `src/movion/pages/MovionShorts.tsx`: `IntersectionObserver` threshold `0.7`, `data-short-item` / `data-id`, wheel + ArrowUp/ArrowDown navigation, smooth `scrollIntoView`, URL replace.
- Preload window: previous 1 + next 3. Ad slot inserted every 6 shorts.
- Swipe-away recorded when watched 200–2000 ms → `recordSwipeAway` (localStorage `movion_swipe_away_session`).
- Live-tree equivalent is `src/components/movion/PulseViewer.tsx` — UNCONFIRMED — REQUIRES VERIFICATION whether it reuses `useShorts.ts` or its own query.

---

## 7. Upload / transcoding pipeline

`useUploadVideo` (`src/hooks/useVideos.ts:178-314`):
1. `compressVideo` / `compressImage` (`src/lib/media/*`).
2. Upload to Supabase Storage bucket **`videos`**, path `${user.id}/${Date.now()}_${filename}`; public URL used.
3. Insert `videos` row with `transcoding_status: 'ready'` (playable immediately), `is_short`, `category`, `duration`.
4. Fire-and-forget `supabase.functions.invoke('mux-transcode', { action: 'create-asset' })`.
5. Poll `action: 'check-status'` every 5 s, max 60 attempts (5 min) → `complete-transcoding` on ready, `videos.transcoding_status='failed'` on errored.
6. Insert `video_qualities` (`original` ready + `360p/720p/1080p` processing placeholders) and a pending `transcoding_jobs` row.

`hls_url` is written only by the edge function; all clients read `video_url || hls_url`.

---

## 8. Known behavioural gaps found in code

- `video_views` is inserted on every `isActive` transition in `ShortsPlayer.tsx:68` — no dedupe, no watch-time threshold; re-entering a short counts another view.
- `useUpdateWatchProgress` only UPDATEs; it silently no-ops until `useAddToHistory` has created the row (implicit ordering dependency).
- No cursor/offset pagination or infinite scroll anywhere: hard `.limit(50)` / `.limit(20)` / `.limit(8)` in `useVideos.ts`, `useShorts.ts`, `useMovionSearch.ts`. PARTIALLY IMPLEMENTED.
- `src/components/movion/ShortsCard.tsx`: no importer found — UNCONFIRMED — REQUIRES VERIFICATION.

---

## 9. Client caching

Single `QueryClient` (`src/App.tsx:124-133`): `staleTime` 5 min, `gcTime` 30 min, `retry: 2`, `refetchOnWindowFocus: false`.
localStorage: `movion_swipe_away_session`, `movion_seen_notifications`, `movion_notifications_last_fetch`.
sessionStorage: `movion_session_interests`.
