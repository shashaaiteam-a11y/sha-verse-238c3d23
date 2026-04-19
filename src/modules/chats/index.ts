/**
 * Chats Module - Public API
 * 
 * MODULE ISOLATION RULES:
 * 1. Other modules MUST NOT import from src/modules/chats/* directly.
 *    They should only consume the chats module via routing (i.e. /messages route).
 * 2. This module MAY import from @/shared/* and @/integrations/* and @/contexts/*.
 * 3. This module MUST NOT import from any other src/modules/<name>/*.
 *
 * Owned by Chats:
 *   - MessengerChat, ChatDialog, ChatUserSearchDialog, MessagesDrawer
 *   - ChatLayout, ChatHeader, ChatHeaderMenu, ChatTypingBar, TickIndicator,
 *     TypingIndicator, PresenceStatus, VideoCallDialog
 *   - hooks: useMessages, useMessagesRealtime, useConversations, useReadReceipts,
 *     useTypingIndicator, useMessagingPermissions, useBlockment, useBadgeCount,
 *     usePresence, usePresenceEnhanced
 */

export { default as Messages } from './pages/Messages';
