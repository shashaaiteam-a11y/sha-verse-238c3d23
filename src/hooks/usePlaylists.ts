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
      return data || [];
    },
    enabled: !!user,
  });

  return { playlists, isLoading };
};

export const usePlaylistVideos = (playlistId?: string) => {
  const { data: videos, isLoading } = useQuery({
    queryKey: ['playlist-videos', playlistId],
    queryFn: async () => {
      if (!playlistId) return [];
      
      const { data, error } = await supabase
        .from('playlist_videos')
        .select(`
          id,
          position,
          added_at,
          videos:video_id (
            id,
            title,
            thumbnail_url,
            video_url,
            views_count,
            duration,
            is_short,
            category,
            channel_id,
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
      return data?.filter(item => item.videos) || [];
    },
    enabled: !!playlistId,
  });

  return { videos, isLoading };
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
          description: description || null,
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

export const useDeletePlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playlistId: string) => {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist deleted');
    },
  });
};

export const useAddToPlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, videoId }: { playlistId: string; videoId: string }) => {
      const { data: existing } = await supabase
        .from('playlist_videos')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existing && existing.length > 0 ? (existing[0].position + 1) : 0;

      const { error } = await supabase
        .from('playlist_videos')
        .insert({
          playlist_id: playlistId,
          video_id: videoId,
          position: nextPosition,
        });
      
      if (error) throw error;

      await supabase
        .from('playlists')
        .update({ video_count: nextPosition + 1, updated_at: new Date().toISOString() })
        .eq('id', playlistId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist-videos'] });
      toast.success('Added to playlist');
    },
  });
};

export const useRemoveFromPlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, videoId }: { playlistId: string; videoId: string }) => {
      const { error } = await supabase
        .from('playlist_videos')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('video_id', videoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist-videos'] });
      toast.success('Removed from playlist');
    },
  });
};
