// Motion Boosts - Monetization hooks (independent module)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Boost } from '@/components/motion/types';

// Get boosts for a motion
export const useMotionBoosts = (motionId?: string) => {
  const queryClient = useQueryClient();

  const { data: boosts, isLoading } = useQuery({
    queryKey: ['motion-boosts', motionId],
    queryFn: async () => {
      if (!motionId) return [];
      
      const { data, error } = await supabase
        .from('creator_boosts')
        .select(`
          *,
          sender:sender_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('video_id', motionId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as Boost[];
    },
    enabled: !!motionId,
  });

  // Realtime: live boosts - jab koi boost kare to instantly screen par aaye
  useEffect(() => {
    if (!motionId) return;

    const channel = supabase
      .channel(`motion-boosts-${motionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'creator_boosts',
        filter: `video_id=eq.${motionId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['motion-boosts', motionId] });
        queryClient.invalidateQueries({ queryKey: ['highlighted-boosts', motionId] });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'creator_boosts',
        filter: `video_id=eq.${motionId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['motion-boosts', motionId] });
        queryClient.invalidateQueries({ queryKey: ['highlighted-boosts', motionId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [motionId, queryClient]);

  return { boosts, isLoading };
};

// Get boosts for a creator
export const useCreatorBoosts = (creatorId?: string) => {
  const { data: boosts, isLoading } = useQuery({
    queryKey: ['creator-boosts', creatorId],
    queryFn: async () => {
      if (!creatorId) return [];
      
      const { data, error } = await supabase
        .from('creator_boosts')
        .select(`
          *,
          sender:sender_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('channel_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as Boost[];
    },
    enabled: !!creatorId,
  });

  // Calculate totals
  const totalBoosts = boosts?.reduce((sum, b) => sum + b.amount_cents, 0) || 0;
  const boostCount = boosts?.length || 0;

  return { boosts, totalBoosts, boostCount, isLoading };
};

// Send a boost
export const useSendBoost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      motionId,
      creatorId,
      amountCents,
      message,
      boostTier,
    }: {
      motionId?: string;
      creatorId: string;
      amountCents: number;
      message?: string;
      boostTier: 'spark' | 'flame' | 'blaze' | 'supernova';
    }) => {
      if (!user) throw new Error('Not authenticated');

      const animationMap = {
        spark: 'sparkle',
        flame: 'fire',
        blaze: 'lightning',
        supernova: 'cosmic',
      };

      const { data, error } = await supabase
        .from('creator_boosts')
        .insert({
          video_id: motionId || null,
          sender_id: user.id,
          channel_id: creatorId,
          amount_cents: amountCents,
          message: message || null,
          boost_tier: boostTier,
          animation_type: animationMap[boostTier],
          is_highlighted: boostTier === 'supernova',
        })
        .select()
        .single();

      if (error) throw error;

      // Also add to revenue transactions
      await supabase.from('revenue_transactions').insert({
        channel_id: creatorId,
        video_id: motionId || null,
        type: 'boost',
        amount_cents: amountCents,
        description: `Boost from supporter`,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Boost sent! 🚀');
      queryClient.invalidateQueries({ queryKey: ['motion-boosts', variables.motionId] });
      queryClient.invalidateQueries({ queryKey: ['creator-boosts', variables.creatorId] });
    },
    onError: (error) => {
      toast.error('Failed to send boost: ' + error.message);
    },
  });
};

// Get recent highlighted boosts (for display on motion)
export const useHighlightedBoosts = (motionId?: string) => {
  const { data: highlights } = useQuery({
    queryKey: ['highlighted-boosts', motionId],
    queryFn: async () => {
      if (!motionId) return [];
      
      const { data, error } = await supabase
        .from('creator_boosts')
        .select(`
          *,
          sender:sender_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('video_id', motionId)
        .eq('is_highlighted', true)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as Boost[];
    },
    enabled: !!motionId,
  });

  return { highlights };
};
