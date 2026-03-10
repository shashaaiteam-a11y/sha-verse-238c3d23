import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const usePlaylists = () => {
  const { user } = useAuth();

  const { data: playlists, isLoading } = useQuery({
    queryKey: ['playlists', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { playlists, isLoading };
};

export const usePlaylist = (playlistId?: string) => {
  const { data: playlist, isLoading } = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: async () => {
      if (!playlistId) return null;
      
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', playlistId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!playlistId,
  });

  const { data: playlistItems } = useQuery({
    queryKey: ['playlist-items', playlistId],
    queryFn: async () => {
      if (!playlistId) return [];
      
      const { data, error } = await supabase
        .from('playlist_items')
        .select(`
          *,
          videos:video_id (
            id,
            title,
            thumbnail_url,
            views_count,
            duration,
            created_at,
            channels:channel_id (
              id,
              name,
              avatar_url
            )
          )
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!playlistId,
  });

  return { playlist, playlistItems, isLoading };
};

export const useCreatePlaylist = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, description, isPublic }: { 
      title: string; 
      description?: string; 
      isPublic?: boolean 
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          title,
          description,
          is_public: isPublic ?? false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist created');
    },
  });
};

export const useAddToPlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, videoId }: { playlistId: string; videoId: string }) => {
      // Get current max position
      const { data: items } = await supabase
        .from('playlist_items')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = items && items.length > 0 ? (items[0].position || 0) + 1 : 0;

      const { error } = await supabase
        .from('playlist_items')
        .insert({
          playlist_id: playlistId,
          video_id: videoId,
          position: nextPosition,
        });
      
      if (error) throw error;

      // Update video count
      await supabase
        .from('playlists')
        .update({ 
          video_count: nextPosition + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', playlistId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist-items'] });
      toast.success('Added to playlist');
    },
  });
};
