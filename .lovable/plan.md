
# SHA-VERSE — Slowness + Compression + Issues/Warnings: poori jaankari aur fix plan

Maine teeno cheezein deeply analyze ki (slow queries, compression code, upload paths, console logs, DB indexes, security linter). Neeche **kyun ho raha hai** + **kya fix karunga** dono hai. Koi UI/design/feature flow nahi todunga — sirf wahi badlega jo aapne maanga (speed, compression, issues).

---

## 1) APP + WEB SLOW HAI (load + data fetch + module switch slow)

### Asli wajah (root causes)
1. **Database me kuch zaroori INDEX missing hain** → kuch queries har baar poori table scan kar rahi hain:
   - `notifications` (user_id + created_at par koi index nahi) → **total ~322 sec**, ek call 7.8 sec tak gayi.
   - `group_posts` (group_id + created_at par koi index nahi) → feed/group load slow.
   - `groups` list query har group ke liye **nested `group_posts(count)`** LATERAL count karti hai → **total ~456 sec**, ek call 6.8 sec tak. Ye sabse bada offender hai.
2. **Console log spam (Android WebView ko zyada hurt karta hai):** ad components (`BannerAd`, `NativeAdCard`) har render par JSON log print kar rahe hain — ek hi second me dozens. Ads abhi hidden hain (`ADS_HIDDEN=true`) fir bhi ye log + re-render chal rahe hain. Ye CPU waste karta hai aur app laggy feel hoti hai.
3. **React Query cache short hai** → har baar module switch par data dobara fetch hota hai (cache reuse nahi), isliye "ek module se dusre module" jaana slow lagta hai.
4. **High-frequency writes** (ad_impressions 30k+ inserts, presence heartbeat, book progress) backend par load badhate hain — ye secondary hai, indexes/logs ke baad dekhenge.

### Kya fix karunga
- **Naye indexes add karunga** (DB migration, additive — kuch nahi tootega):
  - `notifications (user_id, created_at DESC)`
  - `group_posts (group_id, created_at DESC)`
  - `groups (members_count DESC)`
- **Groups list query optimize:** jo `group_posts(count)` embed sirf load slow kar raha hai usko hatakar `posts_count` column (jo already table me hai) use karunga — same number dikhega, query ~10x faster.
- **Ad components ke debug `console.log` hata/gate karunga** (sirf logging, ad logic untouched) → renders halke honge, Android app smooth.
- **React Query `staleTime` thoda badhaunga** (feeds/lists ke liye) → module switch par instant cached data, background me refresh. UI same.

Iske baad list/feed/notifications/groups load aur module switching **clearly fast** ho jayega.

---

## 2) COMPRESSION KAAM NAHI KAR RAHA + LOADING % GAYAB

### Asli wajah
- **Images:** code images ko compress karta hai (WebP/JPEG, max 1600px) **lekin sirf jab file > 150KB ho aur result chhota ho**. Problem ye hai ki **koi visible feedback nahi**, aur Android WebView me kabhi-kabhi WebP encode skip ho jaata hai — isliye laga ki "kuch nahi hua".
- **Videos (ye main problem hai):** video compression `ffmpeg` ko **internet se unpkg CDN (~30MB)** se download karta hai. Android app (jo local/offline mode me chalti hai) ya slow network par **ye download fail ho jaata hai → code safe fallback me ORIGINAL video upload kar deta hai** → isliye video "utne hi MB" me chadhti hai. Phone par single-thread ffmpeg bahut slow/OOM bhi ho sakta hai → wahi fallback.
- **Loading % gayab:** pehle jo percent dikhta tha wo **XHR upload progress** tha (abhi sirf Groups me bacha hai). Posts/Stories/Chat ab `supabase.storage.upload` use karte hain jo **progress event deta hi nahi**, aur compression bhi bina percent ke block karta hai → isliye "percent show nahi ho raha".

