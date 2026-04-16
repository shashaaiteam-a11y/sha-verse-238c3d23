
# SHA-VERSE Ads Strategy — Complete Isolated Implementation Plan

## 🎯 Core Principles
- ❌ **NO Interstitial Ads** (user app se bahar nahi jayega, irritate nahi hoga)
- ✅ **TEST MODE ONLY** initially (Google account ban se safe)
- ✅ **100% Module Isolation** (existing UI/logic untouched)
- ✅ **Dark + Light theme** auto-adapt via CSS variables

---

## 🛡️ Test Mode Safety Layer (CRITICAL)

**File**: `src/lib/ads/adConfig.ts`
- Single source of truth for ALL ad IDs
- `USE_TEST_ADS = true` flag (default)
- Google official Test IDs hardcoded:
  - Banner: `ca-app-pub-3940256099942544/6300978111`
  - Native: `ca-app-pub-3940256099942544/2247696110`
  - Rewarded: `ca-app-pub-3940256099942544/5224354917`
  - Video: `ca-app-pub-3940256099942544/8691691433`
- Console warning on every load: `🧪 TEST ADS MODE ACTIVE`
- "Test Ad" badge visible on every ad (extra safety)
- Production switch = ek line change (Play Store ke time)

---

## 📦 Phase 1 — Foundation (Isolated Infrastructure)

### New Folder Structure (Zero impact on existing code)
```text
src/
├── components/ads/
│   ├── NativeAdCard.tsx          (post-style native ad)
│   ├── BannerAd.tsx              (320x100 horizontal)
│   ├── StickyBannerAd.tsx        (bottom sticky for reader)
│   ├── RewardedAdButton.tsx      (voluntary reward video)
│   ├── SponsoredStory.tsx        (story bar ad)
│   ├── SponsoredGroupCard.tsx    (group list ad)
│   ├── VideoPreRollAd.tsx        (5-sec skippable)
│   ├── VideoMidRollAd.tsx        (mid-video ad)
│   ├── ShortsScrollAd.tsx        (full-screen shorts ad)
│   ├── SponsoredSuggestion.tsx   (NovaChat suggestion ad)
│   └── TestAdBadge.tsx           (mandatory "Ad" label)
├── contexts/
│   └── AdContext.tsx             (frequency control + targeting)
├── hooks/
│   ├── useAdFrequency.ts         (15-20/day enforcement)
│   ├── useAdTargeting.ts         (AI-based ad category)
│   └── useRewardedAd.ts          (reward unlock logic)
└── lib/ads/
    ├── adConfig.ts               (Test/Live IDs switch)
    ├── adTypes.ts                (TypeScript types)
    └── adAnalytics.ts            (impression tracking)
```

### AdProvider (Global State)
- Tracks daily ad count per user (uses existing `ad_impressions` table)
- Enforces "no same ad within 2hr" rule
- "Hide Ad" → 24hr block for similar category
- New user (< 48hr) → 50% reduced frequency
- Wraps `<App />` in `main.tsx` (single line addition)

### Database (Minimal)
- Reuse existing `ad_impressions` table
- Add: `user_ad_preferences` table (hidden ads, categories blocked)
- Add: `rewarded_ad_unlocks` table (track NovaChat msgs, book unlocks, Movion ad-free time)

---

## 📍 Phase 2 — Screen-by-Screen Slot Insertion

### 🏠 HOME FEED (`src/pages/Home.tsx`)
- **Slot 1**: `<SponsoredStory />` injected into `FacebookStoriesBar` at position 1 or 2
- **Slot 2**: `<BannerAd />` after `<FriendSuggestions />`
- **Slot 3**: `<NativeAdCard />` injected into `feedItems.map()` every 4-5 posts
- Logic: `if ((index + 1) % 5 === 0) render NativeAdCard`

### 🎬 MOVION
- **Video Grid** (`MovionFeed`): `<NativeAdCard />` every 5-6 video cards
- **Watch Page** (`VideoPlayer`): `<VideoPreRollAd />` before play, `<VideoMidRollAd />` at 50% for 3+ min videos
- **Shorts/Pulse**: `<ShortsScrollAd />` every 5-7 shorts in vertical feed
- **Channel Page**: `<BannerAd />` below channel description

