/**
 * useTypingIndicator - "Suhail is typing..." like WhatsApp/Instagram
 * Uses Supabase Broadcast (not postgres_changes) for ultra-fast delivery
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingEvent {
  user_id: string;
  display_name: string;
  conversation_id: string;
  is_typing: boolean;
}

interface UseTypingIndicatorOptions {
  disabled?: boolean;
}

export const useTypingIndicator = (
  conversationId: string | null,
  options?: UseTypingIndicatorOptions
) => {
  const { user } = useAuth();
  const { disabled = false } = options ?? {};
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // user_id -> display_name
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const channelRef = useRef<any>(null);

  const clearTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!conversationId || !user?.id || disabled) {
      setTypingUsers({});
      isTypingRef.current = false;
      clearTypingTimeout();
      return;
    }

    const channel = supabase.channel(`typing-${conversationId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }: { payload: TypingEvent }) => {
        if (payload.user_id === user.id) return; // Apna typing indicator ignore karo

        if (payload.is_typing) {
          setTypingUsers(prev => ({
            ...prev,
            [payload.user_id]: payload.display_name,
          }));
        } else {
          setTypingUsers(prev => {
            const next = { ...prev };
            delete next[payload.user_id];
            return next;
          });
        }
      })
      .subscribe();

    return () => {
      // 🚀 Send stop typing before unmounting (polite cleanup)
      if (isTypingRef.current && user?.id) {
        void channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user_id: user.id,
            display_name: 'User',
            conversation_id: conversationId,
            is_typing: false,
          } as TypingEvent,
        });
      }
      clearTypingTimeout();
      setTypingUsers({});
      isTypingRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, disabled, user?.id, clearTypingTimeout]);

  // Call this when user starts/stops typing
  const sendTypingEvent = useCallback(async (isTyping: boolean, displayName: string) => {
    if (!conversationId || !user?.id || disabled || !channelRef.current) return;

    await channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        display_name: displayName,
        conversation_id: conversationId,
        is_typing: isTyping,
      } as TypingEvent,
    });
  }, [conversationId, disabled, user?.id]);

  // Smart typing handler - auto sends stop after 3 seconds of inactivity
  const handleUserTyping = useCallback((displayName: string) => {
    if (disabled || !displayName.trim()) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      void sendTypingEvent(true, displayName);
    }

    // Reset inactivity timer
    clearTypingTimeout();

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      void sendTypingEvent(false, displayName);
    }, 3000);
  }, [disabled, sendTypingEvent, clearTypingTimeout]);

  const stopTyping = useCallback((displayName: string) => {
    if (disabled || !displayName.trim()) return;

    clearTypingTimeout();

    if (!isTypingRef.current) return;

    isTypingRef.current = false;
    void sendTypingEvent(false, displayName);
  }, [disabled, sendTypingEvent, clearTypingTimeout]);

  useEffect(() => {
    return () => {
      clearTypingTimeout();
    };
  }, [clearTypingTimeout]);

  // Build display text: "Suhail is typing..." or "Suhail and Rahul are typing..."
  const typingText = (() => {
    const names = Object.values(typingUsers);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]} and ${names.length - 1} others are typing...`;
  })();

  return {
    typingUsers,
    typingText,
    isAnyoneTyping: Object.keys(typingUsers).length > 0,
    handleUserTyping,
    stopTyping,
  };
};