### Kya fix karunga
- **ffmpeg core ko app ke andar bundle (self-host) karunga** (`/public` me), CDN ki jagah — taaki Android app + offline + slow net par video compression **reliably chale**, original-size upload band ho.
- **Ek shared `uploadWithProgress` helper banaunga** (XHR-based, jaisa Groups me already hai) aur Posts/Stories/Chat/Books me wire karunga, taaki **real upload % wapas dikhe**.
- **Visible progress UI** (compression % + upload %) wapas laaunga upload ke dauran.
- **Image compression ko zyada robust + verifiable** banaunga: result size console me confirm, WebP fail ho to JPEG, aur thoda aggressive (taaki MB → KB clearly dikhe). Fallback safe rahega (fail ho to original, upload kabhi block nahi).
- Threshold safety (memory rule) maintain: bahut chhoti images/videos as-is, bade files compress + warning.

> Note: "1GB → KB" possible nahi (file kharab ho jayegi). Realistic: images ~70–90% chhoti, videos ~40–70% chhoti.

---

## 3) APP ME ISSUES / WARNINGS / CRITICAL ERRORS — kya fix, kya ignore

### Database linter: 51 warnings, **0 critical errors**
- Saari 51 warnings ek hi type ki hain: **"SECURITY DEFINER function executable by anon/authenticated"** (codes 0028/0029).
  - **Ye critical NAHI hai.** Inme se zyada tar aapke helper functions hain (`has_role`, increment counters, presence-safe, etc.) jinko app ko call karna hi padta hai — **ye by-design hain, ignore karna theek hai.**
  - **Fix sirf wahan zaroori jahan koi sensitive definer function bina-login (anon) call ho sakta ho** — un specific functions par `EXECUTE` revoke karke `authenticated`-only kar dunga (already pichhle security task me kuch ho chuka hai). Baaki ko `@security-memory` me document kar dunga taaki future scan inhe dobara flag na kare.
- **Security scanner (agent/connector/supabase): abhi koi open finding nahi** — clean.

### Console (runtime)
- Sirf **ad debug logs** ka spam hai (upar #1 me fix ho raha). Koi runtime crash/critical error nahi mila.

### Verdict
- **Fix karna zaroori:** missing indexes, groups query, ad log spam, compression+progress, sensitive anon-callable definer functions (agar koi).
- **Ignore safe:** baaki SECURITY DEFINER warnings (helper functions) — document kar denge.

---

## Technical changes (summary)
1. **New migration:** indexes on `notifications`, `group_posts`, `groups`; revoke EXECUTE on any truly-sensitive anon-callable definer fn.
2. `src/hooks/useGroups.ts` (+ Groups service): drop nested `group_posts(count)` embed, use `posts_count` column.
3. `src/lib/ads/*` components: remove/gate per-render `console.log` (logic untouched).
4. React Query `staleTime`/`gcTime` tuning for feed/list hooks.
5. `public/ffmpeg/*`: self-hosted ffmpeg core; `src/lib/media/compressVideo.ts` points to local core; lower load-failure rate.
6. New `src/lib/media/uploadWithProgress.ts` (shared XHR uploader) + wire into Posts/Stories/Chat/Books upload paths; surface % in existing upload UIs.
7. `src/lib/media/compressImage.ts`: more robust/verifiable, keep safe fallback.
8. Update `@security-memory` to reflect accepted definer-function warnings.

## Safety guarantees
- Compression fail / weak device / offline → **original file upload** (kabhi block nahi). 
- Indexes additive — schema/RLS/data untouched.
- Module isolation maintained; har module sirf apne upload point + shared helper use karega.
- Koi UI/design/layout/user-flow change nahi (sirf progress % wapas dikhega).

## Verify
- Build pass; module switch + notifications/groups load clearly fast.
- Image upload → stored file MB→KB; video upload → smaller MB; upload % visible.
- Console clean (no ad spam); linter sirf accepted definer warnings.
