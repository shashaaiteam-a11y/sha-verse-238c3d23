# MOVION / PULSE / MOTION — COMPLETE ARCHITECTURE (READ-ONLY FORENSIC AUDIT)

Audit date: 2026-09-08. Project root: `/dev-server`. Companion document: `MOVION_FILE_MAP.md`.
Nothing was modified, refactored, renamed or migrated. Live database verification was **not possible** at audit time: the Cloud database pooler was unavailable/paused, so every statement about live DB state below is migration/type-file evidence only and is labelled `UNCONFIRMED — REQUIRES VERIFICATION` where relevant.

---

## PART 1 — EXECUTIVE SUMMARY

The video area of SHA-VERSE is not one module. It is **three coexisting frontend implementations** plus a **fourth full repository duplicate**, sitting on **two migration histories**, and the whole user-facing surface is **switched off** by a single boolean.

1. `MOVION_ENABLED = false` (`src/App.tsx:116`) routes `/movion/*`, `/video/:id`, `/channel/:id` and `/motion` to `MovionComingSoon`. `/movion/admin` is the one live exception.
2. Tree A `src/movion/**` — complete Shorts/YouTube clone (store, contexts, own algorithms, own subscription/search/notification hooks). Unreachable today.
3. Tree B `src/pages/*` + `src/components/movion/**` — the implementation `src/App.tsx` actually imports (through the `src/modules/movion/pages/*` re-export shims). Has Mux transcoding, HLS playback and quality switching. Also flag-gated.
4. Tree C `src/pages/Motion.tsx` + `src/components/motion/**` + `src/hooks/useMotion.ts` — a third feed over the same `videos`/`channels` tables.
5. `omnihub-suite-main/**` — full legacy copy of the whole project including its own Movion tree and migrations. DUPLICATED IMPLEMENTATION.

Backend is comparatively healthy: counters are trigger-maintained with `SECURITY DEFINER` functions, monetization and creator-badge fields are protected by triggers plus column-level GRANT revocation, and `mux-transcode` re-derives every trusted value from the database instead of trusting the client.

The two headline risks are (a) `video_views` RLS is open for INSERT to everyone, and (b) large amounts of shipped-but-dead code that still gets bundled and prefetched.

---

## PART 2 — ROUTING AND ENTRY POINTS

See `MOVION_FILE_MAP.md` §2 for the route table.

Nested Movion router (`src/pages/Movion.tsx`, 38 lines) wraps `MovionStoreProvider` → `UndoProvider` → `MovionLayout` and mounts `MovionHome`, `MovionShorts` (`/shorts`, `/shorts/:videoId`), `MovionWatch` (`/watch/:videoId`), `MovionChannel`, `MovionSubscriptions`, `MovionLibrary`, `MovionUpload`, `MovionStudio`, wildcard → `MovionHome`.

Auth: all Movion routes use `ProtectedRoute`; `/movion/admin` uses `AdminRoute`.

---

## PART 3 — DATABASE SCHEMA (from `src/integrations/supabase/types.ts` + migrations)

19 video-domain tables are present in the generated types:

