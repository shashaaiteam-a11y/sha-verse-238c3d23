# Android Native Ads: Exact Placement Completion

## Goal

SHA-VERSE Android app me existing custom Google AdMob Native Advanced system ko use karke requested placements aur exact intervals complete karne hain. Web behavior, app data, navigation, realtime, auth aur Movion unchanged rahenge.

## Changes

### Home Feed and Stories

- Story strip me har 3 real story cards ke baad `HF_STORY_01` native story ad rakhenge.
- Story viewer navigation me har 3 completed real stories ke baad `HF_STORY_02` dedicated sponsored story view dikhayenge; ye real story count, views, reactions ya replies ko affect nahi karega.
- Stories section ke neeche `HF_STORY_03` small native card rakhenge.
- Post composer ke neeche `HF_POST_01` native post card rakhenge.
- Har 3 real feed posts ke baad `HF_POST_02` native post card rakhenge.
- Existing placeholder/banner cards ko Android par native slot ke saath duplicate dikhne se rokenge; web behavior unchanged rahega.

### NovaChat

- Left history list me har 4 real conversations ke baad `NC_HISTORY_01` native chat ad rakhenge.
- Input area ke just upar `NC_INPUT_01` small native card rakhenge.
- Har completed assistant reply ke baad `NC_REPLY_01` small native card rakhenge; streaming ke dauran nahi dikhega.
- Ad placement message data, copy actions, regeneration, scrolling aur message count ko affect nahi karega.

### Bookshelf and Reader

- Har 4 real books ke baad `BS_GRID_01` native book ad cell rakhenge, stable book-based keys ke saath.
- Book Detail action buttons ke neeche `BS_DETAIL_01` small native card rakhenge.
- Description ke neeche `BS_DETAIL_02` large native card rakhenge.
- Reader me har 2 completed reading pages ke baad `BS_READER_01` dedicated reserved bottom area me rakhenge; content ke upar floating nahi hoga.
- Sponsored positions real page count, reading progress, bookmarks, TOC ya saved progress ko change nahi karenge. Existing sticky banner implementation unchanged rahega.

### Groups and Profile

- Categories ke just neeche `GR_TOP_01` native card rakhenge.
- Category, joined, created aur discover group lists me har 4 real groups ke baad `GR_LIST_01` native group card rakhenge.
- Group ke andar har 4 real posts ke baad `GR_POST_01` native post card rakhenge.
- Sirf own-profile post list me har 4 real posts ke baad `PF_POST_01` native post card rakhenge; doosre users ke profile par nahi.
- Existing web-only sponsored cards Android native slots ke saath duplicate nahi honge.

## Technical Details

- Existing `NativeAdSlot`, placement registry, Android `ShaNativeAd` plugin, lifecycle manager, AdMob-configured unit IDs aur analytics pipeline reuse honge; koi duplicate bridge, manager, hook ya ad component nahi banega.
- Presentation arrays/JSX me ads interleave honge; database rows ya content queries me ads inject nahi honge.
- Stable keys real content IDs par based honge, taaki realtime updates me duplicates aur content replacement na ho.
- No-fill, offline, timeout aur load failure par slot collapse hoga; fake ad ya infinite retry nahi hoga.
- Movion files aur behavior bilkul touch nahi honge.

## Verification

