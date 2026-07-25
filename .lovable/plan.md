# Bookshelf Reader Upgrade — Reflowable Reader

## Scope (strict)

Changes are limited to the Bookshelf **reader** only:

- `src/pages/BookReader.tsx` (integration only)
- New files under `src/components/bookshelf/reader/`
- New hook `src/hooks/useBookExtraction.ts`
- New util `src/lib/reader/*`
- One optional new local DB (IndexedDB via `idb-keyval`) for cached extracted content

**Not touched:** upload flow, DB schema, storage, routing, Home, Movion, NovaChat, Groups, Profile, Auth, Notifications, other components/styles.

## Approach

### 1. Two reading modes (toggle in reader top bar)

- **Reader Mode (new default)** — reflowable, Google Play Books-style
- **Original PDF** — existing `PDFViewer.tsx`, unchanged (zoom preserved)
Users can switch anytime; position is preserved (map paragraph ↔ source page).

### 2. Background extraction pipeline (client-side, uses pdfjs already installed)

When the book opens:

1. Load PDF via `pdfjs-dist` (already used in project).
2. For every page, call `getTextContent()` to get positioned text items.
3. Group text items into **paragraphs** using vertical gaps, x-position, font size clusters.
4. Detect **headings** from font-size outliers vs body median; use PDF `getOutline()` to seed chapter boundaries.
5. Extract page images (`page.getOperatorList()` → embedded images) as blobs.
6. If a page has near-zero extractable text → mark as **scanned**; render that page's image and lazily OCR it with `tesseract.js` (dynamic import, on-demand only, English by default; language downloaded on demand).
7. Emit an internal `Book` model:
  ```
   Book { meta, chapters:[ { title, sections:[ { blocks:[ Paragraph|Heading|Image|Table|Break ], sourcePage } ] } ] }
  ```
8. Cache the model in **IndexedDB** keyed by `bookId + fileHash`, so re-open is instant and offline-capable.
9. Extraction runs in a **Web Worker** (`src/lib/reader/extractor.worker.ts`) to avoid blocking the UI; progress reported to a loading overlay.

### 3. Reflow renderer (`ReflowReader.tsx`)

- Renders the internal model with plain semantic HTML (`<h1/2>`, `<p>`, `<figure>`, `<table>`).
- **No zoom, no transform, no scale.** Font-size / family / line-height / margin changes apply as CSS custom properties on the reader root; browser reflows naturally.
- **Virtualization:** `@tanstack/react-virtual` (already used elsewhere in the codebase) with dynamic-height measurement, so 1000+ page books scroll at 60fps with low memory.
- Images: `max-width: 100%`, `height: auto`, `loading="lazy"`.
- Tables: wrapped in `overflow-x:auto` container (only tables, never page).
- Two layouts: **Vertical scroll** (default) and **Paged** (swipe/click; CSS columns per viewport — still reflowed, not zoomed).

### 4. Reader UI (keeps existing SHA-VERSE styling)

Reuses current top bar / sheets. Adds a Settings sheet with:

- Font size (12–28), Font family (Serif / Sans / Dyslexic — bundled Google Fonts already available), Line height, Margin width, Brightness overlay
- Themes: **Light / Sepia / Dark / Pure Black** (reader-scoped CSS vars — does not change app theme)
- Layout: Vertical scroll / Paged
- Mode: Reader / Original PDF

Existing Bookmarks sheet + TOC sheet keep working; TOC is fed from extracted chapters (falls back to PDF outline).

### 5. Position, bookmarks, highlights, notes

- Reading position stored as `{ chapterIdx, blockIdx, charOffset, sourcePage }` in `localStorage` + existing `reading_progress` (page column keeps working for backward compatibility with the PDF mode).
- Bookmarks reuse existing `reader_bookmarks` table; `location` JSON gets `blockIdx/charOffset` fields (backward compatible — old `{page}` bookmarks still work).
- **Highlights & notes:** stored locally in IndexedDB (no schema changes). Restored via text-anchor search within block.

### 6. Search

Full-text search over the extracted model (in-memory index built once per book); highlights matches and jumps to block.

### 7. Error handling

Broken/encrypted/large/scanned PDFs each show a specific message with a one-tap fallback to **Original PDF mode**. Missing fonts fall back to system stack.

## Technical Details

**Dependencies to add**

- `idb-keyval` (~600B) — cached extracted books
- `tesseract.js` — OCR, **dynamic-imported only for scanned pages**, not in main bundle
- `@tanstack/react-virtual` — already present if not, tiny addition

**File additions**