| Table | Key columns | Creation evidence |
|---|---|---|
| `videos` | `channel_id`, `title`, `description`, `thumbnail_url`, `video_url`, `hls_url`, `duration`, `views_count`, `likes_count`, `comments_count`, `category`, `tags[]`, `is_short`, `transcoding_status`, `trending_score`, `engagement_score` | `omnihub-suite-main/supabase/migrations/20251129113853_*.sql:41-53`; `hls_url`/`transcoding_status` in `20251204193214_*.sql:28-29` |
| `channels` | `user_id`, `name`, `channel_type`, `avatar_url`, `banner_url`, `subscribers_count`, `approval_status` | `20251129113853_*.sql:16-27`, `UNIQUE(user_id, channel_type)` |
| `subscriptions` | `user_id`, `channel_id`, `notification_level` | `20251129113853_*.sql:150-156`, `UNIQUE(user_id, channel_id)` |
| `likes` | polymorphic `post_id/video_id/book_id/group_post_id/comment_id` with mutual-exclusion CHECK | `20251129113853_*.sql:126-147` |
| `video_dislikes` | `user_id`, `video_id` | CREATE site NOT FOUND in scanned migrations (table exists in types.ts) |
| `comments` | polymorphic, incl. `video_id` | `20251129113853_*.sql:108-123` |
| `video_views` | `user_id` (SET NULL), `video_id` (CASCADE), `watch_time` | `supabase/migrations/20260326114823_*.sql:3-9` |
| `watch_history` | `user_id`, `video_id`, `watched_at`, `watch_duration_seconds`, `watch_percentage` | legacy tree |
| `watch_later`, `saved_videos`, `playlists`, `playlist_videos` | library tables | `20251223154850_*.sql:41`; `20260411180652_*.sql:2-9` |
| `video_qualities`, `transcoding_jobs` | `resolution`, `status`, `video_url`, `mux_asset_id` | `20251204193214_*.sql:2-26`; `mux_asset_id` in `20260526054927_*.sql:3-7` |
| `video_analytics`, `video_categories`, `video_interactions`, `video_management_requests` | rollups / taxonomy / requests | `20251225115307_*.sql`, `20251223154850_*.sql:13-30` |
| `channel_monetization`, `creator_earnings`, `earnings`, `payout_requests`, `superchats` | money tables | `20251205124054_*.sql`, `20260326114823_*.sql:20-27` |
| `creator_boosts`, `creator_badges` | `amount_cents CHECK > 0`, `badge_level`, `achievements jsonb` | `20251220053753_*.sql:2-42` |
| `copyright_claims`, `content_fingerprints` | claims pipeline | `20251225115307_*.sql:25-` |

Indexes found: `idx_videos_channel_id`, `idx_videos_created_at`, `idx_video_qualities_video_id`, `transcoding_jobs.mux_asset_id`, playlist junction indexes. No index evidence found for `videos.is_short`, `videos.category`, `videos.trending_score`, `video_views.video_id`, or `watch_history(user_id, video_id)` — UNCONFIRMED — REQUIRES VERIFICATION against the live database.

---

## PART 4 — RLS POSTURE

Permissive public reads (`USING (true)`): `videos`, `channels`, `likes`, `comments`, `subscriptions`, `video_qualities`, `creator_boosts`, `creator_badges`, `video_views`.

Correctly scoped: `earnings` and `creator_earnings` (owner only), `payout_requests` (owner + `is_admin()`), all write paths on `videos`/`video_qualities` (channel-ownership `EXISTS` joins).

Hardened over time:
- `channel_monetization`: table-level UPDATE revoked from `authenticated`/`anon`; column-level GRANT limited to `cpm_rate_cents, minimum_payout_cents, payout_method, payout_email, total_watch_hours, updated_at` (`20260611181350_*.sql:47-50`); `prevent_monetization_self_grant()` blocks direct `is_eligible` writes outside `apply_for_partner()` (`20260526054927_*.sql:41-162`).
- `creator_badges`: `protect_creator_badge_fields()` resets `badge_level`/`achievements` to `OLD` unless admin/service_role (`20260626053225_*.sql:6-28`).
- `poll_options.vote_count` UPDATE revoked from `authenticated, anon` (same column-lock pattern).

**FLAG — `video_views` open insert.** `supabase/migrations/20260326114823_*.sql:13-17` creates `"Anyone can insert views" WITH CHECK (true)` and `"Anyone can read views" USING (true)`. No later tightening migration was found. Because `sync_video_views_count()` increments `videos.views_count` on every insert, view counts are directly inflatable by any client. UNCONFIRMED — REQUIRES VERIFICATION against live policies.

---

## PART 5 — DATABASE FUNCTIONS AND TRIGGERS

