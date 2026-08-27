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
  
  
  
  
  
  
  
  
  
  
  
  
  
TASK: Play Books-style Paged Reader for Bookshelf (SHA-VERSE) — additive feature only

═══════════════════════════════════════════════════════════

SCOPE LOCK — READ FIRST, FOLLOW STRICTLY, NO EXCEPTIONS

═══════════════════════════════════════════════════════════

- Touch ONLY the 5 files listed under "Files to change" below. Do not modify,

  refactor, rename, restyle, or "improve" anything else anywhere in the app —

  no other modules, components, pages, routes, buttons, or UI/UX elements.

- Do NOT create any new file beyond PagedFlow.tsx unless something below

  genuinely cannot live in an existing listed file. If you must create one,

  it may only live inside src/components/bookshelf/reader/ or src/lib/reader/,

  and you must explain why in your final report.

- Do NOT duplicate existing logic. Reuse the anchor/search/highlight/bookmark

  system already used by PaginatedReader.tsx. Do not build a second/parallel

  anchor system, a second settings-storage mechanism, or a second progress

  field.

- Scrolling mode's current behavior must remain 100% pixel- and

  functionally-identical after this change. This is purely additive.

- Never open, edit, or restyle Footer Navigation's own component file —

  see "Footer Navigation" section below for the only permitted touch point.

- Explicitly untouched: upload flow, DB/RLS policies, extraction engine,

  Home, Movion, NovaChat, Groups, Profile, ads, Story system, Header/Footer

  CSS, chat UI, call screen.

- Match existing TypeScript/React conventions already used in

  PaginatedReader.tsx (naming, prop typing, state patterns, error/loading

  handling style) — do not introduce a different code style. Full typing,

  no stray console.log left behind.

═══════════════════════════════════════════════════════════

CURRENT STATE (context — do not re-derive, just use this)

═══════════════════════════════════════════════════════════

- src/components/bookshelf/reader/PaginatedReader.tsx — existing production

  reader, continuous vertical scroll.

- src/components/bookshelf/reader/ReaderSettingsPanel.tsx — existing

  settings UI.

- src/lib/reader/settings.ts — existing settings state + persistence

  (localStorage).

- src/lib/reader/quality.ts — already detects scanned/full-page-image books.

- src/pages/BookReader.tsx — the reader page/route.

- Content already carries stable block IDs used today for search, highlights,

  and bookmarks — this is the anchor system to reuse, not rebuild.

═══════════════════════════════════════════════════════════

GOAL

═══════════════════════════════════════════════════════════

Add a second reading mode, "Paged": same content as today's Scroll mode,

rendered as a horizontal, full-screen, page-by-page CSS multi-column layout

(Google Play Books-style). Toggle lives in ReaderSettingsPanel. Scroll mode

stays exactly as-is as the fallback option.

═══════════════════════════════════════════════════════════

FILES TO CHANGE (exactly these 5)

═══════════════════════════════════════════════════════════

1. src/lib/reader/settings.ts

   - Add `readingMode: "paged" | "scroll"` (default "paged") and

     `pageAnimation: boolean` (default true) to the EXISTING settings shape.

   - Persist via the existing localStorage mechanism already in this file —

     do not add a second storage system.

2. src/components/bookshelf/reader/PagedFlow.tsx  (NEW FILE)

   - The multi-column paged rendering + interaction engine. Full spec below.

3. src/components/bookshelf/reader/PaginatedReader.tsx

   - Add a mode switch: render the existing scroll flow OR <PagedFlow>,

     driven by settings.readingMode.

   - Pass the existing anchor/selection/highlight logic down as

     props/context into PagedFlow — do not duplicate it.

4. src/components/bookshelf/reader/ReaderSettingsPanel.tsx

   - Add a Paged / Scrolling toggle and a page-animation on/off toggle.

   - Every existing control in this panel must remain exactly as it is.

5. src/pages/BookReader.tsx

   - Wire "Page X of Y" + remaining-in-chapter indicator, prev/next controls.

     Only rendered when readingMode === "paged".

═══════════════════════════════════════════════════════════

PagedFlow.tsx — EXACT SPEC

═══════════════════════════════════════════════════════════

LAYOUT CSS

----------

.viewport { position: fixed; inset: 0; overflow: hidden; }

.content {

  height: 100%;

  column-width: <viewport width in px — measured on mount, recomputed on

                 resize/orientation change and on any settings change>;

  column-gap: 32px;

  column-fill: auto;   /* REQUIRED. Without this, some browsers try to

                           "balance" columns instead of filling sequentially,

                           producing inconsistent content distribution near

                           chapter ends. */

}

.content img, .content table, .content h1, .content h2, .content h3 {

  break-inside: avoid;

  -webkit-column-break-inside: avoid;   /* fallback for older Android WebView */

}

.content p {

  orphans: 2;

  widows: 2;

  /* NOTE: browser best-effort hints, not guarantees — a browser will ignore

     these if a paragraph is too short to satisfy them. Do not treat as

     pixel-perfect; confirm visually per the Verify checklist. */

}

