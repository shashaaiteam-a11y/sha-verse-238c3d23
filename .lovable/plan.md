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