| Function | Kind | Trigger | Effect |
|---|---|---|---|
| `sync_video_views_count()` | SECURITY DEFINER, `search_path=public` | `AFTER INSERT ON video_views` | `videos.views_count += 1` |
| `sync_video_likes_count()` | SECURITY DEFINER | `AFTER INSERT OR DELETE ON likes` | recomputes `videos.likes_count` |
| `sync_video_comments_count()` | SECURITY DEFINER | `AFTER INSERT OR DELETE ON comments` | recomputes `videos.comments_count` |
| `protect_monetization_financials()` / `protect_channel_monetization_fields()` | SECURITY DEFINER | BEFORE UPDATE | blocks owner edits to financial counters |
| `prevent_monetization_self_grant()` | SECURITY DEFINER | BEFORE UPDATE | `is_eligible` writable only by service_role or via GUC set inside `apply_for_partner()` |
| `apply_for_partner(uuid)` | SECURITY DEFINER RPC, EXECUTE granted to `authenticated` only | — | verifies ownership, aggregates subs + 30-day watch hours + 90-day shorts views, applies 1000 subs & 4000 h **or** 3M shorts-views thresholds |
| `protect_creator_badge_fields()` | SECURITY DEFINER | BEFORE UPDATE ON `creator_badges` | freezes `badge_level`/`achievements` |
| `increment_creator_badge_motions(uuid)` | SECURITY DEFINER RPC | — | owner-verified recompute of total motions from `videos` |
| `calculate_trending_scores()` | RPC called by `useVideos.ts:48` | — | body NOT FOUND in scanned migrations — UNCONFIRMED |
| `subscribe_to_channel()` / `unsubscribe_from_channel()` | RPC signatures in `types.ts:6168-6174` | — | bodies NOT FOUND in scanned migrations — UNCONFIRMED |

Client code never updates counters directly; all count comments in hooks say "auto-synced by database trigger", which matches the trigger evidence.

---

## PART 6 — REALTIME

Added to `supabase_realtime` by migration:
`likes`, `comments`, `channels` (`20260315092924_*.sql:87,92,97`), `subscriptions` (`20260315085913_*.sql:21`), `video_views` (`20260326114823_*.sql:106`), `creator_boosts`, `creator_badges`, `video_dislikes` (`20260828102725_*.sql:75-77`).

`REPLICA IDENTITY FULL` found only for `subscriptions` (`20260828191105_*.sql:1`). Not set for `videos`, `video_views`, `creator_boosts`, `creator_badges`, `video_dislikes` → UPDATE/DELETE payloads carry no old-row data.

**FLAG — subscriptions on tables that are not published.** No migration adds `videos`, `watch_history`, `saved_videos`, `watch_later` or `playlists` to the publication, yet:
- `src/hooks/useShorts.ts:68-88` subscribes to `videos` INSERT/UPDATE,
- `src/hooks/useMovionRealtime.ts` subscribes to `watch_history`, `watch_later`, `saved_videos`, `playlists` and `videos`.

These subscriptions therefore appear inert (they connect but never receive events). UNCONFIRMED — REQUIRES VERIFICATION: the live `pg_publication_tables` could not be queried because the database pooler was unavailable during this audit.

Channel naming: `shorts-realtime:{ts}:{rand}`, `movion-realtime-{userId}-{rand}`, `movion-global-videos-{rand}`, `video-likes-{videoId}`, `video-comments-{videoId}`. The first three follow the project's unique-suffix rule; the per-video ones do not, so two components watching the same video in one session can collide on the channel name — UNCONFIRMED impact.

---

## PART 7 — STORAGE

`useUploadVideo` writes to bucket **`videos`** (video and thumbnail) and `ChannelSettingsDialog.tsx` to `avatars`.

No `storage.buckets` insert and no `storage.objects` policy specific to `videos`/thumbnails was found in either migration tree — **NOT FOUND in repository**. The bucket therefore exists only as live infrastructure created outside migrations. UNCONFIRMED — REQUIRES VERIFICATION of the bucket's public flag, size limit and object policies.

---

## PART 8 — EDGE FUNCTIONS

`supabase/functions/mux-transcode/index.ts` is the only video edge function.

