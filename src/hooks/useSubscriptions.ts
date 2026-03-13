import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export const useSubscriptions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from('subscriptions')
        .select(`
          *,
          channels:channel_id (
            id,
            name,
            avatar_url,
            subscribers_count,
            description
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Real-time listener for subscriptions changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('public:subscriptions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['subscriptions', user.id] });
          queryClient.invalidateQueries({ queryKey: ['is-subscribed'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const { data: subscribedVideos } = useQuery({
    queryKey: ['subscribed-videos', user?.id],
    queryFn: async () => {
      if (!user || !subscriptions?.length) return [];

      const channelIds = subscriptions.map(s => s.channel_id);

      const { data, error } = await (supabase as any)
        .from('videos')
        .select(`
          *,
          channels:channel_id (
            id,
            name,
            avatar_url,
            user_id,
            subscribers_count
          )
        `)
        .in('channel_id', channelIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!subscriptions?.length,
  });

  return { subscriptions, subscribedVideos, isLoading };
};

export const useIsSubscribed = (channelId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isSubscribed } = useQuery({
    queryKey: ['is-subscribed', channelId, user?.id],
    queryFn: async () => {
      if (!user || !channelId) return false;

      const { data, error } = await (supabase as any)
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('channel_id', channelId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!channelId,
  });

  // Real-time listener for channel subscriber count changes
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`public:channels:id=eq.${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'channels',
          filter: `id=eq.${channelId}`
        },
        (payload) => {
          // Update the specific channel cache with new subscriber count
          queryClient.setQueryData(['channel', channelId], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              subscribers_count: payload.new.subscribers_count
            };
          });
          // Also invalidate to be sure
          queryClient.invalidateQueries({ queryKey: ['channel', channelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  return isSubscribed ?? false;
};

export const useToggleSubscription = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, isSubscribed }: { channelId: string; isSubscribed: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      if (isSubscribed) {
        // ✅ YouTube-Level Atomic Unsubscribe
        const { error } = await (supabase as any).rpc('unsubscribe_from_channel', {
          target_channel_id: channelId
        });
        if (error) throw error;
      } else {
        // ✅ YouTube-Level Atomic Subscribe
        const { error } = await (supabase as any).rpc('subscribe_to_channel', {
          target_channel_id: channelId
        });
        if (error) throw error;
      }
    },
    // Optimistic updates for instant UI feedback
    onMutate: async ({ channelId, isSubscribed }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['is-subscribed', channelId] });
      await queryClient.cancelQueries({ queryKey: ['channel', channelId] });

      // Snapshot current values
      const previousSubscribed = queryClient.getQueryData(['is-subscribed', channelId, user?.id]);
      const previousChannel = queryClient.getQueryData(['channel', channelId]);

      // Optimistically update subscription status
      queryClient.setQueryData(['is-subscribed', channelId, user?.id], !isSubscribed);

      // Optimistically update channel subscriber count
      if (previousChannel) {
        queryClient.setQueryData(['channel', channelId], (old: any) => ({
          ...old,
          subscribers_count: isSubscribed
            ? Math.max(0, (old?.subscribers_count || 0) - 1)
            : (old?.subscribers_count || 0) + 1
        }));
      }

      return { previousSubscribed, previousChannel };
    },
    onError: (err, { channelId }, context) => {
      // Rollback on error
      queryClient.setQueryData(['is-subscribed', channelId, user?.id], context?.previousSubscribed);
      queryClient.setQueryData(['channel', channelId], context?.previousChannel);
    },
    onSettled: (_, __, { isSubscribed }) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['is-subscribed'] });
      queryClient.invalidateQueries({ queryKey: ['channel'] });
      toast.success(isSubscribed ? 'Unsubscribed' : 'Subscribed!');
    },
  });
};
