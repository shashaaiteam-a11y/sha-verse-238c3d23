# Bookshelf Reader — Rendering Pipeline & Regression Checklist

_Scope: `src/lib/reader/*` and `src/components/bookshelf/reader/*` only. No other module,
route, service, hook, RLS policy or edge function participates in this pipeline._

## Adaptive rendering pipeline

```text
Open book
   │
   ▼
extractReflowBook()  (src/lib/reader/extract.ts, page by page)
   │
   ├── build visual lines from the PDF text layer
   ├── strip running headers / footers / folios
   │
   ▼
assessPageText()  (src/lib/reader/quality.ts)   ← the routing decision
   │
   ├── reason "ok"            → Reflow Mode
   │        strip Gutenberg / distributor boilerplate
   │        strip residual glyph soup
   │        lines → semantic blocks (heading / paragraph / list / table / image)
   │
   └── unusable               → Page Mode
            reason "empty"          scanned page  → OCR (only if it passes the
                                                    same quality gate), else image
            reason "glyph-damage"   broken CID font (PUA / U+FFFD)  → image
            reason "broken-script"  Devanagari with dropped matras  → image
            reason "ocr-noise"      >=50% garbage lines             → image
   │
   ▼
PaginatedReader.tsx
   ├── cover section    → title card
   ├── content section  → CSS multi-column pagination (real text reflow)
   └── page section     → PageImage: fit-to-viewport, aspect preserved,
                          ctrl/⌘+wheel + double-tap zoom, drag to pan
```

`REFLOW_MODEL_VERSION` (src/lib/reader/types.ts) invalidates the IndexedDB cache.
**Bump it whenever extraction output changes**, otherwise readers keep old blocks.

## Safety nets at render time

`PaginatedReader` re-sanitises every cached block before display:
`normalizeReaderText` → `isHiddenMetadata` → `isBoilerplate` → `isGarbageLine`.
Books extracted by an older version therefore also render clean.

## Regression checklist

Text & language
- [ ] English text PDF — clean paragraphs, no `i = HE EE` glyph soup
- [ ] Project Gutenberg book — licence header/footer never rendered
- [ ] Hindi PDF with embedded fonts — matras intact, reflowed
- [ ] Hindi PDF with broken fonts — falls back to Page Mode (no boxes)
- [ ] Urdu / Arabic — RTL direction correct
- [ ] CJK — no spurious spaces between glyphs
- [ ] Mixed-language paragraph — no direction flip mid-paragraph

Pages & images
- [ ] Scanned PDF — every page fitted, never cropped or stretched
- [ ] Page Mode zoom: ctrl/⌘+wheel, double tap, drag-to-pan, reset on flip
- [ ] Inline illustrations inside text never overflow their column
- [ ] Cover page renders as the first page

Navigation & state
- [ ] Tap left 28% / right 28% flips; centre toggles controls (3s auto-hide)
- [ ] Swipe left/right flips; suppressed while a page is zoomed
- [ ] Chapter/TOC jump, search jump and bookmark jump land on the right page
- [ ] Reading progress restores after reopening the book
- [ ] Footer page number + percent stay monotonic while flipping

Typography
- [ ] Font size / line height / margin / paragraph spacing / justify re-paginate
- [ ] Theme switch (light / sepia / dark / black) keeps position
- [ ] Table, blockquote and small-print blocks render inside the page

Non-regression (must be untouched)
- [ ] Bookshelf Library, Discover, Upload, Edit, Delete, Share
- [ ] Auth, profile, groups, videos, NovaChat, home feed, navigation, theme
