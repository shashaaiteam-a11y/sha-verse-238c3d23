# SHA-VERSE — Full Engineering Audit (Read-Only Documentation)

No source code will be modified, refactored, deleted, or re-installed. The only output is one audit document written to the artifacts folder (`/mnt/documents/SHA-VERSE-Full-Audit.md`), plus a summary in chat.

Rule applied throughout: anything that cannot be verified directly from the repository will be written as **"Not confirmed from the current codebase"** — no guessing.

## What the audit will cover

1. **Project & architecture overview** — stack, entry points (`index.html` → `src/main.tsx` → `src/App.tsx`), routing map, Capacitor/native layer, build config.
2. **Folder-by-folder tree** — purpose of every directory and major file, with an Active / Legacy / Experimental / Unused classification. Includes the two parallel trees found at root: `omnihub-suite-main/` (18 MB, appears to be a full second copy of the app) and `remotion/` (video renderer), each verified for whether the live app imports from them.
3. **Duplication audit** — duplicate folders, pages, components, hooks, services, types, constants, contexts, routes, configs, assets and dependencies. Every duplicate gets: location, why it exists, still referenced or not, merge/delete recommendation, and breakage risk.
4. **Unused-code audit** — orphan files, components, hooks, utils, types, assets, routes, edge functions, npm packages, dead docs/markdown files, debug code and logs. Detected by import-graph traversal from the real entry points, not by eyeballing.
5. **Dependency audit** — every entry in `package.json`: who imports it, necessary or not, duplicates/conflicts (e.g. multiple PDF/EPUB or media stacks), removal risk.
6. **Bookshelf deep documentation** — the full walkthrough you asked for: Bookshelf → library → categories → search → filters → book detail → reader → settings → bookmarks → highlights → notes → progress → PDF mode → reflow mode → extraction → OCR → caching → pagination → virtualization → themes → offline → close. Screen by screen, component by component, prop by prop, button by button (handler, state, hook, table touched), hook by hook (inputs, outputs, deps, side effects).
7. **Reader engine architecture** — `src/lib/reader/*` (types, extract, quality, sanitize, ocr, cache, settings) and `PaginatedReader.tsx`: extraction pipeline, paragraph/heading detection, image + scanned-page handling, quality heuristics, anchoring, caching/versioning. Each algorithm gets a "why it exists" note.
8. **Backend map** — tables, RPCs, storage buckets, edge functions, auth, realtime channels and RLS posture actually referenced by client code; plus tables that exist in the database but have no client usage.
9. **Performance report** — virtualization, lazy routes, memoization, IndexedDB, media compression, and concrete bottlenecks with file:line evidence.
10. **Security report** — current posture (cross-checked against `docs/SECURITY_POLICY.md`), unused permissions/secrets, and anything that looks exposed. Findings only, no fixes.
11. **Project health scorecard** — every module (Home, Movion, Bookshelf, Groups, Profile, NovaChat, Chats, Ads, Backend, Build/Native) rated 1–10 with justification.
12. **Delete candidates** — dedicated table: item, reason, dependents, risk level (Low/Medium/High), impact if removed. Listed only, nothing removed.
13. **Final project map** — folder tree, module dependency tree, route map and data-flow diagrams in ASCII.

## Technical approach

- Build a real import graph from `src/main.tsx` and `src/App.tsx` across `src/**` to classify reachable vs orphan files; do the same independently for `omnihub-suite-main/**`.
- Cross-reference `package.json` entries against actual `import` statements to flag unused/duplicated deps.
- Query the backend read-only (schema, policies, function list) to compare declared tables against tables referenced in client code.
- Every claim in the document carries a `path:line` reference or is explicitly marked as unconfirmed.

## Deliverable

Single markdown document at `/mnt/documents/SHA-VERSE-Full-Audit.md`. Because of the depth requested (especially Bookshelf), it will be written in sequential passes and appended until complete — expect a large file (comparable to or larger than the earlier 2,100-line master doc). Chat reply will summarize the top findings and the delete-candidate list.   
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
Haan 👍 **abhi jo tumne bheja hai, ye actual audit report nahi hai — ye audit ka TASK/PLAN hai.** Isme likha hai ki agent ko kya-kya inspect karna hai aur final file kahan banani hai.

