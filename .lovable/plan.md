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
