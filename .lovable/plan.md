# Bookshelf Reader — Text Reflow Quality Fix (A to Z)

## Pehle: aapke project me engine already maujood hai

Jo architecture Google AI Studio ne describe kiya (semantic DOM, `<article>`/`<p>`, inline fontSize/lineHeight, no canvas zoom) — SHA-VERSE me wo **already implemented** hai:

- `src/components/bookshelf/reader/ReflowReader.tsx` — real HTML `<p>`/`<h2>` render karta hai, `fontSize`, `lineHeight`, `margin` inline styles se apply hote hain. Koi `transform: scale`, canvas zoom ya iframe zoom nahi hai.
- `src/pages/BookReader.tsx` — PDF ke liye default `viewMode = "reader"` hai; "Original PDF" sirf fallback hai.

Matlab problem "reflow nahi ho raha" nahi hai. Problem **extracted text ki quality** aur **virtualizer re-measure** me hai — isi wajah se font badhane par text toota hua / ajeeb dikhta hai.

Google AI Studio wale project me content pehle se clean paragraph array (`chapter.content: string[]`) ke roop me maujood tha, isliye wahan sab perfect dikhta hai. Yahan wo array PDF se runtime par banana padta hai — asli kaam wahi hai.

## Root cause (jo code me dikha, confirm karna step 1 me hai)

`src/lib/reader/extract.ts` me PDF lines ko paragraphs me jodne ke break conditions bahut aggressive hain:

```text
bigGap || sizeShift || indentStart || sentenceBreak || bulletStart  → naya paragraph
```

- `sentenceBreak`: koi bhi line jo `.` par khatam ho aur thodi choti ho → naya paragraph. Normal books me har doosri line par ye trigger hota hai.
- `sizeShift`: superscript/footnote marker se font size badle to break.
- `indentStart`: justified text me natural x-shift se break.
- Page badalne par paragraph continue nahi hota (har page ka apna block set).
- Hyphenation rejoin (`exam-\nple` → `example`) verify karna hoga.

Result: ek paragraph 5–8 tukdon me tut jata hai; font badhane par har tukda alag block ki tarah reflow hota hai — isliye "toota hua" lagta hai.

Doosra issue: `ReflowReader` me `contain: strict` + dynamic-measure virtualizer. Font size change par sirf `virtualizer.measure()` call hota hai; purani heights turant invalidate na hone se ek frame ke liye overlap/jump dikh sakta hai.

## Kya karenge (step by step)

### Step 1 — Diagnose (koi guess nahi)
Ek real uploaded PDF par extraction chala kar dump lenge: kitne paragraph blocks bane, average block length kya hai. Agar average block ~1 line ke barabar hai to fragmentation confirm.

### Step 2 — Paragraph reconstruction engine rewrite (main fix)
`src/lib/reader/extract.ts` me line→paragraph logic ko score-based banayenge:

- **Continuation-first rule**: agar previous line column ke right edge tak (≥ 88% width) gayi hai → wo line **kabhi** paragraph end nahi hai, chahe `.` par khatam ho.
- Break sirf tab jab: previous line clearly short ho **aur** (agli line indent ho **ya** gap > 1.4× line-height), ya heading detect ho, ya bullet/number start ho.
- `sizeShift` threshold badhayenge aur inline superscripts ko ignore karenge.
- **Hyphenation rejoin**: `-` par khatam hone wali line ko bina space ke join.
- **Cross-page continuation**: agar page ka aakhri paragraph incomplete hai aur agle page ki pehli line body-size + non-indent hai → dono merge.
- Header/footer removal ko repetition-based karenge (ek hi text jo 3+ pages par same position par aaye).

### Step 3 — Renderer polish (Play Books feel)
`ReflowReader.tsx` me:
- Font/line-height/margin change par purani measurements properly reset + anchor block par exact scroll restore (abhi sirf `align: "start"` par jump hota hai).
- `text-wrap: pretty`, `hyphens` language-aware, `text-rendering: optimizeLegibility`, `-webkit-font-smoothing`, orphan/widow control.
- Reading width aur paragraph spacing font-size ke saath proportional (already partly hai, tune karenge).

### Step 4 — Cache version bump
`REFLOW_MODEL_VERSION` badhayenge (3 → 4) taki purane IndexedDB me cached toote hue books auto re-extract ho jayein. Warna user ko purana kharab output hi dikhta rahega.

### Step 5 — Verify
Preview me ek PDF khol kar font size 14 → 28 tak badhayenge aur screenshot se confirm karenge ki paragraphs ek unit ki tarah reflow ho rahe hain, koi overlap/jump nahi.

## Technical details

Files touched (Bookshelf reader ke bahar kuch nahi):

```text
src/lib/reader/extract.ts                              (paragraph engine rewrite)
src/lib/reader/types.ts                                (REFLOW_MODEL_VERSION bump)
src/components/bookshelf/reader/ReflowReader.tsx       (measure/anchor + typography polish)
```

Not touched: upload flow, DB/RLS, PDFViewer (Original mode), Home, Movion, NovaChat, Groups, Profile, ads.

## Aapko manually kya karna hoga

1. Fix ke baad app kholiye → koi bhi PDF book → **Start Reading**.
2. Pehli baar book thodi der "Preparing…" dikhayegi (re-extraction, cache version bump ki wajah se) — ye sirf ek baar per book hota hai.
3. Font size / style / theme change kar ke check kijiye.
4. Agar kisi khaas PDF me abhi bhi text toote to us book ka naam bataiyega — us layout ke liye targeted tuning karenge (two-column, poetry, Urdu/Arabic RTL alag heuristics maangte hain).
