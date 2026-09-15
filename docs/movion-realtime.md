# Movion realtime launch

The existing Movion layout is retained. The module switch enables the real feed and creator routes for signed-in users.

## Behavior

- Playback reports cumulative foreground watch seconds every 5 seconds and on pause, seek, navigation and page hide. The database acknowledges totals, making a retry safe after a lost response. Fractional seconds carry over between reports. Hidden modules, paused playback, seeks and background tabs do not add watch time. Playback speed does not multiply watch hours.
- Long videos qualify after `min(30, max(5, duration / 2))` watched seconds; Pulse uses `min(5, max(2, duration / 2))`. The threshold never exceeds the video duration. One viewer/video is counted at most once per 30 minutes. The server reads duration and video type from the database and serializes simultaneous sessions.
- Realtime events reconcile video, channel, subscription, comment and creator caches in 250 ms batches. Reconnecting catches up missed changes. Duplicate component mounts share one connection.
- Subscriptions share account-scoped state. Failed requests do not report success. Like/dislike switching is transactional and idempotent. Creator metrics use stored playback totals, not generated estimates.
- Pulse keeps its order as counters change and pauses the previous clip during an ad. Ads no longer remount the legacy player. Upload previews retain their object URLs and tags are saved. Transcoding records are created before optional processing starts.

## Verification

```sh
npm ci
npm run build
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
npm run test:movion:db
```

The database test uses an isolated in-memory PostgreSQL runtime with synthetic fixtures. It checks cumulative retries, stale reports, view deduplication, counter triggers, elapsed-time caps, account ownership, approval checks, reaction switching, analytics and grants. It does not connect to production. The migration was also validated against the connected project's real schema inside a rolled-back transaction.

Apply `supabase/migrations/20260915045615_movion_realtime_completion.sql` before publishing this frontend. It preserves existing sessions and totals and keeps the older playback RPC available. It revokes direct client writes to view/analytics tables; view reports go through the qualified-playback RPC.

## Remaining product work

- Uploads currently use public media storage. Private/unlisted choices and unsupported comment/like-display settings are visibly unavailable, so the app cannot silently publish a supposedly private upload. Protected media storage and access rules require a separate implementation before enabling those settings.
- Geographic and share analytics are not collected and are shown as unavailable. The previously fabricated numbers were removed.
- Playback analytics cover signed-in viewers. Failed reports are queued in session storage for retries after navigation and reload. A forced termination can still lose the most recent unreported seconds; browsers that disable storage only have an in-memory retry queue.
- Watch hours measure real elapsed playback. Retention uses separately accumulated content seconds, so accelerated playback does not inflate watch hours or understate the content watched.
- Monetization and live broadcasting are not implemented by this change. Optional Mux processing still depends on configured credentials and available capacity; the original upload remains playable.
- Browser verification was blocked by automatic approval review's usage-limit error. Authenticated playback on two devices and an actual upload still need a browser acceptance pass.