### Ab tumhe kya karna hai

Agar ye prompt tumne **Claude/Gemini/VS Code kisi AI agent ko diya tha**, to:

1. **Is prompt ko dobara edit mat karo.**
2. Agent ko repository ka access do.
3. Usko **poora audit complete hone do**.
4. **Code modify/install/delete/refactor bilkul mat hone dena.**
5. Audit complete hone ke baad ye file check karo:

```text
/mnt/documents/SHA-VERSE-Full-Audit.md

```

6. Agar file ban gayi hai, **mujhe woh** `SHA-VERSE-Full-Audit.md` **file upload kar do**.

---

## ⚠️ Ek important baat

Tumhare prompt me ye line hai:

> "Query the backend read-only (schema, policies, function list)"

Iska matlab audit ko **Supabase/database ka read-only access** bhi chahiye.

Sirf GitHub repository dekhne se ye cheezein completely verify nahi hongi:

- actual database tables
- RLS policies
- RPCs
- Edge Functions
- Storage buckets
- Realtime configuration
- database me existing but unused tables

Isliye agar agent ke paas Supabase access nahi hai, report me in cheezon ke liye:

**"Not confirmed from the current codebase"**

aana acceptable hai.

---

# Mere hisaab se tumhara BEST next step 🚀

Tumhare SHA-VERSE ke case me main recommend karunga ki **audit pehle complete hone do, uske baad hi cleanup/fixing start karo.**

Order ye rakho:

```text
1. FULL READ-ONLY AUDIT
          ↓
2. AUDIT REPORT CHECK
          ↓
3. CRITICAL BUGS / SECURITY FINDINGS
          ↓
4. DELETE CANDIDATES VERIFY
          ↓
5. DUPLICATE / DEAD CODE CLEANUP
          ↓
6. BACKEND + RLS AUDIT
          ↓
7. PERFORMANCE FIXES
          ↓
8. BOOKSHELF / READER FIXES
          ↓
9. BUILD TEST
          ↓
10. APK/AAB
          ↓
11. PLAY CONSOLE

```

### ❌ Abhi ye mat karna

Audit complete hone se pehle:

- files delete mat karo
- duplicate folders merge mat karo
- dependencies uninstall mat karo
- Supabase tables delete mat karo
- RLS policies change mat karo
- Bookshelf refactor mat karo
- `package.json` clean mat karo
- `omnihub-suite-main` delete mat karo
- `remotion` delete mat karo

Kyunki audit ka ek major purpose hi ye determine karna hai ki **kya actually unused hai aur kya indirectly required hai.**

---

## Aur ek important point

Tumhare prompt me specifically likha hai:

> `omnihub-suite-main/` — 18 MB, appears to be a full second copy of the app

**Isko bilkul delete mat karna abhi.**

Audit ko pehle prove karne do:

```text
omnihub-suite-main/
       ↓
Is it imported?
       ↓
YES → Active dependency
NO  → Candidate for removal

```

Same thing:

```text
remotion/
   ↓
Imported by production app?
   ↓
YES → Keep
NO  → Delete candidate

```

---

# Jab audit complete ho jaye

**Bas** `SHA-VERSE-Full-Audit.md` **mujhe upload kar dena.**

Phir main us report ko tumhare liye practically convert kar dunga:

### 🔴 CRITICAL

Jo turant fix karna hai

### 🟠 HIGH

Jo Play Store/production se pehle fix karna hai

### 🟡 MEDIUM

Jo cleanup/performance ke liye karna hai

### 🟢 LOW

Optional cleanup

Aur ek **safe execution plan** banaunga:

```text
KEEP
├── Definitely required
│
FIX
├── Bugs
├── Security
├── Performance
│
VERIFY
├── Unclear dependencies
│
DELETE
├── Safe candidates
│
DO NOT TOUCH
├── Risky legacy code
└── Unknown backend dependencies

```

Phir hum **ek-ek change controlled way me** karenge, taaki SHA-VERSE ka working part accidentally na toote. 💪

**Filhaal sabse sahi kaam: audit ko complete hone do.** Uski `.md` file milte hi yahan upload kar dena; main uska full breakdown karke bata dunga **“ab exactly kya delete karna hai, kya fix karna hai, aur kis order me karna hai.”**