Goal (IMPLEMENT ALL THE PLAN WITH REALTIME WORKING SYSTEM WITH RLS POLICY, SQL ETC.)

Make the **Chats** module presence behave exactly like WhatsApp/Messenger:

- When the partner is **online** → show **"Online"** (green).
- When the partner is **offline** with a valid `last_seen` → show **"Last seen** &nbsp;**"**.
- When `last_seen` is hidden by privacy / blocked / unknown → show **NOTHING** (just the name, no "Offline" text, no grey dot). Same as WhatsApp.
- The 3-dot **menu** entries:
  - **View Profile** → instant in-app navigation to `/profile/:username` (already wired with `useNavigate`, just confirm).
  - **Privacy** → opens `ChatPrivacyDialog`, which must update **in realtime** (changes apply instantly to header pill of every viewer).
  - Last-seen / online visibility rules (`everyone / contacts / nobody`) and the **Give-and-Take** rule must propagate live without page reload.

Everything must stay strictly inside the **Chats** module — NovaChat, Groups, Profile, Feed, etc. are NOT touched.

---

# What's already correct (DO NOT TOUCH)

- DB function `public.get_user_presence_safe(uuid)` correctly enforces:
  - block check (either side blocked → hidden)
  - `last_seen_visibility` (everyone / contacts / nobody)
  - `online_status_visibility` (everyone / contacts / nobody)
  - "Give and Take" rule
- DB function `public.upsert_my_chat_privacy(...)` saves settings safely.
- `usePresenceTracker` heartbeat (25s) + visibility/unload handlers correctly mark current user online/offline.
- `useUserPresence` already subscribes to 4 realtime channels (`user_presence`, target `user_settings`, viewer `user_settings`, `user_blocks`).
- `ChatPrivacyDialog` already realtime-syncs across tabs and invalidates `user-presence` queries on save.
- `MessengerChat` already passes `isOnline`, `lastSeen` and uses `usePresenceTracker`.

These are the foundations — we won't rebuild them; we'll only fix the **rendering** + **fallback behaviour** + a few realtime gaps.

---

# Files to modify (chats module only)

## 1. `src/components/chat/PresenceStatus.tsx`  (UI rule change)

Current behaviour shows a grey dot + the word **"offline"** when not online and `lastSeen` is null. WhatsApp doesn't do that.

Change:

- If `isOnline === true` → render green dot + **"Online"** (keep as is).
- Else if `lastSeen` is a valid Date → render **"Last seen** &nbsp;**"** with NO coloured dot (WhatsApp shows just the text).
- Else → render `null` (component returns nothing). No "offline" word, no grey dot.
- Keep `isLoading` behaviour as is but render `null` instead of "Loading..." text when used inside the chat header (subtitle area), so the header doesn't flash placeholder text.

Acceptance: the partner header subtitle now shows exactly one of:
  `Online`  |  `Last seen 5m ago`  |  *(empty — only the name visible)*

## 2. `src/hooks/usePresenceEnhanced.ts`  (`useChatPartnerPresence`)

Current `statusText` falls back to the literal string `'Offline'`. Remove that fallback so the API mirrors the new UI rule:

```ts
const statusText = isOnline
  ? 'Online'
  : lastSeen
    ? `Last seen ${formatLastSeen(lastSeen)}`
    : '';                       // was: 'Offline'
```

This is consumed by anything that reads `.statusText` — empty string is safer than `'Offline'` and matches WhatsApp.

Also: add a 60-second `setInterval` re-render trigger inside `useChatPartnerPresence` so that the relative time string ("3m ago" → "4m ago") ticks forward without needing a network event. It does NOT re-fetch — it just calls `setTick(t => t + 1)`. Keeps the header live.

## 3. `src/components/chat/ChatHeader.tsx`  (small wiring)

- Confirm `View Profile` already uses `navigate(\`/profile/${otherUser.username})` — it does. No change needed there.
- The `<PresenceStatus>` block keeps the same props; thanks to change #1 it will now render nothing when there's no lastSeen and user is offline. That gives the WhatsApp look the user wants.
- Remove the now-redundant block-status / muted-status sub-lines? **NO** — those are separate features (block + mute) and out of scope; leave them untouched.

## 4. `src/components/MessengerChat.tsx`  (small consumer tweak)

- Where `statusText` is read for any tooltip / aria-label, treat empty string as "no subtitle". No layout change.
- The conversation list item dot (`OnlineBadge`): keep behaviour — green when online, grey when not. That's the small avatar dot; WhatsApp also keeps a subtle grey state there. Acceptable.

(If the user later wants the grey avatar dot also hidden when offline, that's a one-line tweak — but they specifically asked about "online/last seen system", which lives in the chat header subtitle, so we keep the avatar dot logic untouched for now.)

## 5. `src/components/chat/ChatPrivacyDialog.tsx`  (verify only)

Already:

- realtime-syncs across tabs using `user_settings` postgres_changes
- invalidates `['user-presence']` and `['chat-partner-presence']` query keys on save
- uses `savingRef` so its own write doesn't trigger a teardown

No change required. We will only confirm the dialog opens from the 3-dot menu (it already does via `setShowPrivacyDialog(true)`).

---

# Database

**No migration needed.** All required pieces already exist:

- `user_presence` table has `is_online`, `last_seen`, `status`
- `user_settings` has `last_seen_visibility`, `online_status_visibility`, `read_receipts_enabled`
- `get_user_presence_safe` RPC enforces all privacy rules server-side
- `upsert_my_chat_privacy` RPC handles writes
- Realtime publication already includes `user_presence` and `user_settings`

---

# Strict isolation guarantees

- **NovaChat**: not imported, not touched.
- **Groups**: not imported, not touched.
- **Profile / Feed / Movion / Bookshelf**: not imported, not touched.
- All edits are inside `src/components/chat/*` and `src/hooks/usePresenceEnhanced.ts`, both of which are exclusive to the Chats module.

# Acceptance criteria

1. Open a chat with another user who is online → header subtitle shows green-dot **"Online"** in realtime.
2. The other user closes the tab/app → within ≤30s the subtitle changes to **"Last seen just now"** then ticks up (`1m ago`, `2m ago`, ...) without page refresh.
3. The other user changes Privacy → "Last seen: Nobody" → my header subtitle disappears entirely (only the name shows) within ~1 second, no refresh.
4. The other user changes "Online status: Nobody" → green "Online" never appears for me even if they're active.
5. If I myself set both Last Seen and Online to Nobody (Give-and-Take) → I stop seeing anyone's status — empty subtitle for everyone.
6. If either side blocks the other → status is hidden immediately.
7. 3-dot → **View Profile** → instantly navigates in-app to `/profile/<username>` (no new tab, no reload).
8. 3-dot → **Privacy** → opens dialog; saving updates header pill of all viewers within ~1 second.
9. The word **"Offline"** never appears anywhere in the chat header.
10. NovaChat and Groups screens are visually and functionally unchanged.