- Requires `Authorization`, validates the JWT via `auth.getUser(token)` (`:22-45`).
- Actions `create-asset`, `check-status`, `complete-transcoding`; for all three it re-fetches the `videos` row joined to `channels.user_id` and returns 403 on ownership mismatch (`:56-91`).
- Never trusts client-supplied `videoUrl`, `assetId` or `playbackId`.
- Writes `videos.hls_url/duration/transcoding_status/thumbnail_url`, `transcoding_jobs.status/mux_asset_id/progress`, `video_qualities.video_url/status`.
- External: Mux REST with `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` (Basic auth). Mux asset-limit 400s degrade gracefully (job `skipped`/`failed`, video stays `ready`). Generic catch returns a sanitized 500.
- Not listed in `[functions]` of `supabase/config.toml` → falls back to the platform default rather than being explicitly declared. Flag for auditability only; in-code JWT validation is present.

Secrets referenced: `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## PART 9 — ALGORITHMS

Two independent scoring implementations exist for the same job.

**`src/movion/algorithms.ts` — pure, ZERO importers → IMPLEMENTED BUT CURRENTLY UNUSED.**
- Home: `watchTime*0.4 + likes*0.2 − dislikes*0.1 + comments*0.1 + freshness(72 h)*0.15 + categoryMatch*0.15`, ×1.2 if subscribed.
- Pulse: `retention*0.5 + replays*0.3 + likes*0.1 − dislikes*0.1 + engagementSpeed*0.2`.

**`src/hooks/useMovionAlgorithms.ts` — wired into tree A only (so unreachable today).**
- Home: `watchTime*0.35 + likes*0.15 − dislikes*0.1 + comments*0.1 + freshness(72 h)*0.15 + categoryMatch*0.1 + sessionBoost*0.05`, ×1.2 if subscribed.
- Pulse: `retention*0.4 + replays*0.2 + likes*0.1 − dislikes*0.1 + speed*0.1 + freshness(48 h)*0.2 − swipePenalty(max 0.3)`.
- Extras: session interests (sessionStorage), swipe-away penalty (localStorage), `applyCreatorDiversity()` de-clustering pass.

The weights differ between the two files — DUPLICATED IMPLEMENTATION with divergent behaviour.

**Analytics honesty flag.** `transformToMovionVideo` (`useMovionAlgorithms.ts:88-101`) synthesises `averageRetention` with `Math.random()`, `engagementSpeed` with `Math.random()`, `watchTimeSeconds` as `views*180` and `replays` as `views*0.1`. The Pulse ranking is therefore partly random rather than data-driven.

Tree B (the one App.tsx imports) uses **no client-side scoring at all** — only `.order('created_at')`, `.order('views_count')` and the `calculate_trending_scores` RPC.

---

## PART 10 — DATA FLOWS

```text
Upload
  UploadVideoDialog / MovionUpload
    -> compressVideo/compressImage
    -> storage bucket `videos`
    -> INSERT videos (transcoding_status='ready')
    -> INSERT video_qualities (original ready + 3 placeholders)
    -> INSERT transcoding_jobs (pending)
    -> EF mux-transcode create-asset -> Mux
         poll check-status (5s x60) -> complete-transcoding
         -> UPDATE videos.hls_url / video_qualities.status

Playback
  VideoWatch -> useVideo + useVideoQualities -> HLSVideoPlayer (hls.js | native | mp4)
  Pulse      -> MovionShorts -> IntersectionObserver(0.7) -> ShortsPlayer
                 -> INSERT video_views -> trigger -> videos.views_count

Engagement
  like     -> likes / video_dislikes -> trigger -> videos.likes_count -> realtime channel video-likes-{id}
  comment  -> comments -> trigger -> videos.comments_count -> realtime channel video-comments-{id}
  history  -> useAddToHistory (upsert) then useUpdateWatchProgress (update-only)
