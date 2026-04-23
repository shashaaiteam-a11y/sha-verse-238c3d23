

# Book Reader: True Edge-to-Edge Immersive Layout

Goal: book content area MUST always fill the entire screen between a fixed 56px header and ~96px footer. No padding, no ad-pushed shrink, no white gaps. Tapping center toggles header/footer. Auto-hide after 3s of inactivity. Mobile/Tablet/Desktop fully responsive.

## Scope
- File touched: `src/pages/BookReader.tsx` only.
- No changes to PDFViewer, EPUBViewer, ad components, or any other module.
- No backend / RLS / hook changes.

---

## Layout Behavior (final)

```text
┌──────────────────────────────────────────┐
│ HEADER  h-14 (56px) — fixed, floats over │  ← translateY off when hidden
├──────────────────────────────────────────┤
│                                          │
│        BOOK CONTENT (edge-to-edge)       │  ← absolute inset-0
│   top:56px  /  bottom:96px (sm:80px)     │  ← when controls shown
│   top:0     /  bottom:0                  │  ← immersive (controls hidden)
│                                          │
├──────────────────────────────────────────┤
│ FOOTER  ~96px — progress + prev/next     │  ← translateY off when hidden
└──────────────────────────────────────────┘
```

Key rule: header & footer **float above** content (z-50, position fixed). The `<main>` content uses `absolute inset-0` with `top`/`bottom` offsets that change ONLY based on controls visibility — never based on whether an ad is present.

---

## Changes to `src/pages/BookReader.tsx`

### 1. Reposition the inline reader ad
- Move `BookReaderInlineAd` to render as a small overlay docked to the **bottom edge of the content area** (just above the footer), not above the content. It will appear as a floating tile that can be dismissed.
- The ad NEVER changes the content area's `top`/`bottom` offsets → reader stays fully edge-to-edge.
- Make ad container narrower (max-w-md) and centered so it doesn't cover the whole reading area.

### 2. Simplify `<main>` offsets
Replace the current multi-state `top-[19rem]/top-[14rem]/top-14/top-0` chain with just two states:

```tsx
<main className={cn(
  "absolute inset-x-0 overflow-hidden transition-[top,bottom] duration-300",
  showControls ? "top-14" : "top-0",
  showControls ? "bottom-24 sm:bottom-20" : "bottom-0"
)}>
```

Footer real height: `~96px` mobile (`bottom-24`), `~80px` desktop (`bottom-20`). Sticky banner ad inside the footer stays inside the footer's own bounds (no extra offset needed because the banner ad lives ABOVE the slider inside the footer element — so footer height already includes it).

### 3. Auto-hide controls after 3s
Add a `useEffect` that, whenever `showControls` becomes true, starts a 3000ms timer to auto-hide. Reset the timer on any user activity (tap header/footer or page navigation). Cancel timer when controls hidden manually.

### 4. Tap zones for page navigation (mobile/tablet)
Wrap the content area with three invisible tap zones:
- Left 25% → previous page
- Center 50% → toggle controls (existing behavior)
- Right 25% → next page

Use `pointer-events-none` overlays positioned absolutely so they don't interfere with PDF/EPUB scroll. Only on touch devices (`md:hidden`-style), since desktop uses keyboard arrows.

### 5. Keyboard navigation (desktop)
Add a global `keydown` listener:
- `ArrowLeft` → prev page
- `ArrowRight` → next page
- `Escape` → toggle controls

(PDFViewer already has its own arrow handler — to avoid double-jumps, keep BookReader's listener but check that focus is not in an input.)

### 6. Footer height normalization
Currently footer contains: StickyBannerAd + slider + nav buttons. Constrain its total height to a predictable value:
- Wrap StickyBannerAd in a container with `max-h-[50px] overflow-hidden` so footer remains ~96px mobile / ~80px desktop.
- Adjust `bottom-24 / bottom-20` offsets to match actual rendered footer height.

### 7. Remove ad-related layout shifts
Delete the `showReaderAd ? "top-[14rem]..." : "top-14"` branches. The ad is now a floating overlay that doesn't displace content.

---

## Responsive Notes
- Mobile (<768px): full edge-to-edge, tap zones active, footer ~96px.
- Tablet (768–1024px): same as mobile, tap zones still useful.
- Desktop (≥1024px): keyboard arrows + tap-to-toggle. PDF/EPUB viewers already handle centering of pages within the wide canvas — no extra centered-column toggle needed (out of scope per "don't change other modules/components").

## Realtime Behavior
- Reading progress save (already debounced 600ms via `useBookInteractions`) — untouched, continues to sync.
- Bookmarks (Supabase realtime via `useReaderBookmarks`) — untouched.
- No new realtime channels added.

## Out of Scope (explicitly NOT changing)
- PDFViewer / EPUBViewer internals
- Ad components (`BookReaderInlineAd`, `StickyBannerAd`)
- Bookshelf list, channels, upload, comments
- Any other module

## Acceptance Criteria
1. With controls visible: book content fills exactly `100vh - 56px (header) - footer height`.
2. With controls hidden: book content fills `100vh` edge-to-edge.
3. Inline reader ad never shrinks the content area.
4. Tap center toggles controls; auto-hides after 3s.
5. Left/right tap zones flip pages on mobile.
6. ArrowLeft/ArrowRight flip pages on desktop; Escape toggles controls.
7. No horizontal scroll, no white gaps on any breakpoint.
8. Reading progress + bookmarks continue to sync in realtime.

