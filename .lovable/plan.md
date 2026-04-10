

## WhatsApp-Style Complete Messaging System Enhancement

### Current State
- Silent block trigger (`silent_block_message`) already drops messages at DB level -- working correctly
- Blocked user sees normal chat UI and can "send" messages -- working correctly  
- Blocked user sees single grey tick -- working correctly
- Typing indicator hook exists (`useTypingIndicator.ts`) but is NOT connected to MessengerChat
- Tick system is missing the **double grey tick** (delivered) state -- only has single grey (sent) and blue double (read)
- No `is_delivered` column exists in messages table

### What Needs to Be Done

**1. Database: Add `is_delivered` column to messages table**
- Add `is_delivered BOOLEAN DEFAULT false` to the `messages` table via migration
- This enables the three-stage tick system: sent → delivered → read

**2. Fix Tick System in `MessengerChat.tsx` (renderMessageTicks)**
Current logic only handles 2 states. Update to 3 states:
- `isBlockedByOther` → single grey tick ✓ (always)
- `message.is_read` → double blue tick ✓✓ (blue)
- `message.is_delivered` → double grey tick ✓✓ (grey)
- Default → single grey tick ✓ (sent, not delivered)

**3. Auto-mark messages as delivered (useReadReceipts.ts)**
- When a user loads/opens the conversation list (not the specific chat), mark incoming messages as `is_delivered = true`
- This simulates "message reached device" behavior
- Create a new `useMarkMessagesDelivered` hook that runs on app load for all conversations

**4. Connect Typing Indicator to MessengerChat**
- Import and use `useTypingIndicator` in `MessengerChat.tsx`
- Show "typing..." text below the user name in the chat header (replacing online/last seen status when someone is typing)
- Connect `ChatTypingBar` input onChange to `handleUserTyping`
- Block typing indicator display when `isBlockedByOther` is true (blocked user should not see "typing...")

**5. Block typing broadcasts for blocked users**
- In `useTypingIndicator`, do not send typing events if the user is blocked (to avoid leaking activity)
- In the chat UI, suppress typing indicator display when `isBlockedByOther` is true

### Files Changed (Messenger module only)
- `src/components/MessengerChat.tsx` -- tick system, typing indicator integration
- `src/hooks/useReadReceipts.ts` -- add `useMarkMessagesDelivered` hook
- `src/components/chat/ChatTypingBar.tsx` -- pass typing callback prop
- New migration SQL -- add `is_delivered` column

### Files NOT Changed
- No other modules (Home, Bookshelf, Groups, Profile, Motion)
- No global UI components

