

# 🧱 Module Isolation Plan — 7 Independent Modules

## 🔍 Current State Analysis

### What's already isolated ✅
- **Movion** is the only properly isolated module. It lives in `src/movion/` with its own `pages/`, `components/`, `hooks/`, `contexts/`, `algorithms.ts`, `constants.ts`, `store.tsx`, `types.ts`.
- **Ads** are isolated under `src/components/ads/` and `src/lib/ads/`.

### What's NOT isolated ❌
All other modules (Home, NovaChat, Bookshelf, Groups, Profile, Chats) share:
- Pages mixed in flat `src/pages/` folder
- Components scattered across flat `src/components/` (PostCard, FeedCard, MessengerChat, FriendSuggestions, etc.)
- Hooks all dumped in flat `src/hooks/` (useFeed, useReactions, useShares, useFriends, useStories, useMessages, etc.)
- Many components are **shared** across modules:
  - `PostCard`, `PostComments`, `EmojiReactionPicker`, `ShareDialog`, `useReactions`, `useSavedPosts`, `useShares` → used by Home, Profile, Groups, SavedPosts simultaneously
  - `useFriends` → used by Home, Profile, UserSearchDialog
  - `useStories` → used by Home and Profile

This means changing one module easily breaks another — exactly the problem you want solved.

---

## 🎯 Goal

Convert each module into a **self-contained folder** following the Movion pattern, with its own pages, components, hooks, types, and constants. Shared "library-grade" primitives (UI kit, ShareDialog, EmojiReactionPicker) stay in a clearly marked shared layer that modules **consume but never modify**.

---

## 🗂️ Target Folder Structure

```text
src/
├── modules/
│   ├── home/
│   │   ├── pages/        (Home.tsx, SavedPosts.tsx, Notifications.tsx)
│   │   ├── components/   (FeedCard, CreatePostCard, FriendSuggestions, AppMenu, NotificationBell, UserSearchDialog, PostCard, PostComments, FacebookStoriesBar, StoryViewer)
│   │   ├── hooks/        (useFeed, useFriends, useStories, useFriendSuggestions, usePosts, useUserSearch, useNotifications, useSavedPosts, useShares, usePollVotes)
│   │   └── types.ts
│   │
│   ├── novachat/
│   │   ├── pages/        (NovaChat.tsx)
│   │   ├── components/   (ChatMessage, ChatSidebar, WelcomeScreen, ChatInput, SponsoredSuggestion-slot)
│   │   └── hooks/        (useNovaChat)
│   │
│   ├── bookshelf/
│   │   ├── pages/        (Bookshelf, BookDetail, BookReader, EditBook, AuthorChannel, EditAuthorChannel)
│   │   ├── components/   (BookCard, BookDetailPage, EPUBViewer, PDFViewer, UploadBookDialog, EnhancedUploadBookDialog, CreateAuthorChannelDialog, BookRatingDialog, BookDeletionDialog, CommentSection, AnalyticsDashboard)
│   │   ├── hooks/        (useBooks, useBookFeeds, useBookComments, useBookInteractions, useChannels, useChannelApproval, useReaderBookmarks, useCopyrightSystem)
│   │   └── constants.ts  (already exists at src/lib/constants/bookshelf — move here)
│   │
│   ├── groups/
│   │   ├── pages/        (Groups, GroupDetail, GroupAdmin)
│   │   ├── components/   (CreateGroupDialog + group-specific UI)
│   │   └── hooks/        (useGroups, useGroupAdmin, useGroupChat, useGroupJoinRequests, useGroupMembers, useGroupPosts, useGroupReports)
│   │
│   ├── profile/
│   │   ├── pages/        (Profile.tsx, Friends.tsx, Settings.tsx, EditProfileDialog…)
│   │   ├── components/   (ProfileIntroCard, ProfileMoreMenu, ProfilePostCard, ProfileSettingsDialog, FeaturedPhotos, FriendsPreview, SocialLinksSection, ProfileImageUpload)
│   │   └── hooks/        (useProfile, useProfileSettings, useUserPosts, useUserPhotos, useUserVideos, useMutualFriends, useUserInterests)
│   │
│   ├── chats/
│   │   ├── pages/        (Messages.tsx)
│   │   ├── components/   (MessengerChat, ChatLayout, ChatHeader, ChatHeaderMenu, ChatTypingBar, TickIndicator, TypingIndicator, PresenceStatus, VideoCallDialog, ChatDialog, ChatUserSearchDialog, MessagesDrawer)
│   │   └── hooks/        (useMessages, useMessagesRealtime, useConversations, useReadReceipts, useTypingIndicator, useMessagingPermissions, useBlockment, useBadgeCount, usePresence, usePresenceEnhanced)
│   │
│   └── movion/           (already isolated — leave as-is, just move under /modules for symmetry)
│
└── shared/               (read-only by all modules)
    ├── ui/               (existing src/components/ui/* — shadcn primitives, untouched)
    ├── components/       (ShareDialog, EmojiReactionPicker, ReactionPicker, HashtagText, ImageUpload, LocationPicker, BottomNav, ProtectedRoute, SwipeWrapper, NavLink)
    ├── hooks/            (useReactions, use-mobile, use-toast, usePullToRefresh, useSwipeNavigation)
    ├── contexts/         (AuthContext, MobileContext, AdContext)
    ├── lib/              (utils, ads/*)
    ├── integrations/     (supabase/*)
    └── services/
```