```

---

## PART 11 — PERFORMANCE OBSERVATIONS

- Hard `.limit(50)` everywhere; no pagination or infinite scroll → the feed silently truncates as the catalogue grows. PARTIALLY IMPLEMENTED.
- Feed queries select `*` on `videos` plus a joined channel object; no column narrowing.
- `useVideoQualities` polls the transcoding job every 5 s while pending, and `useUploadVideo` polls the edge function every 5 s for up to 5 minutes — two independent polling loops per upload.
- The disabled Movion chunk is still prefetched on idle (`src/App.tsx:190`), paying download cost for unreachable code.
- Ranking runs client-side over up to 50 rows inside `useMemo` — negligible, but it also means ranking cannot use server-side signals.

---

## PART 12 — SECURITY FINDINGS (ordered by severity)

1. **HIGH — `video_views` insert is unauthenticated and unbounded**, and feeds a counter trigger. Any client can inflate `videos.views_count`, which in turn feeds monetization thresholds via `apply_for_partner()` (90-day shorts views). Migration evidence: `20260326114823_*.sql:13-17`, `:35-51`, `20260526054927_*.sql:74-221`.
2. **MEDIUM — no view dedupe client-side** (`ShortsPlayer.tsx:68` inserts on every activation), compounding item 1.
3. **LOW — `/movion/admin` remains routable while the module is disabled.** It is `AdminRoute`-guarded, so this is exposure of an admin surface rather than a privilege hole.
4. **LOW — permissive `USING (true)` SELECT** on `creator_boosts`, `creator_badges`, `video_views` exposes per-user engagement and payment-adjacent metadata to anonymous readers.
5. **INFO — `mux-transcode` absent from `supabase/config.toml` `[functions]`**; JWT is validated in code, so this is a documentation/auditability gap only.
6. **INFO — no `REPLICA IDENTITY FULL`** on published video tables limits realtime UPDATE/DELETE payload fidelity.

---

## PART 13 — MAINTAINABILITY FINDINGS

1. Three frontend implementations of the same product plus a full duplicate repository (`omnihub-suite-main/`).
2. Duplicate components with different code under the same names: `VideoCard.tsx` and `ShortsCard.tsx` in both `src/movion/components/` and `src/components/movion/`.
3. Duplicate hooks: `useMovionSubscriptions.ts` vs `useSubscriptions.ts`; `useMotion.ts` vs `useVideos.ts`/`useShorts.ts`.
4. `src/movion/algorithms.ts` and `src/hooks/useLikedVideos.ts` are unreachable.
5. `src/modules/movion/**` adds an indirection layer of pure re-export shims.
6. Realtime subscriptions target tables that no migration publishes.
7. Implicit ordering dependency between `useAddToHistory` and `useUpdateWatchProgress`.

---

## PART 14 — VERIFICATION BACKLOG (could not be resolved read-only)

| # | Item | Why unresolved |
|---|---|---|
| 1 | Live `pg_publication_tables`, RLS policy list, indexes | Cloud database pooler unavailable during audit |
| 2 | `videos` storage bucket: existence, public flag, object policies | No migration evidence; requires live storage inspection |
| 3 | Bodies of `calculate_trending_scores`, `subscribe_to_channel`, `unsubscribe_from_channel` | Not present in scanned migration files |
| 4 | CREATE sites for `saved_videos`, `video_dislikes`, `channels.approval_status`, `subscriptions.notification_level` | Not matched by keyword search across either migration tree |
| 5 | Whether `src/components/movion/PulseViewer.tsx` is the live Shorts surface and which query it uses | Not read line-by-line in this pass |
| 6 | Whether `src/components/movion/ShortsCard.tsx` is genuinely orphaned | No static importer found; dynamic import not excluded |
| 7 | Intent: is `/motion` (tree C) a separate product or a legacy predecessor? | Product decision, not derivable from code |

---

## PART 15 — CONCLUSION

Nothing in the video area is broken at the database layer; the backend is trigger-guarded and the transcoding function is written defensively. The real state of MOVION is organisational: a switched-off feature with three competing frontends, a partly randomised ranking model, an open view-count write path, and realtime wiring aimed at tables that are not published. Any decision to re-enable `MOVION_ENABLED` should be preceded by choosing one frontend tree, closing the `video_views` insert policy, and confirming the publication and storage configuration on the live database.
