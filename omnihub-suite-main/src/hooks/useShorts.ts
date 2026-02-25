import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useShorts = () => {
  const queryClient = useQueryClient();

  const { data: shorts, isLoading } = useQuery({
    queryKey: ['shorts'],
    queryFn: async () => {
      const { data, error } = await supabase
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
        .eq('is_short', true)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  // Realtime: naye shorts aate hi instantly feed me dikhe
  useEffect(() => {
    const channel = supabase
      .channel('shorts-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'videos',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['shorts'] });
        queryClient.invalidateQueries({ queryKey: ['long-videos'] });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'videos',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['shorts'] });
        queryClient.invalidateQueries({ queryKey: ['long-videos'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { shorts, isLoading };
};

export const useLongVideos = (category?: string) => {
  const { data: videos, isLoading } = useQuery({
    queryKey: ['long-videos', category],
    queryFn: async () => {
      let query = supabase
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
        .eq('is_short', false)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (category && category !== 'All') {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  return { videos, isLoading };
};
