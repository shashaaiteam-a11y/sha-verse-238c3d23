Stories & PYMK ME AB JESE ME BATA RAHA HUN SAME WESE HI ADS SHOW HONE CHAHIYE

ADS STRATERGY FOR Stories & PYMK  
  
  
  
Stories & PYMK — Smart Ad Integration Plan

## What's wrong right now (from screenshot)

- **Stories bar**: `SponsoredStory` is rendered TWICE (once raw at line 72, once wrapped at line 110). The label "Sponsored" floats outside the rail and breaks the layout — looks like a bug, not a story tile.
- **PYMK**: Zero ad integration. Pure friend cards.

## Goal

Add Facebook/WhatsApp-style native ads that look exactly like a story tile and a person card — no banners, no popups, no interstitials.

---

## 1. Stories Bar — "Sponsored Story" tile

**Placement (final rule):**

- Slot order: `[Your Story] → [Friend 1] → [Friend 2] → 📢 Sponsored Story → [Friend 3] → [Friend 4] → [Friend 5] → 📢 Sponsored Story → ...`
- First sponsored slot appears **after position 3** (clean first impression).
- Repeat **every 5 story tiles**.
- If user has 0 friend stories → show **only 1** sponsored tile after "Your Story".
- Hard cap: **max 2 sponsored stories** in the visible rail.

**Visual (pixel match to real story tile):**

- Same width/height as friend story tiles (64×64 avatar inside 16:9-ish rounded container, same as current story rings).
- Top-right small "Sponsored" badge (not floating outside).
- Brand logo as the avatar circle with blue ring (matches unviewed story ring).
- Caption row below = brand name, truncated, same font as friend names.
- 3-dot menu (long-press / hover) → "Hide this ad" → triggers 24h category block via existing `hideAd()` in `AdContext`.

**Behavior:**

- Tap → opens full-screen ad viewer (reuses `FacebookStoryViewer` shell, 5s auto-skip, "Skip" button after 2s, swipe-down to dismiss).
- Auto-records impression once per mount via existing `recordAdImpression`.
- Click → `recordAdClick`.
- Respects existing frequency cap, cooldown, and category block from `useAdFrequency`.

---

## 2. People You May Know — "Sponsored Suggestion" card

**Placement (final rule):**

- Inject **1 sponsored person card at position 3** (after 2 real suggestions).
- If suggestions < 3 → no ad (avoid awkward solo ad).
- If suggestions ≥ 6 → also inject a second one at position 6.
- Hard cap: **max 2** sponsored cards.

**Visual (pixel match to real PYMK card):**

- Identical width (`w-32`), avatar size (`h-16 w-16`), same font, same Add button position.
- Brand logo replaces user avatar (square-rounded for brand differentiation).
- "Sponsored" small badge replaces "X mutual friends" line.
- CTA button text changes from "Add" → "Visit" / "Learn More" (icon: `ExternalLink` instead of `UserPlus`).
- 3-dot top-right "Hide this ad".

**Behavior:**

- Tap card or button → tracks click + opens advertiser URL (placeholder for now since test mode).
- Hide → 24h block via `useAds().hideAd("community")`.
- Test badge visible in dev (test mode active).

---

## 3. AI placement logic (lightweight, real-time)

A new tiny hook `useDiscoveryAds(itemCount, slotType)` that returns positions where ads should be injected. Logic:

```text
- New user (<48h)              → fewer ads (every 6 + cap 1)
- Active user (>48h)           → standard (every 5, cap 2)
- Same ad in cooldown (2h)     → skip slot
- Category blocked (24h)       → skip slot
- Daily cap hit                → return []
- Fast horizontal scroll       → defer next ad by 1 slot
```

Reuses the existing engine: `AdContext`, `useAdFrequency`, `useAdTargeting`, `recordAdImpression`, `recordAdClick`. **No new tables, no new edge functions.**

---

## 4. Files to change / create

**Create:**

- `src/hooks/useDiscoveryAds.ts` — slot-position calculator for horizontal rails.
- `src/components/ads/SponsoredPersonCard.tsx` — PYMK-shaped native ad card.

**Modify:**

- `src/components/ads/SponsoredStory.tsx` — make it pixel-match a real story tile (avatar + caption layout) and add hide-menu.
- `src/components/stories/FacebookStoriesBar.tsx` — remove the duplicate `<SponsoredStory />` at line 72, switch to position-based injection inside the friends `.map()`.
- `src/components/FriendSuggestions.tsx` — inject `SponsoredPersonCard` at calculated positions inside the suggestions `.map()`.
- `src/components/ads/index.ts` — export new card.

**Untouched (strict isolation):**

- No changes to `useStories`, `useFriendSuggestions`, feed logic, other modules, or any UI outside these two components.
- No DB migrations.
- Test ads stay ON (`USE_TEST_ADS = true`).

---

## 5. What the user will see

```text
┌─ Stories ─────────────────────────────── + Create Story ┐
│ [Your] [Mike] [Sara] [📢Brand] [John] [Lisa] [Ali] ...  │
└─────────────────────────────────────────────────────────┘

┌─ People You May Know ───────────────────────────────────┐
│ [Carol]  [Raj]  [📢 Sponsored]  [Emma]  [Tom]  [Sam]    │
│  Add      Add      Visit         Add     Add    Add     │
└─────────────────────────────────────────────────────────┘
```

Sponsored tiles look native, sit naturally in the row, and respect daily cap + cooldown + hide-block.   
  
  
  
  
isko completely acche se analyze karke implement karo:  
  
  
YE SABHI CHEEZEN REALTIME ME WORK KARNI CHAHIYE

isko acche se analyze karke kaam karo

note: yaad rahe ye sab bina kisi dusre features aur module chede bina ya dusre features aur module me changes kiye bina, aur bina kisi dusre features ya module ke ui ko chede bina kaArna