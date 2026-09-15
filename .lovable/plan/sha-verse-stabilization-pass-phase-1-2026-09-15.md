# SHA-VERSE Stabilization Pass — Phase 1

Audit ke confirmed bugs main ne code me verify kar liye. Sab sach nikle. Neeche wahi cheezein hain jo abhi, isi pass me, safe aur isolated tareeke se theek ho sakti hain — bina kisi module ka look, feature ya logic badle.

## 1. Chat: "Unexpected token '<'" wala crash

Naya chat shuru karte waqt server ka pata ek alag jagah se banaya ja raha hai, jo kabhi khaali ho sakta hai. Tab request website par chali jaati hai aur app HTML ko data samajhkar crash karta hai.
Fix: wahi tareeka use karenge jo NovaChat me already kaam kar raha hai (central client ka apna address), aur jawab ko parse karne se pehle uska type check karenge. Galat jawab par saaf error message.

## 2. Push: logout par purana device link reh jaata hai

Logout ke baad token hataane ki koshish hoti hai, lekin tab tak user sign out ho chuka hota hai, isliye kuch hota hi nahi. Doosri baat: registration fail hone par dobara koshish block ho jaati hai.
Fix: token sign-out se pehle hataana, aur "registered" mark sirf success par karna. Tray ki saari notifications ko app khulte hi clear karne wala behaviour hata denge (Facebook jaisa).

## 3. Movion: nakli (mock) videos aur random analytics

Movion ka andaruni store abhi bhi demo videos/channels aur `Math.random()` se bane analytics numbers mila raha hai asli data ke saath. Isi se ek page par alag count aur doosre par alag dikhta hai.
Fix: store se mock data aur random metrics hata denge; sirf database ka data rahega. Design, layout, ranking aur baaki behaviour waisa hi.

## 4. Search me raw text se filter banana (Movion + user search)

User ka likha text seedha filter string me jaata hai; special characters se query toot sakti hai.
Fix: input ko escape/sanitize karenge dono jagah. (Full server-side search RPC baad ke phase me.)

## 5. Group banane ka aadha-adhoora result

Group pehle banta hai, phir owner ki membership add hoti hai — do alag steps. Beech me fail hua to group ban jaata hai par owner member nahi hota.
Fix: dono kaam ek hi server function me, fail hone par poora rollback. Saath me: group banane wala member "Leave" nahi kar payega (ownership transfer ya delete hi option).

## 6. Profile ka jhootha "User not found"

Network ya permission error ko bhi "user nahi mila" dikhaya jaata hai.
Fix: alag-alag haalat alag dikhenge — loading, nahi mila, private, network problem (retry ke saath).

## 7. Ads config ka galat comment

File upar "TEST MODE" likha hai jabki live mode on hai. Sirf comment/documentation theek karenge.

---

## Baad ke phases (abhi nahi)

- Story reply/reaction ko backend se jodna (nayi tables + notifications) — alag pass.
- Chat list ko ek server summary query par lana (scale ke liye).
- Movion recommendation algorithm ko asli feed se jodna.
- Book view counting ko ek hi service me laana.
- `omnihub-suite-main` duplicate copy ka diff + archive, aur modules/legacy hybrid cleanup.
- Production database ka poora RLS/RPC audit, aur signed Android build par regression test.

## Technical notes

