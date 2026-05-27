# App Logo Status Ring — Paid Promotions

Additive feature wrapping the existing header logo on `src/pages/Home.tsx`. Zero changes to story, feed, header layout, or footer behavior. Reuses `FacebookStoryViewer` + `CreateStoryDialog` patterns and existing story-view tracking semantics, but stores data in a brand-new isolated table so user stories are never touched.

---

## 1. Backend (new isolated table — does NOT modify `stories`)

New table `public.app_promotions` with the same shape as `stories`:

- `id uuid pk`, `owner_id uuid not null`, `media_url text`, `media_type text` (image/video), `caption text`, `background_color text`, `text_content text`, `created_at timestamptz default now()`, `expires_at timestamptz default now()+24h`, `views_count int default 0`.

New table `public.app_promotion_views`:

- `id uuid pk`, `promotion_id uuid fk`, `viewer_id uuid`, `viewed_at timestamptz`, unique(`promotion_id`, `viewer_id`).

Grants + RLS:

- `GRANT SELECT ON app_promotions TO anon, authenticated` (public read of active promo).
- `GRANT INSERT, UPDATE, DELETE ON app_promotions TO authenticated` — but RLS restricts writes to `auth.uid() = <APP_OWNER_ID constant>` only.
- `app_promotion_views`: any authenticated user can insert their own view row; SELECT only by the owner.
- Trigger increments `views_count` on insert into `app_promotion_views`.
- Realtime publication added for both tables.

App owner UID stored as a Postgres `app_settings` row + mirrored as `VITE_APP_OWNER_ID` constant in `src/lib/constants/appOwner.ts` so RLS and client share one source of truth.

## 2. Hooks (new, isolated — no edits to `useStories.ts`)

- `src/hooks/useAppPromotions.ts`
  - `useActivePromotions()` — returns non-expired promotions ordered by `created_at`, with realtime subscription on `app_promotions` (unique channel suffix per project rule).
  - `useCreatePromotion()` — owner-only insert (image/video/text).
  - `useDeletePromotion()` — owner-only.
  - `useMarkPromotionView(promotionId)` — idempotent insert into `app_promotion_views` with module-level `viewedPromotionCache` (mirrors `useStories` pattern).
- `src/lib/constants/appOwner.ts` — `APP_OWNER_ID` constant + `isAppOwner(uid)` helper.

## 3. UI components (all new, additive)

- `src/components/promotions/AppLogoStatusRing.tsx`
  - Wraps the existing `<img src="/sha-verse-logo.jpeg" />` exactly as-is (passed via children or rendered inside).
  - Reads `useActivePromotions()` + `useAuth()`.
  - Renders:
    - Conic-gradient ring (HSL tokens already in `index.css`, slow `animate-spin`-style rotation via a new keyframe in `tailwind.config.ts` — `promotion-ring-spin 8s linear infinite`) only when `promotions.length > 0`.
    - Owner-only `+` badge (absolute top-right, `Plus` icon from lucide) when `isAppOwner(user.id)`. Completely unmounted for non-owners.
    - `onClick` on logo: if promotions exist, open viewer; if owner with no promotions, open studio.
    - `onClick` on `+`: open Promotion Studio sheet.

- `src/components/promotions/PromotionStudioSheet.tsx`
  - Bottom sheet (shadcn `Sheet side="bottom"`) with three actions: Upload Image, Upload Video, Create Text/Paid Promotion.
  - Each action opens `CreateStoryDialog` in a new "promotion mode" prop, OR a lightweight wrapper around the same uploader code path that writes to `app_promotions` instead of `stories`. Implementation: extract the upload-handling logic from `CreateStoryDialog` into a shared `useMediaUpload` helper if not already shared; otherwise create a thin `CreatePromotionDialog` that mirrors its UX 1:1.

- `src/components/promotions/PromotionViewer.tsx`
  - Thin wrapper that adapts `Promotion[]` to the props shape of `FacebookStoryViewer` (or directly reuses it by mapping fields → `Story`-like object) so we get identical UX: full-screen, swipe-down close, segmented progress bar, tap left/right.
  - Mounts `useMarkPromotionView` on each segment change.
  - Bottom-left views counter reads `promotion.views_count` from realtime query (live updates without refresh). Click is a no-op for non-owners; owner sees viewer list (optional, parity with stories).

## 4. Wiring into Home

Single edit in `src/pages/Home.tsx`: replace the bare `<img ... sha-verse-logo />` inside the header `<div className="flex items-center gap-2">` with:

```tsx
<AppLogoStatusRing>
  <img src="/sha-verse-logo.jpeg" ... />  // unchanged
</AppLogoStatusRing>
```

No other Home, header, footer, feed, or story code changes.

## 5. Design tokens

Add to `tailwind.config.ts` keyframes/animation:
- `promotion-ring-spin` (360deg, 8s linear infinite).
Add to `index.css` a `--gradient-promotion-ring` conic-gradient using existing primary/accent/secondary HSL tokens — works in dark + light mode automatically.

## 6. Acceptance verification checklist

- Non-owner, no active promo → header identical to current pixel-for-pixel.
- Non-owner, active promo → ring visible, no `+`, click opens viewer.
- Owner → ring (if any) + `+`; `+` opens studio.
- Viewer matches `FacebookStoryViewer` behavior (swipe-down, segmented progress, tap-nav).
- Views counter updates live via realtime subscription on `app_promotion_views` insert.
- `stories`, `FacebookStoriesBar`, footer `BottomNav`, feed ads untouched.

## Technical notes

- Strict module isolation: all new code under `src/components/promotions/` + `src/hooks/useAppPromotions.ts`. No edits to `useStories.ts`, `FacebookStoryViewer.tsx`, `FacebookStoriesBar.tsx`, `CreateStoryDialog.tsx` (we either extend with an optional `mode` prop OR fork-copy minimally — decided during build based on diff size).
- Realtime channels use unique suffix per project rule (`app_promotions:${crypto.randomUUID()}`).
- Owner ID: stored as constant + enforced in RLS. Changing owner = one migration + one constant edit.
- 24h expiry enforced by `expires_at` filter in query + a daily cleanup is optional (rows can stay; query filters them out).
