# Google Play Books-style Paged Reader (Bookshelf only)

Abhi reader continuous vertical scroll me chalta hai (`PaginatedReader.tsx` ek single flowing document render karta hai). Play Books wali feel ke liye horizontal, full-screen, page-by-page reading chahiye — text apne aap page me fit ho, adhoori line agle page par chali jaye.

## Kya banega

1. **Paged (horizontal) layout**
   - Content ko CSS multi-column me daala jayega: har "page" = viewport ki width ka ek column, `column-gap` page ke beech ka gutter.
   - Browser khud text ko columns me todta hai, isliye line kabhi aadhi nahi katti — jo line fit nahi hoti wo poori ki poori agle page par chali jaati hai.
   - Images/tables ko `break-inside: avoid` milega taaki wo do pages me na tootein.

2. **Page turn interactions**
   - Left/right swipe (touch), tap zones (left 25% = previous, right 25% = next, center = controls toggle), keyboard arrows, aur on-screen prev/next.
   - Turn animation: smooth horizontal slide (default) — 250ms, 60fps, GPU transform only.

3. **Correct page counting + progress**
   - Total pages = `scrollWidth / pageWidth` (settings badalte hi recompute).
   - Bottom par "Page X of Y" + chapter ke andar bacha hua time/percent.
   - Progress save wahi existing mechanism use karega (block anchor), page number nahi.

4. **Zero-jump anchoring on reflow**
   - Font size / line-height / margin / theme / rotation change hone par current visible block id + char offset yaad rakh kar, naye layout me usi block wale page par land karenge — Play Books jaisa.

5. **Reading mode toggle (Scroll vs Paged)**
   - `ReaderSettingsPanel` me naya toggle: **Paged** (default) / **Scrolling**.
   - Purana vertical scroll mode intact rahega as an option, isliye koi regression nahi.
   - Setting localStorage me persist (`settings.ts`).

6. **Page Mode (scanned books) compatibility**
   - Jo books scanned/full-page images hain (`quality.ts` detect karti hai) wo paged mode me natural fit hain — ek image = ek page, aur swipe se page turn.

## Technical details

Files touched (Bookshelf reader ke bahar kuch nahi):

```text
src/lib/reader/settings.ts                              (readingMode: "paged" | "scroll", pageAnimation)
src/components/bookshelf/reader/PagedFlow.tsx           (NEW — multi-column paged engine + swipe/tap/keys)
src/components/bookshelf/reader/PaginatedReader.tsx     (mode switch: PagedFlow ya existing scroll flow, shared anchor/selection/highlight logic reuse)
src/components/bookshelf/reader/ReaderSettingsPanel.tsx (mode toggle + animation toggle)
src/pages/BookReader.tsx                                (page X/Y footer + prev/next wiring)
```

Core layout (PagedFlow):

```text
.viewport { overflow:hidden; height:100%; width:100% }
.content  { column-width: <viewportWidth>px; column-gap: 32px;
            height: 100%; transform: translateX(-page * (W+gap)) }
break-inside: avoid  →  img, table, h1-h3
orphans/widows: 2
```

- Page turn = `transform: translate3d(...)` par transition, koi scroll jank nahi.
- Resize / orientation change / settings change → column width recalc → anchor block ka page dhoondh kar wahin restore.
- Search, highlights, bookmarks, TTS-less selection toolbar — sab existing handlers hi reuse honge (block ids same rehte hain).

Not touched: upload flow, DB/RLS, extraction engine, Home, Movion, NovaChat, Groups, Profile, ads.

## Verify

Preview me ek PDF khol kar: swipe se pages turn, font 14→28 badal kar same jagah par land, rotate kar ke bhi position safe, aur scanned book ek-page-per-swipe — sab screenshots se confirm karenge.
