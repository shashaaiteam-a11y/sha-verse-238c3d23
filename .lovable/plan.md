

## Analysis: Current State vs Master Prompt

### Already Done (No Changes Needed)
- All core tables: videos, likes, comments, subscriptions, video_views, earnings, channels
- **All 3 sync triggers are NOW ATTACHED and working**: likes_count, comments_count, views_count auto-sync
- RLS policies on all tables
- Realtime enabled on videos, likes, comments, subscriptions
- Shorts (Pulse) feed with swipe + auto-play
- Long video watch page + comments + related
- AI recommendation algorithm (client-side in useMovionAlgorithms)
- Trending query (24hr window with views + likes*2)
- Upload flow + Creator Studio + Monetization tabs
- Like/Dislike optimistic UI
- HLS/Mux transcoding pipeline

### What's Missing (3 Items)

| Item | Description |
|------|-------------|
| `engagement_score` column | DB-level engagement scoring on videos table |
| `user_interests` table | Track user category preferences for personalized AI feed |
| `ad_impressions` table | Track ad revenue per video for monetization |

---

## Implementation Plan

### Step 1: Database Migration
Single migration to add:

1. **Add `engagement_score` column** to `videos` table (FLOAT DEFAULT 0)
2. **Create `user_interests` table** — `id`, `user_id`, `category`, `score` with RLS (users can read/write own interests)
3. **Create `ad_impressions` table** — `id`, `video_id`, `revenue`, `created_at` with RLS (public read, authenticated insert)
4. **Create trigger `update_engagement_score`** — fires AFTER UPDATE on `videos` when views_count/likes_count/comments_count change, auto-calculates: `(views_count * 0.4) + (likes_count * 0.3) + (comments_count * 0.2)`

### Step 2: Create `useUserInterests.ts` Hook
- Track user viewing patterns: when a video is watched, upsert the user's interest score for that video's category
- Query top categories for personalized feed

### Step 3: Update `useVideos.ts` — Use `engagement_score`
- Update trending query to also consider `engagement_score` as a sort factor
- No breaking changes — just enhanced sorting

### Files Changed
- **New migration SQL** (add column, 2 tables, 1 trigger, RLS)
- `src/hooks/useVideos.ts` (minor sort update)
- **New**: `src/hooks/useUserInterests.ts`

### No Other Modules Affected
All changes confined to Movion database and hooks only. Zero impact on Home, Groups, Bookshelf, Profile, NovaChat, or any other module's UI.

