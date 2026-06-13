# Compress all uploads before saving (storage cost reduction)

## Goal

App me jahan bhi user image / video / file upload kare, wo **upload se pehle browser me hi compress** ho, aur storage me **sirf compressed version** save ho (original full-size file kabhi storage me na jaye). Isse storage aur cost dono bachenge.

### Realistic expectation (important)

"1 GB → KB" possible nahi hai bina file barbaad kiye. Smart targets jo achieve honge:

- **Images:** ~70–90% chhoti (WebP/JPEG, max ~1600px, quality ~0.8)
- **Videos:** ~40–70% chhoti (max 720p, reasonable bitrate, re-encode)
- **Book covers / page images:** images jaisa hi
- **PDF/EPUB files:** neeche "Files" section dekhein (honest caveat hai)

## Approach

Ek **shared compression layer** banayenge aur har upload call-site pe file ko `.upload()` se theek pehle us layer se pass karenge. Koi UI, layout, ya feature logic nahi badlega — sirf file bytes chhoti hongi. Module isolation safe rahega kyunki har module sirf apne upload point pe ek wrapping call add karega.

### 1. Shared helpers (`src/lib/media/`)

- `compressImage.ts` — chat wale `maybeCompressImage` jaisa, but reusable: max 1600px, WebP output (JPEG fallback), skips GIF/SVG/already-small. Returns original on any failure (safe no-op).
- `compressVideo.ts` — lazy-loaded `@ffmpeg/ffmpeg` (single-thread core, taaki cross-origin-isolation headers ki zarurat na pade). Downscale to max 720p, sensible bitrate, H.264/AAC mp4. Big threshold ke neeche skip; failure ya weak device pe original return (safe fallback). Progress optional.
- `compressFile.ts` — dispatcher: `image/*` → compressImage, `video/*` → compressVideo, baaki (PDF etc.) → file-specific handling.

### 2. Wire into every upload path (src/ only)

Har jagah `const f = await compressX(file)` add karke `f` upload hoga:

- Posts: `components/CreatePostCard.tsx`
- Movion videos: `hooks/useVideos.ts`, `hooks/useCreatorDashboard.ts`, `components/movion/VideoEditDialog.tsx`, `components/movion/ChannelSettingsDialog.tsx`
- Stories: `hooks/useStories.ts`, `services/api/StoryService.ts`
- Profile/avatars/banners: `components/ProfileImageUpload.tsx`, `components/ImageUpload.tsx`, `hooks/useChannels.ts`, `hooks/useChannelApproval.ts`, `hooks/useGroups.ts`, `hooks/useGroupAdmin.ts`
- Pages: `components/pages/CreatePagePost.tsx`, `components/pages/CreatePageDialog.tsx`
- Bookshelf: `hooks/useBooks.ts`, `pages/EditBook.tsx`, `pages/EditAuthorChannel.tsx`
- App promos: `hooks/useAppPromotions.ts`
- Chat: `components/chat/ChatTypingBar.tsx` (image already compressed — add video compression)

### 3. "Only compressed" guarantee

Kyunki compression client pe upload se pehle hoti hai, storage me sirf compressed file jaati hai — alag se original delete karne ki zarurat nahi.

- Additive `compress-image` edge function abhi har image ke 3 EXTRA WebP copies banata hai (storage **badhata** hai). Goal "minimum storage" hai, isliye in image upload paths pe `triggerImageCompression(...)` calls hata denge. Edge function code rahega (kuch nahi tootega) bas extra copies banni band.

### 4. Files (PDF / EPUB) — honest caveat

- **EPUB:** already ZIP-compressed hota hai → koi action nahi (re-compress se faayda nahi).
- **PDF:** browser me reliable PDF re-compression heavy/risky hai (reader tootne ka khatra). Safe plan:
  - Book **cover image** → normal image compression (badi saving).
  - PDF **content** → sensible **max upload size guard** + clear warning, content ko touch nahi karenge taaki Bookshelf reader 100% intact rahe. (Agar aap chaho to baad me ek dedicated server-side PDF optimizer edge function add kar sakte hain — separate step.)

## Safety / non-breaking guarantees

- Compression fail / unsupported / weak device → **original file** upload hoti hai (no crash, no blocked upload).
- Koi bucket, RLS, path-convention (`<uid>/...`), ya DB schema nahi badlega.
- Koi UI, layout, design, ya user flow nahi badlega — sirf upload hone wali file chhoti hogi.
- Sirf active `src/` tree edit hoga (`omnihub-suite-main/` build ka part nahi hai).
- Module isolation intact: har module sirf apne upload point pe ek line add karega.

