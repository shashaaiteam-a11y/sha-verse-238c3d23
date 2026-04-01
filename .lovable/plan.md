

## Problem Analysis

The messenger already has most WhatsApp features implemented (ticks, read/unread, block, clear chat, mute, online/last seen). However, several gaps remain:

1. **Mute** - No duration options (8h/1w/Always), no `muted_until` column, no 🔕 icon in chat list
2. **Block (silent block)** - Currently blocked user sees "You can't send messages" which is WRONG. WhatsApp uses silent block: blocked person sees everything normal, messages stay at ✓ single tick, no error shown
3. **Chat list mute indicator** - Missing 🔕 icon for muted conversations

## Plan

### Step 1: Database Migration
Add `muted_until` column to `conversation_members`:
```sql
ALTER TABLE public.conversation_members 
  ADD COLUMN IF NOT EXISTS muted_until timestamp with time zone;
```

### Step 2: Fix Silent Block Behavior (`MessengerChat.tsx`)
- **Blocker side**: Keep current behavior (shows "You blocked this contact. Unblock?", typing bar hidden)
- **Blocked side**: Remove the "You can't send messages" state. Let them type and send normally. Messages will insert but never get `is_read = true` (stays at ✓ single tick). Hide online/last seen for blocked user
- Change `isChatBlocked` logic: only restrict UI for the blocker (`isOtherUserBlocked`), NOT for `isBlockedByOther`

### Step 3: Add Mute Duration Options (`ChatHeaderMenu.tsx`)
Replace single mute toggle with submenu offering:
- 8 hours
- 1 week  
- Always
- Unmute (if already muted)

Update `onMuteToggle` to accept duration parameter.

### Step 4: Show Mute Icon in Chat List (`MessengerChat.tsx`)
- Query `is_muted` for each conversation in the list
- Show 🔕 `BellOff` icon next to muted conversations
- Fetch mute status in `ConversationListItem`

### Step 5: Update Mute Logic (`MessengerChat.tsx`)
- Update `toggleMute` mutation to accept `muted_until` parameter
- Auto-unmute check: if `muted_until` has passed, treat as unmuted

### Files Changed
1. `src/components/MessengerChat.tsx` - Silent block fix, mute icon in list, mute duration
2. `src/components/chat/ChatHeaderMenu.tsx` - Mute duration submenu
3. `src/hooks/useMessages.ts` - No changes needed
4. Database migration - Add `muted_until` column

No other modules or features will be touched.

