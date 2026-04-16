

## YouTube-Level Internal System Enhancements for Movion

### Current State Analysis
The Movion module already has solid foundations:
- Shorts swipe with `snap-y snap-mandatory` + IntersectionObserver (70% threshold) 
- Single active player (only `isActive` video plays, others pause)
- Home feed algorithm with freshness, engagement, category match
- Pulse algorithm with retention, replays, engagement speed
- Subscription feed with notification level priority
- Library system (History, Watch Later, Liked, Playlists)

### Gaps Found (What's Missing vs YouTube)

**1. Shorts Pre-fetching**: Currently loads ±1 video. YouTube pre-fetches next 2-3 for smoother experience.

**2. Shorts Swipe-Away Tracking**: No tracking of "swiped away quickly" vs "watched fully" — this is the most important Shorts metric per YouTube's own docs.

**3. Pulse Algorithm Missing Freshness**: Home feed has freshness boost (3-day decay) but Shorts/Pulse algorithm has none — new Shorts should get priority.

**4. Creator Diversity in Feed**: No logic to prevent same channel appearing back-to-back in feeds.

**5. "Not Interested" Feedback**: Button exists in ShortsPlayer but doesn't affect algorithm (just shows a toast).

**6. Session-Based Interest Tracking**: No tracking of what categories user watches in current session to adjust feed dynamically.

### Implementation Plan

**File: `src/movion/pages/MovionShorts.tsx`**
- Change pre-fetch window from `±1` to `±3` (next 3 + previous 1)
- Track swipe-away behavior: if user spends <2 seconds on a short before swiping, record negative signal

**File: `src/hooks/useMovionAlgorithms.ts`**
- **Pulse Algorithm**: Add freshness boost (48hr decay window) — new Shorts ranked higher
- **Pulse Algorithm**: Add swipe-away penalty using localStorage-based session data
- **Home Feed + Pulse**: Add creator diversity logic — if same channel appears consecutively, swap positions
- **Home Feed**: Add session interest tracking — boost categories watched in current session

**File: `src/movion/components/ShortsPlayer.tsx`**
- "Not Interested" button: store video ID in localStorage hidden list and emit event to algorithm
- Track watch duration per short for swipe-away metric

**File: `src/hooks/useHiddenVideos.ts`** (existing)
- Ensure Shorts "Not Interested" uses same hidden videos system

### What Won't Change
- No other modules (Home feed, Bookshelf, Groups, Profile, NovaChat)
- No global UI components
- No database schema changes (all tracking via localStorage for session data)

### Technical Details
- Pre-fetch: `Math.abs(idx - activeIndex) <= 3` with direction bias (next 3 > prev 1)
- Freshness in Pulse: `Math.max(1 - (hoursOld / 48), 0) * 0.2`
- Creator diversity: post-sort pass that swaps consecutive same-channel videos
- Swipe-away: track `{videoId, watchSeconds}` in session, penalize <2s views in scoring