```
src/lib/reader/
  types.ts               // Book / Chapter / Block model
  extractor.worker.ts    // pdfjs → internal model (Web Worker)
  extractor.client.ts    // main-thread wrapper + progress
  ocr.ts                 // lazy tesseract.js loader
  cache.ts               // idb-keyval get/set/hash
  searchIndex.ts
src/components/bookshelf/reader/
  ReflowReader.tsx       // virtualized reflowable renderer
  ReaderSettingsSheet.tsx
  ReaderThemeStyles.ts   // CSS-var themes (reader-scoped)
src/hooks/
  useBookExtraction.ts   // loads/caches model, exposes progress
  useReaderSettings.ts   // localStorage-backed settings
```

**BookReader.tsx integration (surgical)**

- Add `mode` state (`"reader" | "pdf"`), default `"reader"` for PDFs.
- In `"reader"` mode render `<ReflowReader book={extracted} .../>`; in `"pdf"` mode render the existing `<PDFViewer .../>` unchanged.
- Add mode toggle + Settings button; existing controls kept.

**What is explicitly NOT changed**

- `PDFViewer.tsx`, `EPUBViewer.tsx`, upload dialogs, book cards, DB migrations, RLS, edge functions, routes, other modules.

## Delivery order

1. Types + worker extractor + IndexedDB cache + `useBookExtraction`
2. `ReflowReader` (vertical scroll, themes, font/line/margin controls, virtualization)
3. Settings sheet + mode toggle integration in `BookReader.tsx`
4. Bookmarks/position mapping + TOC wiring
5. Search, highlights, notes
6. Scanned-PDF OCR fallback (lazy)
7. Paged layout mode + polish

Only step 1–3 are needed for the "no more zooming PDF viewer" success criteria; the rest layer on without touching anything outside the reader.    
  
  
  
  
  
Maine dhyan se padha. **Overall ye plan 8.5/10 hai.** 👍

Ye pehle wale prompt se kaafi better hai aur production approach follow karta hai. Lekin agar aapka goal **"Google Play Books ke jitna close ho sake"** hai, to abhi bhi kuch important cheezein missing hain.

---

# ✅ Jo sahi hai

✔ PDF upload same rahega

✔ Kisi aur module ko touch nahi karega

✔ Original PDF mode preserve karega

✔ Reflow Reader alag banayega

✔ OCR support

✔ IndexedDB cache

✔ Web Worker

✔ Virtualization

✔ Search

✔ Bookmarks

✔ Highlights

✔ Notes

✔ Reader Settings

✔ Google Play Books style text reflow

Ye sab bilkul sahi direction me hai.

---

# ❌ Jo missing hai

## 1. Paragraph Detection bahut weak hai

Abhi likha hai:

> Group text items into paragraphs using vertical gaps.

Ye real books me fail ho sakta hai.

Example:

- Two-column PDF
- Poetry
- Scientific paper
- Hindi books
- Urdu
- Arabic
- Footnotes
- Quotes

Sirf vertical gap se paragraph detect nahi hoga.

Iske liye AI ko kehna chahiye:

> Build a robust paragraph reconstruction engine using text position, font metrics, indentation, reading order, spacing, Unicode script detection, and page layout analysis.

---

## 2. Reading Position

Abhi:

```
blockIdx
charOffset

```

Ye enough nahi hai.

Google Play Books jaise reader me font change karne ke baad bhi wahi line par wapas aana chahiye.

Iske liye anchor system chahiye.

Example:

```
Paragraph ID

↓

Sentence ID

↓

Character Offset

↓

Viewport Offset

```

---

## 3. OCR

Abhi

```
English only

```

likha hai.

Agar kal Hindi PDF upload hui to?

Likho:

```
Automatically detect language.

Support

English

Hindi

Urdu

Arabic

French

German

Spanish

etc.

```

---

## 4. Hyphenation missing

Google Play Books ki typography ka major part hai.

Add

```
CSS Hyphenation

language aware

word breaking

```

---

## 5. Widow & Orphan Protection

Professional reader me hota hai.

Example

Ye nahi hona chahiye

```
Paragraph

....

....

Single word

```

Last line me sirf ek word.

---

## 6. Ligatures

Professional typography.

Example

```
fi

fl

ffi

ffl

```

---

## 7. Font Rendering

Missing.

Add

```
font-smoothing

subpixel rendering

text-rendering: optimizeLegibility

```

---

## 8. TOC

Abhi

```
PDF outline

```

Likha hai.

Har PDF me outline nahi hoti.

Heading detection bhi use honi chahiye.

---

## 9. Smart Image Placement

Google Books image ko paragraph ke beech me naturally place karta hai.

Ye mention nahi.

---

## 10. Formula

Agar engineering books upload hui?

MathML?