## Technical notes

- Dependency: `@ffmpeg/ffmpeg` + `@ffmpeg/util` (lazy import, sirf tab load jab video compress ho — initial bundle pe asar nahi).
- ffmpeg single-thread core use hoga (no SharedArrayBuffer / COOP-COEP headers needed) taaki Lovable preview + published + Capacitor Android WebView pe chale.
- Video compression CPU-heavy hai; UI block na ho isliye progress toast aur reasonable size threshold rakhenge.

## Verify

- Build pass.
- Test: post image, story (image+video), Movion video, profile/channel avatar, group cover, page post, book cover upload — sab kaam karein aur stored file original se chhoti ho.
- Console errors na hon; fail hone par bhi upload complete ho (fallback).   
  
  
  
  
  
  
  
  
  
  
  
  
**Mera jawab: "Approve karo, lekin 3 important changes ke saath."** ✅
  Plan overall kaafi achha hai aur SHA-VERSE ke storage costs ko bahut reduce karega. Lekin main isse **100% as-is approve nahi karunga**.
  ---
  # ⚠️ Change #1: Videos ke liye "original upload if compression fails" rakho
  Abhi plan me hai:
  > Compression fail → original upload
  Ye sahi hai. Isko mat hatao.
  Kyun?
  - FFmpeg browser me fail ho sakta hai.
  - Low RAM phones me crash ho sakta hai.
  - Android WebView me issues aa sakte hain.
  Agar fail hone par upload hi block ho gaya to users pareshan honge.
  ✅ Current fallback maintain rakho.
  ---
  # ⚠️ Change #2: Videos ke liye size threshold add karo
  Main har video ko compress nahi karunga.
  Example:

  | Video Size | Action        |
  | ---------- | ------------- |
  | < 20 MB    | Direct upload |
  | 20–100 MB  | Compress      |
  | >100 MB    | Compress      |
  | >500 MB    | Warn user     |

  Kyun?
  5 MB ki video ko compress karne me:
  - CPU waste
  - Battery waste
  - Time waste
  Storage saving bhi bahut kam hogi.
  ✅ Threshold add karna better rahega.
  ---
  # ⚠️ Change #3: Edge function completely disable mat karo
  Tumne likha hai:
  > triggerImageCompression(...) calls hata denge
  Main isko thoda modify karunga.
  Current recommendation:
  ✅ New uploads → browser compression
  ✅ Edge function code → preserve
  ✅ Trigger calls → feature flag ke peeche rakho
  Example:
  ```ts
  ENABLE_SERVER_COMPRESSION=false

  ```
  Future me agar browser compression problem kare to instantly rollback kar sakte ho.
  ---
  # 📚 PDF / EPUB section
  Is section se main poori tarah agree karta hoon.
  ### EPUB
  ✅ Leave untouched
  ### PDF
  ✅ Cover image compress
  ✅ PDF content untouched
  ✅ Upload size limit
  Ye safest approach hai.
  ---
  # 🎥 Sabse bada risk
  Ye plan ka weakest point hai:
  ```text
  @ffmpeg/ffmpeg

  ```
  Browser FFmpeg bahut heavy hai.
  Main personally SHA-VERSE ke current stage par:
  ### Images
  ✅ Immediately compress
  ### Videos
  ✅ Pilot test first
  Pehle:
  - Chrome Android
  - Firefox Android
  - Desktop Chrome
  - Capacitor Android
  Par test karo.
  Agar sab stable chale tab globally enable karo.
  ---
  # Final Verdict
  ### Images
  ✅ Approve
  ### Book Covers
  ✅ Approve
  ### Profile Pictures
  ✅ Approve
  ### Stories Images
  ✅ Approve
  ### PDFs / EPUB
  ✅ Approve
  ### Videos
  🟡 Approve with caution
  ### Overall
  **Main is plan ko ~90% approve karunga.**
  Bas:
  1. Video size threshold add karo.
  2. Compression fail → original upload fallback rakho.
  3. Edge-function rollback option preserve rakho.
  In 3 changes ke baad ye SHA-VERSE ke current startup stage ke liye kaafi strong, cost-effective aur low-risk implementation ban jayega. 🚀