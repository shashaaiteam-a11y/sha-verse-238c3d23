/**
 * ChatPresenceBridge - mounts globally (inside AuthProvider) so that:
 *   1. The current user is tracked online/offline app-wide (not only in /messages).
 *   2. Incoming messages are auto-marked as DELIVERED the moment the recipient's
 *      app receives the realtime INSERT — independently of whether they have
 *      opened that specific chat. This makes `delivered_at` happen earlier than
 *      `read_at` (which only stamps when the chat is actually opened).
 *
 * Renders nothing.
 */
import { useAuth } from '@/contexts/AuthContext';
import { usePresenceTracker } from '@/hooks/usePresenceEnhanced';
import { useMarkMessagesDelivered } from '@/hooks/useReadReceipts';

export const ChatPresenceBridge = () => {
  const { user } = useAuth();
  // Hooks internally no-op when there's no user, but guard for clarity.
  usePresenceTracker();
  useMarkMessagesDelivered();
  if (!user) return null;
  return null;
};
