import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMovionRealtime } from '@/hooks/useMovionRealtime';

export function useMovionSubscriptions({ channelId }: { channelId: string }) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  useMovionRealtime();
  const queryKey = ['is-subscribed', channelId, userId];
  const mutationKey = ['movion-subscription', channelId, userId];
  const subscription = useQuery({
    queryKey, enabled: !!userId && !!channelId,
    queryFn: async () => {
      const { data, error } = await supabase.from('subscriptions').select('id')
        .eq('user_id', userId!).eq('channel_id', channelId).maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  const channel = useQuery({
    queryKey: ['movion-subscriber-count', channelId], enabled: !!channelId,
    queryFn: async () => {
      const { data, error } = await supabase.from('channels').select('subscribers_count,user_id')
        .eq('id', channelId).single();
      if (error) throw error;
      return data;
    },
  });
  const pending = useIsMutating({ mutationKey }) > 0;
  const mutation = useMutation({
    mutationKey,
    mutationFn: async (wasSubscribed: boolean) => {
      if (!userId) throw new Error('Please sign in to subscribe');
      if (channel.data?.user_id === userId) throw new Error('This is your channel');
      const { error } = await supabase.rpc(wasSubscribed ? 'unsubscribe_from_channel' : 'subscribe_to_channel', { target_channel_id: channelId });
      if (error) throw error;
      return !wasSubscribed;
    },
    onSuccess: (subscribed) => { queryClient.setQueryData(queryKey, subscribed); },
    onSettled: () => {
      for (const key of ['is-subscribed','movion-subscriber-count','subscriptions','subscribed-videos','channel','my-channel','video']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
  return {
    isSubscribed: !!userId && (subscription.data ?? false),
    subscriberCount: channel.data?.subscribers_count ?? 0,
    isOwnChannel: !!userId && channel.data?.user_id === userId,
    isLoading: pending || (!!userId && subscription.isPending) || channel.isPending,
    error: mutation.error?.message || subscription.error?.message || channel.error?.message || null,
    toggleSubscription: async () => {
      if (queryClient.isMutating({ mutationKey })) return undefined;
      if (userId && (!subscription.isSuccess || !channel.isSuccess)) throw new Error('Subscription status unavailable. Please retry.');
      return mutation.mutateAsync(subscription.data ?? false);
    },
  };
}