---

## 🛡️ Isolation Rules (Enforced going forward)

1. **Module → Module imports are FORBIDDEN.** A file in `modules/home/` may NEVER import from `modules/profile/`, `modules/chats/`, etc.
2. **Module → Shared imports are ALLOWED** (`@/shared/...`).
3. **Shared → Module imports are FORBIDDEN.** Shared code must not know any module exists.
4. Each module owns its hooks and components even if logic looks similar — duplication is acceptable to preserve isolation.
5. `App.tsx` is the ONLY file that imports pages from multiple modules (for routing). It does not contain feature logic.

---

## 🔁 Handling Shared Components Currently Used by Multiple Modules

Some components today are imported by Home, Profile, Groups, SavedPosts simultaneously. Strategy:

| Component | Decision |
|---|---|
| `PostCard`, `PostComments`, `FeedCard`, `CreatePostCard` | **Owned by Home module.** Profile and Groups get their **own copies** (`ProfilePostCard` already exists; create `GroupPostCard`). SavedPosts moves into Home module. |
| `EmojiReactionPicker`, `ShareDialog`, `HashtagText` | **Move to `shared/components/`** — they are pure presentational primitives with no module-specific logic. |
| `useReactions` | **Move to `shared/hooks/`** — generic reaction toggle works across posts/videos/books. |
| `useShares`, `useSavedPosts`, `usePollVotes` | **Owned by Home module.** Other modules call their own equivalents or skip. |
| `useFriends` | **Owned by Home module.** Profile gets its own thin `useProfileFriends` wrapper. |
| `useStories` | **Owned by Home module.** Profile's story-create flow gets its own minimal `useCreateStory`. |
| `MessengerChat` | **Owned by Chats module.** No other module imports it (Home only routes to `/messages`). |
| `useBadgeCount` | **Owned by Chats module.** Home reads the unread total via a tiny shared selector hook `useUnreadCount` in `shared/hooks/` that queries the same data without coupling to Chats internals. |

---

## 🛠️ Implementation Steps (when approved)

**Phase 1 — Shared layer setup**
1. Create `src/shared/` with subfolders.
2. Move pure primitives: `ShareDialog`, `EmojiReactionPicker`, `ReactionPicker`, `HashtagText`, `ImageUpload`, `LocationPicker`, `BottomNav`, `ProtectedRoute`, `SwipeWrapper`, `NavLink` → `src/shared/components/`.
3. Move `useReactions`, `use-mobile`, `use-toast`, `usePullToRefresh`, `useSwipeNavigation` → `src/shared/hooks/`.
4. Add re-export shims at OLD paths (`src/components/ShareDialog.tsx` → `export * from '@/shared/components/ShareDialog'`) so nothing breaks during migration.

**Phase 2 — Create module folders**
5. Create `src/modules/{home,novachat,bookshelf,groups,profile,chats,movion}/` with `pages/`, `components/`, `hooks/`, `types.ts`.
6. Move each module's pages, components, hooks into its folder.
7. Update internal imports inside each module to use relative paths or `@/modules/<name>/...`.
8. Add re-export shims at OLD paths so `App.tsx` lazy imports keep working until Phase 3.

**Phase 3 — Decouple shared cross-module components**
9. Duplicate `PostCard` logic into `modules/groups/components/GroupPostCard.tsx` (using existing GroupDetail render code).
10. Duplicate friend/story hooks where Profile uses them — own copies.
11. Create `shared/hooks/useUnreadCount.ts` for Home header badge (reads `conversations` table directly, no Chats import).
12. Remove cross-module imports one by one; verify each module still works.

**Phase 4 — Cleanup**
13. Update `App.tsx` lazy imports to point at new `@/modules/<name>/pages/...` paths.
14. Update `vite.config.ts` aliases if needed (`@/modules`, `@/shared`).
15. Delete the re-export shims.
16. Add an ESLint rule (`no-restricted-imports`) blocking module → module imports.

**Phase 5 — Memory**
17. Update `mem://constraints/module-isolation-mandate` with the new folder structure and import rules.
18. Add `mem://architecture/module-folder-structure` documenting the 7 modules + shared layer.

---

## ⚠️ What This Plan Does NOT Change

- ❌ No UI changes anywhere — pixels stay identical.
- ❌ No feature logic changes — only file locations and import paths.
- ❌ No database / RLS / Supabase changes.
- ❌ No changes to ads system, realtime channels, auth, or routing behavior.
- ❌ Movion module stays where it is (already isolated); only optionally moved under `/modules/` for symmetry.

---

## ❓ One Decision Needed Before I Start

This is a **large structural refactor touching ~100+ files** across moves + import rewrites. It will be done carefully but is non-trivial. Two approaches:

**Option A — Full refactor in one go (recommended)**
All 5 phases executed sequentially in one implementation pass. Bigger single change but leaves you with clean isolation immediately.

**Option B — Module-by-module (safer, slower)**
Do one module at a time over multiple turns: Chats first → Profile → Bookshelf → Groups → NovaChat → Home last (Home is biggest). After each module you verify nothing broke.

I recommend **Option B** because it minimizes risk of breakage and lets you verify each module in the preview before moving to the next. Please confirm Option A or B and I'll proceed.

