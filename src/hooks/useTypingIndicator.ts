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

export const useTypingIndicator = (conversationId: string | null) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // user_id -> display_name
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const channel = supabase.channel(`typing-${conversationId}`);

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
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  // Call this when user starts/stops typing
  const sendTypingEvent = useCallback(async (isTyping: boolean, displayName: string) => {
    if (!conversationId || !user?.id) return;

    await supabase.channel(`typing-${conversationId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        display_name: displayName,
        conversation_id: conversationId,
        is_typing: isTyping,
      } as TypingEvent,
    });
  }, [conversationId, user?.id]);

  // Smart typing handler - auto sends stop after 3 seconds of inactivity
  const handleUserTyping = useCallback((displayName: string) => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingEvent(true, displayName);
    }

    // Reset inactivity timer
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTypingEvent(false, displayName);
    }, 3000);
  }, [sendTypingEvent]);

  const stopTyping = useCallback((displayName: string) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingRef.current = false;
    sendTypingEvent(false, displayName);
  }, [sendTypingEvent]);

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
