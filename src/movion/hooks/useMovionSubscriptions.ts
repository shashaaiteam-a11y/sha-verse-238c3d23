import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UseMovionSubscriptionsProps {
  channelId: string;
}

export function useMovionSubscriptions({ channelId }: UseMovionSubscriptionsProps) {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════
  // 1️⃣ Check if user is subscribed
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!user || !channelId) return;

    const checkSubscription = async () => {
      try {
        const { data, error: err } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('channel_id', channelId)
          .single();

        if (err && err.code !== 'PGRST116') throw err;
        setIsSubscribed(!!data);
      } catch (err: any) {
        console.error('Error checking subscription:', err.message);
      }
    };

    checkSubscription();
  }, [user, channelId]);

  // ═══════════════════════════════════════════════════════════════
  // 2️⃣ Get subscriber count + Realtime updates
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!channelId) return;

    const getSubscriberCount = async () => {
      try {
        const { data, error: err } = await supabase
          .from('channels')
          .select('subscribers_count')
          .eq('id', channelId)
          .single();

        if (err) throw err;
        setSubscriberCount(data?.subscribers_count || 0);
      } catch (err: any) {
        console.error('Error getting subscriber count:', err.message);
      }
    };

    getSubscriberCount();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`channel:${channelId}:subscriber_count`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'channels',
          filter: `id=eq.${channelId}`,
        },
        (payload: any) => {
          console.log('✅ Subscriber count updated:', payload.new.subscribers_count);
          setSubscriberCount(payload.new.subscribers_count);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  // ═══════════════════════════════════════════════════════════════
  // 3️⃣ Subscribe function (with Optimistic UI)
  // ═══════════════════════════════════════════════════════════════
  const subscribe = useCallback(async () => {
    if (!user || !channelId) return;

    setIsLoading(true);
    setIsSubscribed(true);
    setSubscriberCount((prev) => prev + 1);

    try {
      const { error: err } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          channel_id: channelId,
        });

      if (err) throw err;
      console.log('✅ Subscribed successfully');
    } catch (err: any) {
      console.error('❌ Error subscribing:', err.message);
      setError(err.message);
      // Rollback on error
      setIsSubscribed(false);
      setSubscriberCount((prev) => prev - 1);
    } finally {
      setIsLoading(false);
    }
  }, [user, channelId]);

  // ═══════════════════════════════════════════════════════════════
  // 4️⃣ Unsubscribe function
  // ═══════════════════════════════════════════════════════════════
  const unsubscribe = useCallback(async () => {
    if (!user || !channelId) return;

    setIsLoading(true);
    setIsSubscribed(false);
    setSubscriberCount((prev) => prev - 1);

    try {
      const { error: err } = await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('channel_id', channelId);

      if (err) throw err;
      console.log('✅ Unsubscribed successfully');
    } catch (err: any) {
      console.error('❌ Error unsubscribing:', err.message);
      setError(err.message);
      // Rollback on error
      setIsSubscribed(true);
      setSubscriberCount((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  }, [user, channelId]);

  // ═══════════════════════════════════════════════════════════════
  // 5️⃣ Toggle subscribe/unsubscribe
  // ═══════════════════════════════════════════════════════════════
  const toggleSubscription = useCallback(async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  return {
    isSubscribed,
    subscriberCount,
    isLoading,
    error,
    toggleSubscription,
  };
}
