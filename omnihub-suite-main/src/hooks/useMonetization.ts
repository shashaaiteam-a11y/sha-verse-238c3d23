import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const PARTNER_REQUIREMENTS = {
  subscribers: 1000,
  watchHours: 4000,
  shortsViews: 3000000,
};

export const useMonetization = (channelId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get channel monetization status
  const { data: monetization, isLoading: monetizationLoading } = useQuery({
    queryKey: ['channel-monetization', channelId],
    queryFn: async () => {
      if (!channelId) return null;
      const { data, error } = await supabase
        .from('channel_monetization')
        .select('*')
        .eq('channel_id', channelId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!channelId,
  });

  // Get channel stats for eligibility check
  const { data: channelStats } = useQuery({
    queryKey: ['channel-stats', channelId],
    queryFn: async () => {
      if (!channelId) return null;
      
      // Get channel info with subscriber count
      const { data: channel } = await supabase
        .from('channels')
        .select('subscribers_count')
        .eq('id', channelId)
        .single();

      // Calculate total watch hours from analytics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: analytics } = await supabase
        .from('video_analytics')
        .select('watch_time_seconds, views')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      const totalWatchSeconds = analytics?.reduce((acc, a) => acc + (a.watch_time_seconds || 0), 0) || 0;
      const totalWatchHours = totalWatchSeconds / 3600;
      
      // Get shorts views (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { data: shortsViews } = await supabase
        .from('videos')
        .select('views_count')
        .eq('channel_id', channelId)
        .eq('is_short', true)
        .gte('created_at', ninetyDaysAgo.toISOString());

      const totalShortsViews = shortsViews?.reduce((acc, v) => acc + (v.views_count || 0), 0) || 0;

      return {
        subscribers: channel?.subscribers_count || 0,
        watchHours: Math.round(totalWatchHours),
        shortsViews: totalShortsViews,
      };
    },
    enabled: !!channelId,
  });

  // Check partner eligibility
  const isEligible = channelStats ? (
    (channelStats.subscribers >= PARTNER_REQUIREMENTS.subscribers && 
     channelStats.watchHours >= PARTNER_REQUIREMENTS.watchHours) ||
    channelStats.shortsViews >= PARTNER_REQUIREMENTS.shortsViews
  ) : false;

  // Get revenue transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['revenue-transactions', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const { data, error } = await supabase
        .from('revenue_transactions' as any)
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!channelId,
  });

  // Get revenue summary
  const { data: revenueSummary } = useQuery({
    queryKey: ['revenue-summary', channelId],
    queryFn: async () => {
      if (!channelId) return { total: 0, adRevenue: 0, memberships: 0, superchats: 0, premium: 0 };
      
      const { data } = await supabase
        .from('revenue_transactions' as any)
        .select('type, amount_cents')
        .eq('channel_id', channelId);

      const txList = (data || []) as unknown as { type: string; amount_cents: number }[];
      const summary = {
        total: 0,
        adRevenue: 0,
        memberships: 0,
        superchats: 0,
        premium: 0,
      };

      txList.forEach(t => {
        summary.total += t.amount_cents;
        switch (t.type) {
          case 'ad_revenue': summary.adRevenue += t.amount_cents; break;
          case 'membership': summary.memberships += t.amount_cents; break;
          case 'superchat': summary.superchats += t.amount_cents; break;
          case 'premium_revenue': summary.premium += t.amount_cents; break;
        }
      });

      return summary;
    },
    enabled: !!channelId,
  });

  // Get membership tiers
  const { data: membershipTiers } = useQuery({
    queryKey: ['membership-tiers', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const { data, error } = await supabase
        .from('channel_membership_tiers' as any)
        .select('*')
        .eq('channel_id', channelId)
        .order('price_cents', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!channelId,
  });

  // Create membership tier
  const createTier = useMutation({
    mutationFn: async (tier: { name: string; price_cents: number; benefits: string[] }) => {
      if (!channelId) throw new Error('No channel');
      const { error } = await supabase
        .from('channel_membership_tiers' as any)
        .insert({ channel_id: channelId, ...tier });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers', channelId] });
      toast.success('Membership tier created');
    },
    onError: () => toast.error('Failed to create tier'),
  });

  // Request payout
  const requestPayout = useMutation({
    mutationFn: async (amount_cents: number) => {
      if (!channelId) throw new Error('No channel');
      const { error } = await supabase
        .from('payout_requests' as any)
        .insert({ channel_id: channelId, amount_cents });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payout requested');
      queryClient.invalidateQueries({ queryKey: ['channel-monetization', channelId] });
    },
    onError: () => toast.error('Failed to request payout'),
  });

  // Apply for Partner Program
  const applyForPartner = useMutation({
    mutationFn: async () => {
      if (!channelId || !isEligible) throw new Error('Not eligible');
      
      // Check if monetization record exists
      const { data: existing } = await supabase
        .from('channel_monetization')
        .select('id')
        .eq('channel_id', channelId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('channel_monetization')
          .update({ is_eligible: true })
          .eq('channel_id', channelId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('channel_monetization')
          .insert({ channel_id: channelId, is_eligible: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Welcome to the Partner Program!');
      queryClient.invalidateQueries({ queryKey: ['channel-monetization', channelId] });
    },
    onError: () => toast.error('Failed to apply'),
  });

  return {
    monetization,
    monetizationLoading,
    channelStats,
    isEligible,
    transactions,
    transactionsLoading,
    revenueSummary,
    membershipTiers,
    createTier,
    requestPayout,
    applyForPartner,
    PARTNER_REQUIREMENTS,
  };
};