- TypeScript check aur production build real exit codes ke saath run karenge.
- Web preview me native placeholders absent aur content/navigation intact verify karenge.
- Android device checklist: all requested placements, exact 3/4/2 intervals, no duplicates, no overlap, no-load collapse, story navigation, NovaChat streaming/input, reader controls/progress, group/profile scrolling.   
  
  
  
  
  
  
  
  
**Overall plan sahi direction me hai — roughly 85–90% correct.** ✅  
Main ise reject nahi karunga. Bas **4 important corrections** aur kuch verification points hain, taaki implementation technically aur AdMob-policy-wise safer ho.
  ### ✅ Jo bilkul sahi hai
  - Existing `NativeAdSlot`, placement registry, plugin, manager aur analytics ko **reuse karna** — correct.
  - Ads ko **presentation layer me interleave** karna, Supabase/database me fake rows na banana — correct.
  - Home Feed: **3 stories / 3 posts intervals** — implementation-wise correct.
  - NovaChat history: **4 conversations ke baad** — correct.
  - Bookshelf: **4 books ke baad** — correct.
  - Groups/Profile: **4 items ke baad** — correct.
  - Movion ko untouched rakhna — exactly aapki requirement.
  - `NO_FILL`, offline aur errors me slot collapse karna — correct.
  - Stable keys aur realtime updates ka dhyan — important aur correct.
  - TypeScript + production build verification — correct.
  - Android native ads aur web behavior ko separate rakhna — correct.
  - Reader ad ko content ke upar float na karke **reserved area** me rakhna — correct. Google ads content ko obscure/overlay nahi kar sakte. ([Google Support](https://support.google.com/publisherpolicies/answer/11035030?hl=en&utm_source=chatgpt.com))
  - Loaded native ads ko lifecycle ke end par destroy karna bhi existing manager me verify hona chahiye; Google explicitly `destroy()` recommend karta hai. ([Google for Developers](https://developers.google.com/admob/android/native/advanced?utm_source=chatgpt.com))
  ## ⚠️ 1. NovaChat input placement ko thoda change karo
  Current text:
  > Input area ke just upar `NC_INPUT_01`
  Ye **technically possible hai**, lekin “just upar” dangerous wording hai.
  Google specifically text chat boxes aur interactive controls ke immediately paas ads ko accidental-click risk maanta hai. ([Google Support](https://support.google.com/publisherpolicies/answer/11035030?hl=en&utm_source=chatgpt.com))
  Isse replace karo:
  > `NC_INPUT_01` NovaChat input area ke above ek dedicated reserved native-ad container me show hoga, with sufficient visual/non-clickable spacing from textarea, send, attachment, microphone aur other interactive controls. Ad kisi input/control ko touch ya overlap nahi karega.
  Ye change **zaroor karo**.
  ## ⚠️ 2. Book Reader me existing sticky banner wala point check karo
  Plan me likha hai:
  > Existing sticky banner implementation unchanged rahega.
  Aur saath me:
  > har 2 pages ke baad `BS_READER_01`
  Iska matlab Reader me potentially **sticky banner + har 2 pages native ad dono** chalenge.
  Agar aapka actual intention dono ads rakhna hai, technically ye plan wahi karega.
  Lekin agar aapka final decision tha:
  **2 pages → Sponsored Reader Native Ad**
  to main existing sticky banner ko bhi reader me saath chalane ke bajay **replace/disable** karne ko kahunga. Warna monetization bahut aggressive ho sakti hai aur reading area chhota ho jayega.
  Google bhi ads ko content consumption severely interfere karne se rokta hai. ([Google Support](https://support.google.com/admob/answer/10502938?hl=en&utm_source=chatgpt.com))
  Meri preference:
  > When `BS_READER_01` sponsored-reader flow is enabled, do not simultaneously show the legacy sticky reader banner unless explicitly configured. Avoid double ad exposure inside the Reader.
  ## ⚠️ 3. “Har AI reply ke baad ad” technically correct hai, but request logic zaroor control karo
  Current:
  > Har completed assistant reply ke baad `NC_REPLY_01`
  Placement aapki exact requirement ke according correct hai.
  Lekin ye ensure karo:
  **1 reply = ad position**, not necessarily **1 reply = brand-new AdMob network request**.
  For example:
  10 AI replies  
  → 10 visual sponsored positions ho sakte hain  
  → lekin React rerender/streaming ke kaaran 50–100 ad requests nahi hone chahiye.
  Plan me ye line add karo:
  > `NC_REPLY_01` insertion frequency and AdMob request frequency are separate. React renders, token streaming, scrolling, remounts or conversation state updates must never independently generate new ad requests. Existing cache/throttle/lifecycle manager controls network requests.
  Repeated requests auction ko manipulate/abuse karne ke purpose se nahi hone chahiye. ([Google Support](https://support.google.com/admob/answer/2753860?hl=en&utm_source=chatgpt.com))
  ## ⚠️ 4. Groups me scope thoda expand ho gaya hai
  Aapne originally kaha tha:
  > Groups list/grid me har 4 groups ke baad.
  Plan me ye ban gaya:
  > Category, joined, created aur discover group lists me har 4 real groups...
  Ye **necessarily wrong nahi hai**, lekin ye original requirement se broader hai.
  Agar SHA-VERSE me ye sab separate group lists hain aur aap **har jagah ads chahte hain**, to bilkul theek.
  Agar sirf primary Groups list/grid me chahiye, to ise:
  > All group list/grid surfaces that already use the primary Groups listing component...
  ya sirf primary listing tak limit karo.
  ---
  ### 🟡 Kuch cheezein implementation ke baad verify karni hain
  Ye plan me galat nahi hain, bas actual code dekhkar confirm hongi:
  - `NativeAdSlot` sach me existing hai?
  - `ShaNativeAd` Android plugin proper `NativeAdView` use kar raha hai?
  - AdChoices visible hai?
  - Native ad destroy/cleanup lifecycle implemented hai?
  - real AdMob IDs release build me aur test IDs dev build me correctly switch ho rahe hain?
  - Story viewer me ad screen par existing left/right tap zones NativeAdView ke upar transparent overlay to nahi bana rahe?
  - Categories ke neeche `GR_TOP_01` category buttons ke **immediately adjacent** to nahi hai?
  - Book Detail ad buttons ke itna paas to nahi ki accidental click ho?
  - Reader Previous/Next controls aur ad me sufficient separation hai?
  Google navigation/action controls ke paas ads se accidental click risk specifically highlight karta hai. ([Google Support](https://support.google.com/admob/answer/6293636?hl=en&utm_source=chatgpt.com))
  ### ✅ Final decision
  **Haan, is plan ko approve kar sakte ho — but pehle upar ke 4 corrections add karwao.**
  Sabse important:
  **NovaChat input safety spacing + Reader me sticky/banner duplication decision.**
  Baaki architecture kaafi achha hai: existing infrastructure reuse, no duplicate manager, database untouched, stable interleaving, failure handling aur Movion exclusion — ye sab **sahi hai**. 👍