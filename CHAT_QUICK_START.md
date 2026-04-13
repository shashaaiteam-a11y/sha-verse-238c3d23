# 🚀 Real-Time Chat - Quick Start Guide

## What's Available NOW

Your chat system now has WhatsApp-like features. Use these in your components:

### 1️⃣ Message Ticks (✓, ✓✓, ✓✓ Blue)
```typescript
import { useMessagesRealtime } from '@/hooks/useMessagesRealtime';

const MyChat = ({ conversationId }) => {
  const { messages, getMessageTicks, sendMessage } = useMessagesRealtime(conversationId);
  
  return messages?.map(msg => {
    const status = getMessageTicks(msg); // 'pending' | 'sent' | 'delivered' | 'read'
    return (
      <div key={msg.id}>
        {msg.content}
        <TickIndicator status={status} />
      </div>
    );
  });
};
```

### 2️⃣ Block User
```typescript
import { useBlockment } from '@/hooks/useBlockment';

const UserChat = ({ userId }) => {
  const { isBlocked, blockUser, unblockUser } = useBlockment(userId);
  
  const toggleBlock = async () => {
    if (isBlocked) {
      await unblockUser.mutateAsync(userId);
    } else {
      await blockUser.mutateAsync(userId);
    }
  };
  
  return <button onClick={toggleBlock}>{isBlocked ? 'Unblock' : 'Block'}</button>;
};
```

### 3️⃣ Online Status
```typescript
import { useChatPartnerPresence } from '@/hooks/usePresenceEnhanced';

const ChatHeader = ({ partnerId }) => {
  const { isOnline, lastSeen, statusText } = useChatPartnerPresence(partnerId);
  
  return <div>{statusText}</div>; // "Online" or "Last seen 2m ago"
};
```

### 4️⃣ Unread Message Badge
```typescript
import { useTotalUnreadBadge } from '@/hooks/useBadgeCount';

const App = () => {
  const unreadCount = useTotalUnreadBadge();
  
  return <span className="badge">{unreadCount}</span>;
};
```

### 5️⃣ Track Current User Online
```typescript
import { usePresenceTracker } from '@/hooks/usePresenceEnhanced';

const App = () => {
  usePresenceTracker(); // Call once in your main app
  // Now current user is marked online/offline automatically
};
```

---

## 🎨 Components Available

| Component | Use Case | Location |
|-----------|----------|----------|
| `<TickIndicator status={...} />` | Show message ticks | `chat/TickIndicator.tsx` |
| `<PresenceStatus isOnline={...} lastSeen={...} />` | Show online/last seen | `chat/PresenceStatus.tsx` |
| `<OnlineBadge isOnline={...} />` | Small dot indicator | `chat/PresenceStatus.tsx` |
| `<TypingIndicator username={...} />` | Typing animation | `chat/TypingIndicator.tsx` |
| `<ChatHeader ... />` | Chat header with all info | `chat/ChatHeader.tsx` |

---

## 📱 Recent Updates to MessengerChat

The main chat component (`MessengerChat.tsx`) has been updated with:
- ✅ Real-time message ticks
- ✅ Block enforcement
- ✅ Online status display
- ✅ Badge count integration
- ✅ Enhanced chat header
- ✅ Message operations (edit, delete)

---

## ⚡ Performance Tips

1. **Don't call hooks in loops** - Use batch operations
2. **Badge count polls every 5 seconds** - Add noise smoothing if needed
3. **Presence updates on visibility change** - Automatic, no action needed
4. **Use `useChatPartnerPresence` for single user** - More efficient

---

## 🐛 Debugging

### Check Message Ticks Not Updating?
```typescript
// Make sure messages table has these columns:
- is_read (boolean)
- is_delivered (boolean)
- status (varchar: pending|sent|delivered|read)
```

### Check Online Status Not Working?
```typescript
// Make sure user_presence table exists:
CREATE TABLE user_presence (
  user_id UUID PRIMARY KEY,
  is_online BOOLEAN,
  status VARCHAR,
  last_seen TIMESTAMP
);
```

### Check Block Not Silently Dropping Messages?
```typescript
// Make sure privacy middleware is called in RTChatService
// Messages should have sender_id, and it checks user_blocks table
```

---

## 📚 Full Documentation

See `REALTIME_CHAT_IMPLEMENTATION.md` for complete architecture, all features, and advanced usage.

---

## ✨ Example: Complete Chat Component

```typescript
import { useState } from 'react';
import { useMessagesRealtime } from '@/hooks/useMessagesRealtime';
import { useBlockment } from '@/hooks/useBlockment';
import { useChatPartnerPresence, usePresenceTracker } from '@/hooks/usePresenceEnhanced';
import { TickIndicator } from '@/components/chat/TickIndicator';
import { PresenceStatus } from '@/components/chat/PresenceStatus';
import { ChatHeader } from '@/components/chat/ChatHeader';

export const MyChat = ({ conversationId, partnerId, partnerInfo }) => {
  // Setup
  usePresenceTracker();
  const { messages, sendMessage, getMessageTicks } = useMessagesRealtime(conversationId);
  const { isBlocked, blockUser, unblockUser } = useBlockment(partnerId);
  const { isOnline, lastSeen, statusText } = useChatPartnerPresence(partnerId);

  return (
    <>
      {/* Header */}
      <ChatHeader
        otherUser={partnerInfo}
        isOnline={isOnline}
        lastSeen={lastSeen}
        isBlocked={isBlocked}
        isBlockedBy={false}
        isMuted={false}
        onBlock={async () => {
          if (isBlocked) {
            await unblockUser.mutateAsync(partnerId);
          } else {
            await blockUser.mutateAsync(partnerId);
          }
        }}
        onBack={() => console.log('back')}
        onCall={() => console.log('call')}
        onVideoCall={() => console.log('video')}
        onMute={() => console.log('mute')}
        onClearChat={() => console.log('clear')}
      />

      {/* Messages */}
      <div className="messages">
        {messages?.map(msg => (
          <div key={msg.id} className="message">
            <p>{msg.content}</p>
            {msg.sender_id === 'current-user-id' && (
              <TickIndicator status={getMessageTicks(msg)} />
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      {!isBlocked && (
        <input
          type="text"
          onKeyDown={async (e) => {
            if (e.key === 'Enter') {
              await sendMessage.mutateAsync({ content: e.currentTarget.value });
              e.currentTarget.value = '';
            }
          }}
        />
      )}
    </>
  );
};
```

---

**Everything is working. Just import and use! 🎉**
