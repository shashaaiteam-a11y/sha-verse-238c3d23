import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export const useProfile = (userId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      
      // Sensitive fields (relationship_status, phone, gender, birthdate, phone_number)
      // are not directly readable for privacy reasons; they come from a gated RPC.
      const { data, error } = await supabase
        .from('profiles')
        .select(SAFE_PROFILE_COLUMNS)
        .eq('id', targetUserId)
        .single();
      
      if (error) throw error;

      let merged: any = data;
      try {
        const { data: priv } = await (supabase as any).rpc('get_profile_private_fields', {
          _profile_id: targetUserId,
        });
        if (priv && typeof priv === 'object') {
          merged = { ...(data as any), ...priv };
        }
      } catch {
        // If the gated fields can't be loaded, keep the rest of the profile intact.
      }
      return merged;
    },
    enabled: !!targetUserId,
    // Keep profile data fresh with realtime updates
    staleTime: 1000 * 30, // 30 seconds
  });

  // Subscribe to realtime profile updates
  useEffect(() => {
    if (!targetUserId) return;

    const channelId = `profile-${targetUserId}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${targetUserId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['profile', targetUserId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, queryClient]);

  return { profile, isLoading };
};
