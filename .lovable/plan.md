
Goal: make WhatsApp-style unread badge reset work correctly in the Chats module so that when a user opens a chat, that chat’s unread badge immediately becomes 0, the total unread count drops instantly, and new incoming messages keep updating badges in realtime. Keep Chats fully independent from NovaChat and Groups.

## Root cause
Current reset logic is firing in the UI, but the database update is being blocked by security rules:

- `messages_update_policy` only allows `auth.uid() = sender_id`
- unread reset tries to update other users’ messages (`is_read = true`) when the recipient opens the chat
- result: badge queries still see `is_read = false`, so counts never reset

There is also duplicated “mark as read” logic across multiple hooks/components, which makes the behavior inconsistent.

## What to build

### 1. Add a secure backend unread-reset function
Create a database function for Chats only that safely marks incoming messages in one conversation as read for the current user.

Behavior:
- verify caller is a member of the conversation
- update only messages in that conversation where `sender_id != auth.uid()`
- set `is_read = true`
- set `is_delivered = true`
- set `conversation_members.last_read_at = now()` for that user/conversation
- return how many messages were updated

Why:
- fixes the current RLS failure
- gives one trusted reset path for all chat surfaces
- keeps read receipts and unread badges aligned

Also add a companion function for:
- `mark_all_conversations_read()`

This will support the existing “Mark all as read” action reliably.

### 2. Keep unread source-of-truth on conversation membership
Do not add cross-module counters or touch NovaChat/Groups tables.

Use:
- `conversation_members.last_read_at` as the authoritative “user has seen up to here” cursor
- `messages.is_read` for WhatsApp-like tick/read-receipt display

This gives the same user-facing behavior as an `unread_count` column, but avoids duplicate counter drift.

## Files to update

### Database / backend
Add migration for:
- secure function `mark_conversation_as_read(_conversation_id uuid)`
- secure function `mark_all_conversations_read()`
- optional helper function `get_conversation_unread_counts()` if batching is needed
- grant execute to authenticated users

No Groups or NovaChat schema changes.

### `src/services/RTChatService.ts`
Replace direct client-side `.from('messages').update(...)` unread reset logic with RPC calls to the secure backend function.

Update:
- `BadgeCountService.markConversationAsRead(...)`
- `BadgeCountService.markAllAsRead(...)`

Also improve error handling so unread reset failures are visible in logs and not silent.

### `src/hooks/useBadgeCount.ts`
Refactor badge hooks to align with the secure reset flow:

- `useMarkConversationRead`
  - call the new service method
  - invalidate:
    - `conversation-unread-badge`
    - `unread-badge`
    - `unread-counts-all`
    - `conversations`
    - current conversation messages if needed

- `useMarkAllConversationsRead`
  - call secure backend function
  - invalidate all related badge/message/conversation queries

- realtime listeners
  - keep Chats-only `messages` table listeners
  - add unique channel suffixes to satisfy project realtime stability rule

### `src/hooks/useMessagesRealtime.ts`
Centralize “open chat = mark read” behavior here.

Changes:
- keep one auto-read effect only
- when a conversation opens:
  - call secure `markConversationAsRead`
  - update unread counters immediately
  - refresh ticks/messages
- remove dependency on direct message-table update permissions

Also update realtime channel ID to use a unique suffix.

### `src/components/MessengerChat.tsx`
Clean up duplicated reset behavior.

Changes:
- remove the extra local effect that also calls `markConversationRead.mutate(conversationId)` on open if it duplicates `useMessagesRealtime`
- keep selection flow simple:
  - click chat
  - select conversation
  - chat opens
  - centralized hook resets unread instantly
- ensure conversation list and total badge both invalidate immediately after open

If needed:
- keep optimistic local disappearance of the clicked chat’s green badge while backend confirms

### `src/hooks/useConversations.ts`
Keep conversation list realtime, but align invalidation keys with the unread system.

Changes:
- invalidate `unread-counts-all` when new chat messages arrive
- use unique suffix on realtime channel name
- keep scope limited to Chats/messages only

## Final behavior screen-by-screen

### Screen 1: Chat List
- each 1-to-1 chat shows its own green unread badge
- total unread badge near “Chats” shows sum of all chat unread counts
- new incoming message:
  - chat badge increments instantly
  - total badge increments instantly
  - list reorders if last message changes

### Screen 2: Inside Chat
- user taps a chat
- secure backend reset runs immediately
- that chat’s unread badge becomes 0
- total unread sum decreases immediately
- incoming messages from the other user after that point start counting again normally
- read ticks update correctly

### Screen 3: Mark All as Read
- existing menu action uses secure backend function
- every chat badge resets to 0
- total badge resets to 0
- conversation list refreshes instantly

## Realtime rules
- Chats only
- listen only to `messages`
- no interaction with `group_messages`, Groups tables, or NovaChat tables
- all new/updated message events trigger badge refresh
- use unique realtime channel IDs with suffixes to avoid subscription collisions

## Out of scope
- NovaChat
- Groups
- Presence system error (`user_presence.is_online`) unless requested separately
- visual redesign of unrelated chat UI
- app icon OS badge integration outside the web app shell

## Acceptance criteria
1. Clicking an unread chat immediately removes that chat’s green badge.
2. Total unread badge decreases immediately on chat open.
3. New incoming messages increment both per-chat and total unread badges in realtime.
4. “Mark all as read” resets everything to 0 instantly.
5. Read receipts still work for direct chats.
6. No changes affect NovaChat or Groups.
7. No other modules’ UI or logic are touched.
