Goal (implement all the plan with realtime working features including rls policy, sql etc.)

Polish the Chats module header (3-dot menu) to match WhatsApp behavior, and make sure the Chat Privacy dialog is genuinely realtime end-to-end. Strictly Chats-only — no NovaChat, no Groups, no other modules touched.

---

## What you're seeing right now (from the screenshot)

In `src/components/chat/ChatHeader.tsx`, the 3-dot menu currently shows three flat mute rows:

- Mute for 8 hours
- Mute for 1 week
- Mute always

And:

- "View Profile" opens a new browser tab via `window.open(...)` instead of in-app navigation.
- There is no "Unmute" entry when the chat is already muted.

Privacy dialog (`ChatPrivacyDialog.tsx`) already calls the secure `upsert_my_chat_privacy` RPC and subscribes to its own `user_settings` row, but several presence views still need to refresh instantly when *that* dialog saves.

---

## Changes (Chats module only)

### 1. `src/components/chat/ChatHeader.tsx` — menu cleanup

**View Profile**

- Replace `window.open('/profile/${username}', '_blank')` with in-app navigation using `useNavigate()` from `react-router-dom`:
  ```ts
  navigate(`/profile/${otherUser.username}`)
  ```
- Closes the menu, instantly takes the user to the friend's profile page (no new tab).

**Mute → single entry with submenu**

- Remove the three flat `Mute for 8 hours / 1 week / always` items.
- Add ONE entry:
  - If `isMuted === false` → "Mute notifications" (uses `DropdownMenuSub` + `DropdownMenuSubTrigger` + `DropdownMenuSubContent`) which expands into:
    - Mute for 8 hours
    - Mute for 1 week
    - Mute always
  - If `isMuted === true` → "Unmute notifications" (single direct item, no submenu) → calls a new `onUnmute` handler.
- Add `onUnmute: () => void` to `ChatHeaderProps`.

This matches WhatsApp exactly: one row, expands into durations; flips to "Unmute" when active.

### 2. `src/components/MessengerChat.tsx` — wire unmute + ensure realtime mute state

- Pass `onUnmute={() => unmuteConversation.mutate()}` to `<ChatHeader>` (the mutation already exists at lines 146–160).
- Add a realtime subscription on `conversation_members` for the current `(conversationId, user.id)` row so `isMuted` updates instantly across tabs/devices when muted/unmuted (uses unique channel suffix per project rules):
  ```ts
  supabase.channel(`chat-mute-${conversationId}-${user.id}-${suffix}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'conversation_members',
      filter: `conversation_id=eq.${conversationId}`,
    }, () => queryClient.invalidateQueries({ queryKey: ['chat-muted', conversationId, user.id] }))
    .subscribe();
  ```
- Cleanup with `removeChannel` on unmount.

### 3. `src/components/chat/ChatPrivacyDialog.tsx` — confirm true realtime

Already wired through `upsert_my_chat_privacy` RPC + a self-realtime listener on `user_settings`. Two small reliability fixes:

- The current effect re-runs every time `saving` flips, which tears down the channel mid-save. Move `saving` out of the dependency array and use a ref instead so the live channel persists across save cycles.
- After a successful save, invalidate the open chat's presence queries so the *header presence pill* (Online / last seen) immediately reflects the user's new visibility choices, e.g.:
  ```ts
  queryClient.invalidateQueries({ queryKey: ['user-presence'] });
  ```
  (Chats hooks only — NovaChat / Groups never use this key.)

### 4. `src/hooks/usePresenceEnhanced.ts` — already has multi-channel realtime

No structural change needed; verified it already listens to:

- target `user_presence`
- target `user_settings`
- viewer `user_settings`
- `user_blocks`

So when a user changes Last Seen / Online Status visibility in the dialog, every chat partner viewing them sees the header pill update within ~1 frame without refresh. No edits required here unless verification shows a bug.

---

## Database

No schema changes needed:

- `conversation_members.is_muted` and `muted_until` already exist (migrations `20260330124533_*` and `20260401185025_*`).
- Privacy RPCs (`upsert_my_chat_privacy`, `get_user_presence_safe`) already exist.
- Realtime publication already includes `user_settings`, `user_presence`, `messages`, `conversation_members` from prior work.

If the `conversation_members` table is not yet in the realtime publication for UPDATE events, add a tiny migration:

```sql
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
```

(only runs the ADD if not already present, wrapped in a guard).

No new RLS policies required — users already control only their own `conversation_members` row, and `is_muted`/`muted_until` updates are restricted by the existing self-row policy.

---

## Final behavior

### 3-dot menu (single chat)

- **View Profile** → in-app navigate to `/profile/<username>` instantly.
- **Privacy** → opens Chat Privacy dialog (realtime).
- **Mute notifications** ▸ submenu (8 hours / 1 week / Always) — only shown when chat is not muted.
- **Unmute notifications** — only shown when chat is currently muted; one click restores notifications.
- **Clear chat** — unchanged.
- **Block / Unblock user** — unchanged.

### Privacy dialog (realtime)

- Open dialog → loads current Last Seen / Online Status / Read Receipts via `user_settings`.
- Change settings on Device A → Device B's open dialog reflects the change live (already wired, made more robust).
- Save settings → every chat partner currently viewing this user sees their header presence pill (Online / Last seen X) update within seconds, with no refresh, enforced server-side by `get_user_presence_safe` (Give-and-Take rule, block check, contacts vs everyone vs nobody).

### Mute (realtime)

- Mute on Device A → header on Device B flips to "Unmute notifications" instantly.
- Unmute on Device A → header on Device B flips back to "Mute notifications" submenu.
- Auto-expiry (8h / 1w) handled by existing `muted_until` check (`new Date(muted_until) > new Date()`); no changes needed.

---

## Strict isolation guarantees

- Files touched: only
  - `src/components/chat/ChatHeader.tsx`
  - `src/components/MessengerChat.tsx` (Chats-owned)
  - `src/components/chat/ChatPrivacyDialog.tsx`
  - optional 1-line migration to ensure `conversation_members` is in realtime publication
- Zero edits to: NovaChat, Groups, Movion, Bookshelf, Profile, Home, Posts, Stories, Reactions, Ads.
- Zero changes to: `group_members`, `group_messages`, NovaChat tables, or any other module's hooks/UI.
- All new realtime channels follow the project mandate: unique 6-char suffix appended to channel ID to prevent subscribe collisions.

---

## Acceptance criteria

1. 3-dot menu shows exactly one mute row at a time:
  - "Mute notifications" with submenu (8h / 1w / Always) when not muted.
  - "Unmute notifications" (no submenu) when muted.
2. Clicking any duration mutes immediately; the row flips to "Unmute notifications" without refresh.
3. Clicking Unmute restores the submenu state without refresh.
4. View Profile navigates inside the app (no new browser tab).
5. Privacy dialog saves via secure RPC; changes propagate to other open clients (own dialog + chat-partner header) within ~1s.
6. NovaChat, Groups, and all other modules are visually and functionally untouched.