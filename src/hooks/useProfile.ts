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

      // Sensitive PII columns (phone, birthdate, gender, relationship_status,
      // phone_number) are protected at the column level. They are fetched
      // separately through a privacy-aware function so they are only revealed
      // to the owner or to users allowed by the profile's privacy settings.
      const NON_SENSITIVE_COLUMNS =
        'id, username, display_name, bio, avatar_url, cover_url, location, website, created_at, updated_at, work, education, hometown, current_city, facebook_url, instagram_url, twitter_url, hobbies, about_me, privacy, provider, last_login, is_verified, is_deactivated, deactivated_at';

      const { data, error } = await supabase
        .from('profiles')
        .select(NON_SENSITIVE_COLUMNS)
        .eq('id', targetUserId)
        .single();

      if (error) throw error;

      let privateFields: Record<string, any> = {};
      const { data: priv } = await supabase.rpc('get_profile_private_fields', {
        _profile_id: targetUserId,
      });
      if (priv && typeof priv === 'object') {
        privateFields = priv as Record<string, any>;
      }

      return { ...(data as Record<string, any>), ...privateFields };
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