### 🤖 NOVACHAT (`src/pages/NovaChat.tsx`)
- **Welcome Screen**: `<SponsoredSuggestion />` as last suggestion card
- **Message Limit**: When user hits free limit → modal with `<RewardedAdButton reward="10 messages" />`
- ❌ NO conversation switch ad (removed per user request)

### 📚 BOOKSHELF
- **Discover Grid**: `<NativeAdCard />` every 5 books in grid
- **Book Detail**: `<BannerAd />` below "Start Reading" button
- **Premium Books**: `<RewardedAdButton reward="15 min access" />`
- **PDF/EPUB Reader**: 
  - Inline `<NativeAdCard />` every 10 pages (scrollable, skippable)
  - `<StickyBannerAd />` above pagination bar
  - ❌ NO chapter-change interstitial

### 👥 GROUPS
- **Group List**: `<SponsoredGroupCard />` at every 4-5 position
- **Group Feed**: `<NativeAdCard />` every 4-5 posts (same as Home)
- **Discovery**: `<BannerAd />` after categories section

### 👤 PROFILE
- **Header + Intro**: AD-FREE (premium feel)
- **Posts Tab**: `<NativeAdCard />` every 5 posts only

---

## 🎁 Rewarded Ad Rewards Map

| Module | Trigger | Reward |
|--------|---------|--------|
| NovaChat | Free message limit hit | +10 messages |
| Bookshelf | Premium book lock | 15 min access |
| Movion | Optional button | 1 hr ad-free |
| Groups | "Boost Post" button | Post visibility boost |

---

## 🎨 Theme Handling (Dark + Light)

ALL ad components use Tailwind tokens only:
- Background: `bg-card`
- Text: `text-foreground`, `text-muted-foreground`
- Border: `border border-border`
- Buttons: `bg-primary text-primary-foreground`
- NO hardcoded hex colors anywhere

---

## 🎯 AI Targeting Rules

| User Activity | Ad Categories |
|---------------|---------------|
| Reads books | Education, schools, colleges, lifestyle, tech |
| Watches Movion | Entertainment, movies, tech |
| Uses NovaChat | SaaS, tools, technology |
| Active in Groups | Community, events, lifestyle |

Implemented via `useAdTargeting()` hook reading user's recent activity from existing tables.

---

## 📊 Frequency Control Summary
- **Max 15-20 ads/day** per user (enforced globally)
- **No same ad** within 2 hours
- **"Hide Ad"** → 24hr similar block
- **New users** (<48hr) → 50% reduced
- All tracked in `ad_impressions` + `user_ad_preferences`

---

## 🚀 Phase 3 — Production Switch (Play Store ke Time)

When user is ready to publish:
1. AdMob account ban kar real Ad Unit IDs lo
2. `src/lib/ads/adConfig.ts` me real IDs paste karo
3. `USE_TEST_ADS = false` set karo
4. Build → Play Store upload
5. ⚠️ **Khud ke ads pe NEVER click** karna

---

## 🧠 Memory Save

Will save to:
- `mem://features/ads/strategy` — Complete strategy with NO INTERSTITIAL rule
- `mem://features/ads/test-mode-mandate` — Test ads mandatory until Play Store
- `mem://features/ads/module-isolation` — All ads in `src/components/ads/` only

Updates to `mem://index.md` Core section:
- "Ads: NO interstitials, NO module-switch ads. Test Mode mandatory until Play Store."

---

## 🔒 Module Isolation Guarantee

| Existing Module | Changes |
|-----------------|---------|
| Home Feed logic | ❌ Untouched (only ad slots inserted in render) |
| Movion video logic | ❌ Untouched (ad components wrap player) |
| NovaChat AI logic | ❌ Untouched (only welcome screen + limit modal) |
| Bookshelf reader | ❌ Untouched (ads inline in scroll) |
| Groups feed | ❌ Untouched (ad cards in list) |
| Profile | ❌ Untouched (only posts tab) |
| Auth, DB, RLS | ❌ Untouched |
| Realtime hooks | ❌ Untouched |

**Rule**: Ad code lives in `src/components/ads/` and `src/lib/ads/` ONLY. Existing files get ad component imports + slot insertions, nothing else.

---

## ✅ Approval Checklist
- [x] No interstitials anywhere
- [x] Test Mode safety enforced
- [x] Dark + Light theme support
- [x] Module isolation maintained
- [x] All 6 modules covered (Home, Movion, NovaChat, Bookshelf, Groups, Profile)
- [x] Frequency control + targeting included
- [x] Production switch path defined