- Files: `src/hooks/useConversations.ts`, `src/lib/push/registerPush.ts`, `src/components/push/PushBridge.tsx`, `src/movion/store.tsx`, `src/hooks/useMovionSearch.ts`, `src/hooks/useUserSearch.ts`, `src/hooks/useProfile.ts` + Profile page states, `src/lib/ads/adConfig.ts`.
- DB: ek naya transactional RPC `create_group_with_owner(...)` (SECURITY DEFINER, fixed search_path, auth.uid() ownership check) aur creator-leave block. Koi table/policy weaken nahi hogi.
- `omnihub-suite-main/` ko is pass me bilkul touch nahi karenge.
- Verification: `npx tsgo --noEmit -p tsconfig.app.json` + build log, aur Movion/Chat/Groups par Playwright smoke test.   
  
  
  
  
  
  
  
  
Haan — **overall plan sahi hai aur Phase 1 ke liye kaafi sensible hai**. 👍  
Main ise **approve karunga, lekin 5 important corrections** ke saath. In corrections ke bina kuch fixes half-working ya regression-prone ho sakte hain.
  ## Sabse important corrections
  ### 1. Push logout fix me ek file missing hai
  Plan me likha hai:
  > token sign-out se pehle hataana
  Ye correct hai. Lekin sirf:
  - `PushBridge.tsx`
  - `registerPush.ts`
  change karne se ye guarantee nahi hogi.
  **Actual logout/signOut function** jahan `supabase.auth.signOut()` call hota hai, us path ko bhi modify karna padega.
  Correct sequence:
  ```text
  User taps Logout
  ↓
  removeCurrentDeviceToken(currentUserId)
  ↓
  confirm cleanup attempt
  ↓
  supabase.auth.signOut()
  ↓
  clear local state
  ```
  Aur `removeCurrentDeviceToken()` ko current user dobara `getUser()` se discover nahi karna chahiye; preferably known `userId` pass karo.
  **Technical notes me AuthContext/logout handler add karo.**
  ---
  ### 2. Movion mocks ko seedha delete mat karna
  Ye line conceptually correct hai:
  > store se mock data aur random metrics hata denge
  Lekin implementation me **pehle importer/consumer mapping** honi chahiye.
  Kyunki `MovionStoreProvider` live Movion ke top level par mounted hai. Agar `MOCK_VIDEOS` hata diye aur koi hidden component abhi bhi:
  ```ts
  videos
  channels
  analytics
  ```
  store se expect karta ho, Movion crash/empty ho sakta hai.
  Safer sequence:
  ```text
  Find every useMovionStore consumer
  ↓
  Mark each field:
  DB-backed / UI-only / legacy
  ↓
  DB-backed fields ko Supabase hooks se replace
  ↓
  Only then delete mock fallback
  ↓
  Remove Math.random analytics
  ```
  **Goal mocks remove karna hi rahe**, bas blind deletion nahi.
  ---
  ### 3. Search ke liye sirf “sanitize” par depend mat karo
  Plan ka ye part thoda weak hai:
  > input ko escape/sanitize karenge
  PostgREST `.or()` ek **filter language** hai; normal HTML/string sanitation iska ideal solution nahi.
  Phase 1 me RPC nahi banana hai to safer isolated solution hai:
  **raw** `.or()` **string banana hi avoid karo.**
  Example user search:
  ```text
  Query 1 → display_name.ilike(...)
  Query 2 → username.ilike(...)
  Merge + deduplicate results
  ```
  Movion:
  ```text
  title query
  description query
  category query
  → merge/rank/dedupe
  ```
  Thodi extra requests hongi, lekin Phase 1 me **much safer aur predictable**.
  Later proper server-side search RPC/full-text search karo.
  ---
  ### 4. `create_group_with_owner()` me 5-group limit bhi server par honi chahiye
  Abhi user ki max 5 groups validation client-side hai.
  Agar new RPC sirf:
  ```text
  create group
  +
  insert admin member
  ```
  karega, to koi direct API/RPC call karke cap bypass kar sakta hai.
  Transactional RPC ke andar ye sab hona chahiye:
  ```text
  auth.uid() required
  ↓
  count owned/admin-created groups
  ↓
  if >= 5 → reject
  ↓
  validate trimmed name
  ↓
  create group
  ↓
  insert creator as admin
  ↓
  commit
  ```
  Aur important:
  **current behavior preserve karo — group names unique mat banana**, kyunki current app intentionally duplicate names allow karta hai.
  ---
  ### 5. Creator leave ko UI se nahi, database se block karo
  Tumhare plan me ye intent correct hai:
  > group banane wala member "Leave" nahi kar payega
  Lekin sirf button hide/disable karna enough nahi.
  Server rule hona chahiye.
  Best options:
  - creator membership DELETE prevent karne wala trigger/RLS
  - ya `leave_group()` RPC jo creator ko reject kare
  Response:
  ```text
  GROUP_OWNER_CANNOT_LEAVE
  ```
  UI phir kahe:
  > Ownership transfer karein ya group delete karein.
  Ye **server-enforced** hona chahiye.
  ---
  # Profile fix me ek nuance
  Ye direction sahi hai:
  > loading, nahi mila, private, network problem
  Lekin `private` aur `not found` ko database kabhi-kabhi same visible result de sakta hai because RLS row ko invisible bana deta hai.
  Isliye Phase 1 me at minimum states rakho:
  - `loading`
  - `found`
  - `not_found_or_unavailable`
  - `network_error`
  - `permission_error`
  - `deactivated`
  Agar backend reliably privacy status disclose karta hai tabhi explicit:
  `private`
  show karo.
  Warna attacker ko private account existence leak nahi karna chahiye.
  ---
  # Ads wala point ✅
  Bilkul safe:
  > Sirf misleading comment/documentation fix.
  `USE_TEST_ADS=false`  
  `ADS_HIDDEN=false`
  ko **touch nahi karna**.
  Ad unit IDs bhi is pass me change nahi hone chahiye.
  ---
  # Story ko Phase 2 me rakhna ✅
  Ye decision mujhe pasand hai.
  Story replies/reactions involve:
  - persistence
  - notifications
  - chat integration
  - RLS
  - realtime
  Isliye isko current stabilization patch me ghusana regression scope badha dega.
  ---
  # Book views ko Phase 2 me rakhna ✅
  Abhi server cooldown already duplicate increments ko kaafi protect karta hai.
  Architecture clean karna useful hai, lekin current critical bugs ke comparison me urgent nahi.
  ---
  # Duplicate architecture cleanup baad me ✅
  `omnihub-suite-main/` ko **is pass me touch na karna** bilkul correct decision hai.
  Pehle live tree stabilize karo.
  Baad me:
  ```text
  diff
  → determine canonical files
  → archive/remove duplicate tree
  → verify build
  ```
  Blind deletion nahi.
  ---
  # Verification me 3 cheezein aur add karo
  Current verification:
  - TypeScript
  - build
  - Playwright
  achha hai.
  Main isme ye bhi add karunga:
  1. **No-new-console/runtime-errors check**  
  Playwright pages open karke console `error` + uncaught exceptions capture kare.
  2. **Database regression tests**  
  Groups ke liye:
    - create success
    - member insert automatically
    - forced failure → zero orphan group
    - creator leave rejected
    - normal member leave works
    - sixth group creation rejected
  3. **Push physical Android check**  
  Playwright push verify nahi kar sakta.
  At least signed/debug native build par:
  ```text
  login
  → token exists
  → logout
  → token removed
  → login again
  → token restored
  → kill app
  → send push
  → tray notification
  → tap → correct deep link
  ```
  ---
  # Revised Phase 1 priority
  Main exact execution order ye rakhunga:
  1. 🔴 **Chat HTML/JSON crash**
  2. 🔴 **Push token lifecycle + retry**
  3. 🔴 **Groups transactional creation + owner leave protection**
  4. 🔴 **Search raw filter construction**
  5. 🔴 **Movion mock/random source-of-truth cleanup**
  6. 🟠 **Profile error-state correctness**
  7. 🟢 **Ads documentation cleanup**
  8. 🧪 **Full regression suite**
  Main Groups ko Movion se pehle karunga because transactional consistency fix relatively isolated hai, jabki Movion store cleanup ka blast radius bada hai.
  ## Final verdict
  **Plan ~90% correct hai.**
  Bas isko production-ready banane ke liye ye changes karo:
  - Push fix me **actual logout path** include karo.
  - Movion mocks **consumer mapping ke baad** remove karo.
  - Search me simple “sanitize” ke bajay **raw** `.or()` **avoid** karo.
  - Group 5-limit ko **RPC ke andar enforce** karo.
  - Creator leave ko **database/server level par block** karo.
  - Profile me privacy/not-found distinction ko security-aware rakho.
  - Playwright ke saath **native push + DB transactional tests** bhi karo.
  In corrections ke baad main isse confidently **SHA-VERSE Stabilization Pass — Phase 1 Production Plan** kahunga.