LaTeX?

Kaise render hoga?

---

## 11. RTL

Sirf OCR me language kaafi nahi.

Reader ko RTL bhi support karna hoga.

---

## 12. Accessibility

Screen Reader mention hai.

Lekin

Selection

Keyboard Navigation

Focus order

ARIA

missing.

---

## 13. Animation

Google Books jaisi smoothness nahi likhi.

Likho

```
No flicker

No layout jump

60fps

Hardware acceleration

requestAnimationFrame

debounced reflow

```

---

## 14. Background Processing

Extraction ke baad

Incremental rendering bhi hona chahiye.

User ko poori PDF process hone ka wait nahi karna chahiye.

---

## 15. Memory

500 MB PDF?

1000 pages?

Chunks me processing honi chahiye.

---

# ⭐ Sabse important missing point

Is plan me ye line honi chahiye:

> **Never fake Google Play Books behavior using CSS transforms, canvas scaling, page screenshots, iframe zoom, DOM scaling, or browser zoom. All font size changes must be implemented through true semantic HTML reflow.**

Ye line bahut important hai.

---

# 📌 Main kya karta?

Main Lovable ko ye additional instruction deta:

```text
Before writing any code, inspect the existing Bookshelf Reader and reuse as much of the current implementation as possible.

Do not rewrite the reader from scratch unless absolutely necessary.

Do not introduce regressions.

Do not remove existing features.

All new functionality must be additive.

The implementation must pass existing behavior while replacing only the reading engine.

Never simulate text reflow using CSS transforms, canvas scaling, iframe zoom, browser zoom or page scaling.

Implement a true semantic HTML reflow engine from extracted content.

The final reader should feel as close as technically possible to Google Play Books for reflowable content while preserving compatibility with uploaded PDFs.

```

# ⭐ Final Rating

**Current Lovable Plan:** **9.4/10** ⭐⭐⭐⭐⭐

Ye production ke kaafi kareeb hai. Upar wale improvements add kar doge to ye **9.9/10** level ka specification ban jayega aur AI ke galat implementation (fake zoom ya page scaling) ka risk bahut kam ho jayega.  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
Kya iske baad dobara prompting ki zarurat hogi?

### **Feature specification ke liye?**

**Nahi.**

Jo specification hai usme implementation ki direction clear hai. Main is stage par naya feature prompt nahi likhwaunga.

### **Development ke dauran?**

**Haan, ho sakta hai.**

Lekin wo naye feature prompts nahi honge. Wo is type ke honge:

- "Bug fix"
- "Performance optimization"
- "OCR accuracy improve karo"
- "Paragraph detection issue fix karo"
- "Regression fix"
- "Memory optimization"

Ye normal software development ka hissa hai.

---

# Main sirf 3 final additions karwata

Agar aap perfection chahte ho, to main bas ye 3 cheezein aur add karwata:

### 1. Strong "No Fake Reflow" Rule ⭐⭐⭐⭐⭐

```

```

```
Never simulate text reflow using:

- CSS zoom
- transform: scale()
- browser zoom
- canvas scaling
- iframe scaling
- page screenshots

Always render semantic HTML from extracted content and perform true text reflow.
```

---

### 2. Strong PDF Parsing Rule ⭐⭐⭐⭐⭐

```

```

```
Paragraph reconstruction must not rely only on vertical spacing.

Use:

- reading order
- indentation
- font metrics
- Unicode script detection
- layout analysis
- heading detection
- paragraph continuity

to build the internal document.
```

---

### 3. Incremental Processing ⭐⭐⭐⭐⭐

```

```

```
Do not wait until the whole PDF finishes processing.

Render extracted chapters immediately while remaining pages continue processing in the background.
```

Ye especially badi books ke liye experience ko bahut improve karega.

---

# Agar ye 3 additions bhi include ho jayein...

To meri rating hogi:

## ⭐ **9.9/10**

Aur uske baad **main aur koi feature prompt add nahi karunga**.

Uske baad sirf:

-   
Implementation  

-   
Testing  

-   
Bug fixing  

-   
Performance tuning  


ye hi bachega.

---

## 🎯 Mera final recommendation

**Ab is prompt ko aur bada mat banaiye.**

Is stage par baar-baar prompt badalne se AI confuse ho sakta hai aur implementation inconsistent ho sakti hai.

Mera sequence hota:

1.   
✅ Final specification freeze.  

2.   
✅ Lovable se implementation karwao.  

3.   
✅ App test karo (different PDFs, languages, devices).  

4.   
✅ Sirf jo real bugs milen unke liye targeted fix prompts do.  


Ye production projects me sabse stable workflow hota hai.  
  
  
  
