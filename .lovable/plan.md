

# Book Reader: Remove Yellow Background + True Full-Screen Book Fill

## The two problems you're seeing

### 1. Yellow background everywhere
File: `src/pages/BookReader.tsx` (line 46)

```ts
light: { bg: "bg-amber-50", text: "text-zinc-900", ... }
```

`bg-amber-50` is the cream/yellow tone you're seeing. The wrapper `<div>` paints it across the entire screen, and any space the PDF/EPUB doesn't cover shows that yellow.

### 2. Book doesn't fully fill the screen
- **PDFViewer**: the `<canvas>` uses `max-w-full max-h-full` with the parent `flex items-stretch justify-center`. The PDF page keeps its natural aspect ratio, so on a wide desktop viewport (1030×654 right now) the page is only as wide as its aspect allows → blank strips on left/right show the yellow background.
- **EPUBViewer**: hard-coded `minHeight: 70vh; height: 70vh` (line 196 + 208) — so EPUB only fills 70% of the viewport height, leaving a yellow band at the bottom. It also uses cream `#fffbf0` body color.
- The page wrapper currently has `flex items-stretch justify-center` which centers the viewer instead of letting it fill.

---

## Complete reader behavior — Mobile / Tablet / Desktop

```text
┌────────────────────────────────────────────┐
│ HEADER (h-14, fixed, floats, auto-hide 3s) │  ← back · zoom · 🔖 · TOC · ⚙️
├────────────────────────────────────────────┤
│                                            │
│   BOOK CONTENT (absolute inset-0)          │  ← fills 100vh edge-to-edge
│   • Mobile: tap zones L/C/R                │     (controls hidden)
│   • Tablet: same as mobile                 │     OR 100vh − 56 − 96
│   • Desktop: ← → keyboard arrows           │     (controls visible)
│                                            │
├────────────────────────────────────────────┤
│ FOOTER (~96px, fixed, floats)              │  ← banner ad + slider + prev/next
└────────────────────────────────────────────┘
```

| Screen | Header | Content | Footer | Navigation |
|---|---|---|---|---|
| Mobile (<768px) | 56px, hides on tap | Full-bleed, theme-matched bg | 96px | L tap = prev, C = toggle UI, R = next |
| Tablet (768–1023px) | 56px, shows title | Full-bleed | 96px | Tap zones + slider |
| Desktop (≥1024px) | 56px, full toolbar | Full-bleed | 80px | ← → keys, Esc to toggle |

---

## Fixes (only `src/pages/BookReader.tsx`)

### Fix 1 — Replace yellow theme background with neutral reader background

```ts
const THEME_COLORS: Record<ReaderTheme, { bg: string; text: string; headerBg: string }> = {
  light: { bg: "bg-white",       text: "text-zinc-900", headerBg: "bg-white/95" },
  dark:  { bg: "bg-zinc-900",    text: "text-zinc-100", headerBg: "bg-zinc-800/95" },
  sepia: { bg: "bg-[#f4ecd8]",   text: "text-[#5b4636]", headerBg: "bg-[#e8dcc8]/95" },
};
```

Light = pure white (matches PDF page bg → no visible gap). Sepia stays cream (intentional). Dark stays dark.

### Fix 2 — Make the content wrapper truly fill, not center

In `<main>` change:

```tsx
<div className="relative w-full h-full flex items-stretch justify-center overflow-auto">
```

to:

```tsx
<div className="relative w-full h-full overflow-auto">
```

Then ensure each viewer wrapper uses `w-full h-full block` (PDF wrapper, EPUB wrapper, fallback wrapper). The PDF/EPUB viewer components already accept `className="w-full h-full"`; we just stop the flex-centering that was leaving margins.

### Fix 3 — PDF: use the theme background behind the canvas

Wrap `<PDFViewer>` so the area around the natural-aspect PDF page matches the reader theme (so even if the page is portrait on a wide screen, the side strips look intentional, not yellow):

```tsx
<div className={cn(
  "w-full h-full flex items-center justify-center",
  theme === "dark" ? "bg-zinc-900" : theme === "sepia" ? "bg-[#f4ecd8]" : "bg-white"
)}>
  <PDFViewer ... className="max-w-full max-h-full" />
</div>
```

This is purely a wrapper — **PDFViewer internals untouched** (per module-isolation rule).

### Fix 4 — EPUB: stop the 70vh limit by overriding via wrapper height

EPUBViewer hard-codes `minHeight/height: 70vh` inline — we cannot edit that file (out of scope). Workaround: wrap it in a fixed-positioned container that gives it a parent with explicit pixel height equal to the available space, and add `[&>div]:!h-full [&>div]:!min-h-0` to neutralize the inline style via Tailwind arbitrary child selectors.

```tsx
<div
  ref={epubRef}
  className={cn(
    "w-full h-full block [&>div]:!h-full [&>div]:!min-h-[unset]",
    theme === "dark" ? "bg-zinc-900" : theme === "sepia" ? "bg-[#f4ecd8]" : "bg-white"
  )}
>
  <EPUBViewer ... className="!h-full !min-h-0" />
</div>
```

The `!important` Tailwind classes (`!h-full !min-h-0`) override the inline `style={{ minHeight: "70vh", height: "70vh" }}` because Tailwind's `!` produces `height: 100% !important` which beats inline non-important styles.

### Fix 5 — Fallback "no file" card also fills

Already wrapped in `w-full h-full flex items-center justify-center` — keep, but ensure outer bg is the theme bg so nothing yellow shows.

---

## What stays the same (untouched)

- PDFViewer.tsx, EPUBViewer.tsx internals
- Ads (`StickyBannerAd`, `BookReaderInlineAd`)
- Bookmarks, TOC, settings sheet, reading progress
- Realtime sync via `useBookInteractions` and `useReaderBookmarks`
- Auto-hide-3s, tap zones, keyboard arrows
- All other modules

---

## Acceptance criteria

1. Light theme shows **white** (not yellow/amber) anywhere reader background is visible.
2. PDF: page is centered, side gutters match white/dark/sepia theme — no yellow strip.
3. EPUB: fills full height between header and footer — no 30% blank band.
4. Tapping center hides controls → book occupies the entire viewport (100vh × 100vw).
5. Mobile, tablet (1030px current viewport), and desktop all render edge-to-edge.
6. Reading progress + bookmarks + ads continue to sync in realtime.
7. No other module/component touched.