PAGE-TURN TRANSFORM (do NOT use a CSS var()+calc() expression — you already

have the measured pageWidth from the page-counting step, so set it directly

via computed inline style on pageIndex change):

  [contentEl.style](http://contentEl.style).transform =

    `translate3d(${-pageIndex * (pageWidth + 32)}px, 0, 0)`;

  [contentEl.style](http://contentEl.style).transition =

    pageAnimation ? 'transform 250ms cubic-bezier(0.4,0,0.2,1)' : 'none';

  GPU-only transform, no layout thrash, no scroll-based animation

  (native smooth-scroll timing is inconsistent across Android WebView

  versions — do not use scrollTo/scrollBy for the page-turn animation).

INTERACTION ZONES (on the full-screen container)

  - Left 25% width  → tap = previous page

  - Right 25% width → tap = next page

  - Center 50%      → tap = toggle reader chrome (page indicator, top bar)

  - Horizontal swipe/drag anywhere → prev/next (threshold-based)

  - Left/Right arrow keys → prev/next (desktop)

  - CRITICAL: in the tap handler, before treating a tap as page-turn or

    chrome-toggle, check that `window.getSelection()?.toString()` is empty.

    If the user is mid-selection (highlighting text), do NOT turn the page

    or toggle chrome — let the selection gesture complete normally.

PAGE COUNTING

  - totalPages = Math.round(contentEl.scrollWidth / viewportWidth)

  - Recompute on: mount, font-size change, line-height change, margin

    change, theme change, orientation/resize change.

  - Match existing reader UI visual style for the page-indicator — do not

    invent a new visual style.

ZERO-JUMP ANCHORING (critical correctness requirement)

  - Before ANY re-layout (font size / line-height / margin / theme /

    orientation change / Paged↔Scroll switch in either direction): capture

    the block id + character offset currently at the top-left of the visible

    page, using the SAME anchor mechanism PaginatedReader.tsx already uses

    for search/highlights. Do not build a second anchor system.

  - After re-layout completes: locate that block id's new position via

    getBoundingClientRect() in the re-flowed columns, compute its new

    pageIndex, and jump there directly with NO transition (instant, not the

    250ms animation — this is a correction, not a page turn).

  - This must work in both directions of the Paged↔Scroll toggle so

    switching modes never loses reading position.

PROGRESS PERSISTENCE

  - Save progress using the EXISTING progress mechanism/table/field already

    used by Scroll mode (block id + char offset). Do NOT add a page-number

    based progress field — page numbers are invalid the moment font size

    changes and are not a stable reference.

SCANNED / IMAGE BOOKS (Page Mode)

  - When quality.ts reports a scanned/full-page-image book, reuse PagedFlow's

    interaction shell only (tap zones, swipe, keyboard, chrome toggle) — skip

    the CSS-column engine entirely, since there's no text to reflow. Each

    "page" is one existing page-image.

═══════════════════════════════════════════════════════════

FOOTER NAVIGATION — handle carefully, do not open its file

═══════════════════════════════════════════════════════════

1. First check: is src/pages/BookReader.tsx already a full-screen route

   where Footer Navigation is not rendered? If yes, do nothing further —

   this is already solved.

2. If Footer Navigation currently DOES render on the reader page: add a

   route-based conditional ONLY at the call site where <Footer /> (or

   equivalent) is invoked in the parent layout/router file, e.g.

   `{!isReaderRoute && <Footer />}`. Never touch Footer's own component

   file, props, or styles.

═══════════════════════════════════════════════════════════

ACCEPTANCE CHECKLIST — all must pass, report each with a screenshot

═══════════════════════════════════════════════════════════

 1. Open an EPUB and a text-PDF — Paged mode is full-screen, one

    screen-width of text per page, no line is ever cut mid-line.

 2. Swipe left/right, tap left 25%, tap right 25%, tap center, arrow keys —

    all turn pages/toggle chrome correctly; selecting text does NOT turn

    the page.

 3. Change font size 14→28 mid-read — reader lands on the exact sentence

    you were reading, not just "a nearby page."

 4. Rotate device — same zero-jump landing behavior.

 5. Toggle Paged → Scrolling → Paged — reading position preserved both

    directions.

 6. Open a page ending in a short (1-line) paragraph — confirm

    orphans/widows behave reasonably; note in your report if the browser

    ignores the hint (expected sometimes, not a bug to fix).

 7. Open a scanned/image-only book — one image per page, same navigation.

 8. Confirm Scrolling mode is pixel-identical to current production

    behavior.

 9. Confirm Footer Navigation, Home, Movion, NovaChat, Groups, Profile,

    ads, upload flow, and DB/RLS show zero diffs — only the 5 listed files

    (+ Footer's call-site conditional, if that was needed) changed.

10. Final report: file-by-file summary of exactly what changed in each of

    the 5 files, whether any extra file was created and why, and the 7

    screenshots above.  
  
  
  
  
  
Isme aapki dono conditions explicitly bake ki hui hain — scope lock top pe aur "explicitly untouched" list mein — aur file-by-file report maangi hai taaki verify kar sako ki kuch aur nahi chheda gaya.   
  
  
  
  
  
  
  
  
  
  
  
Haan — **overall ye prompt kaafi strong hai aur production-level implementation ke liye almost final hai**. 👍

Lekin main ise **100% final** bolne se pehle 5 important technical problems fix karunga. Inmein se 2 especially critical hain, warna Lovable/AI implementation ke waqt reader toot sakta hai.

### 🔴 1. Sabse important: `scrollWidth / viewportWidth` page count reliable nahi hai

Aapne likha hai:

> `totalPages = Math.round(contentEl.scrollWidth / viewportWidth)`

CSS multi-column layout mein `column-gap` aur actual overflowing geometry ki wajah se ye formula **off-by-one** ho sakta hai.

Better requirement:

- `pageWidth = viewport.clientWidth`
- `step = pageWidth + columnGap`
- total pages ko actual content geometry se calculate karo
- minimum `1`
- rounding ke baad final page index ko `[0, totalPages - 1]` mein clamp karo.

Yaani AI ko blindly `scrollWidth / viewportWidth` use karne ke liye force mat karo.

---

### 🔴 2. `position: fixed; inset: 0` dangerous hai

Aapne:

```css
.viewport {
  position: fixed;
  inset: 0;
}
```

likha hai.

Ye **BookReader route ke existing header/system/chrome ke saath conflict** kar sakta hai, especially agar reader already full-screen container mein mounted hai.

Better:

> PagedFlow ko existing BookReader/PaginatedReader ke available reader viewport ke andar `width:100%; height:100%` occupy karna chahiye. `fixed/inset:0` tabhi use ho jab existing reader architecture explicitly full-screen fixed container demand kare.

Isse existing layout accidentally cover nahi hoga.

---

### 🔴 3. Zero-jump anchoring ka specification abhi theoretically strong hai, practically incomplete hai

Aapne kaha:

> `getBoundingClientRect()` se block ki new position find karo.

Problem ye hai ki **CSS columns mein same block ka bounding rect multiple columns/fragmentation mein complex ho sakta hai**.

AI ko explicitly kehna chahiye:

- existing anchor mechanism ko authoritative source rakho
- block ke DOM element ke `getClientRects()` ko consider karo
- visible page ke corresponding fragment ko identify karo
- `pageIndex = floor(relativeX / step)` type geometry calculate karo
- character offset ko preserve karo
- restoration ke waqt animation **must be disabled**
- restoration complete hone ke baad normal animation setting restore karo.

Warna "anchor restored" bolkar AI sirf block ka first rect use kar sakta hai.

---

### 🟠 4. Scanned books wala part existing architecture par depend karta hai

Aapne likha:

> each page-image = one page

Ye tabhi safe hai jab `quality.ts` already **actual page images ko individually expose/render** karti ho.

Prompt mein AI ko explicitly bolna chahiye:

> `quality.ts` ko modify mat karo. Existing scanned/page-image representation ko inspect karke reuse karo. Agar existing representation one-image-per-page nahi hai, to PagedFlow mein extraction/reconstruction logic mat banao.

Ye important hai because aapne extraction engine ko explicitly untouched rakha hai.

---

### 🟠 5. Footer requirement scope contradiction create kar rahi hai

Top par:

> **Touch ONLY the 5 files**

Lekin neeche:

> Footer call-site conditional allowed.

Isliye technically **5 files + potentially 1 existing parent layout/router file** ho sakti hain.

Isko crystal clear karo:

> **Default = exactly 5 files. A sixth file is permitted ONLY if inspection proves Footer is rendered on BookReader route. No other sixth file is permitted.**

Aur agar Footer already nahi hai → **zero sixth-file changes**.

---

# ✅ Ek aur important correction

Aapke goal mein:

> **"Google Play Books-style"**

likha hai.

Ye UI/interaction inspiration ke liye theek hai, lekin implementation ko **Google Play Books ka exact clone** mat banwana. Aapka actual technical goal already clear hai:

**horizontal paginated reflowable reader + stable anchors + swipe + page controls.**

Ye wording better aur safer hai.

---

# 🟢 Final verdict

**Concept:** ✅ Excellent  
**Scope control:** ✅ Very strong  
**Additive architecture:** ✅ Correct  
**Scroll fallback:** ✅ Correct  
**Existing progress reuse:** ✅ Correct  
**No DB/RLS changes:** ✅ Correct  
**No duplicate anchor system:** ✅ Excellent  
**Scanned books:** 🟠 Needs one clarification  
**Page counting:** 🔴 Needs correction  
**Fixed viewport:** 🔴 Needs correction  
**Anchor geometry:** 🔴 Needs more precise implementation rule  
**Footer scope:** 🟠 Needs clarification

