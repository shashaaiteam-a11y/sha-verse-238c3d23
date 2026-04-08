import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useChannels = (channelType: 'video' | 'books' = 'video') => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels', channelType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('channel_type', channelType)
        .order('subscribers_count', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createChannel = useMutation({
    mutationFn: async ({ 
      name, 
      description, 
      channelType: type,
      avatarFile, 
      bannerFile 
    }: { 
      name: string; 
      description?: string;
      channelType: 'video' | 'books';
      avatarFile?: File; 
      bannerFile?: File;
    }) => {
      if (!user) throw new Error('Not authenticated');

      let avatarUrl = null;
      let bannerUrl = null;

      if (avatarFile) {
        const path = `${user.id}/avatar_${Date.now()}_${avatarFile.name}`;
        const { error } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile);
        
        if (!error) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = data.publicUrl;
        }
      }

      if (bannerFile) {
        const path = `${user.id}/banner_${Date.now()}_${bannerFile.name}`;
        const { error } = await supabase.storage
          .from('avatars')
          .upload(path, bannerFile);
        
        if (!error) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          bannerUrl = data.publicUrl;
        }
      }

      const { data, error } = await supabase
        .from('channels')
        .insert({
          name,
          description,
          user_id: user.id,
          channel_type: type,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-channel'] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['my-author-channel'] });
      toast.success('Channel created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create channel: ' + error.message);
    },
  });

  return { channels, isLoading, createChannel };
};

export const useMyChannel = () => {
  const { user } = useAuth();
  
  const { data: channel, isLoading } = useQuery({
    queryKey: ['my-channel', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('user_id', user.id)
        .eq('channel_type', 'video')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { channel, isLoading };
};

export const useChannel = (channelId?: string) => {
  const { data: channel, isLoading } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      if (!channelId) return null;
      
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!channelId,
    refetchInterval: 3000, // Real-time updates every 3 seconds
  });

  const { data: videos } = useQuery({
    queryKey: ['channel-videos', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!channelId,
    refetchInterval: 3000, // Real-time updates every 3 seconds
  });

  return { channel, videos, isLoading };
};

export const useCreateChannel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      name, 
      description, 
      avatarFile, 
      bannerFile 
    }: { 
      name: string; 
      description?: string; 
      avatarFile?: File; 
      bannerFile?: File;
    }) => {
      if (!user) throw new Error('Not authenticated');

      let avatarUrl = null;
      let bannerUrl = null;

      if (avatarFile) {
        const path = `${user.id}/avatar_${Date.now()}_${avatarFile.name}`;
        const { error } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile);
        
        if (!error) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = data.publicUrl;
        }
      }

      if (bannerFile) {
        const path = `${user.id}/banner_${Date.now()}_${bannerFile.name}`;
        const { error } = await supabase.storage
          .from('avatars')
          .upload(path, bannerFile);
        
        if (!error) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          bannerUrl = data.publicUrl;
        }
      }

      const { data, error } = await supabase
        .from('channels')
        .insert({
          name,
          description,
          user_id: user.id,
          channel_type: 'video',
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-channel'] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Channel created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create channel: ' + error.message);
    },
  });
};

export const useChannelVideos = (channelId?: string) => {
  const { data: videos, isLoading } = useQuery({
    queryKey: ['channel-videos', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!channelId,
  });

  return { videos, isLoading };
};

export const useUpdateChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      channelId, 
      name, 
      description, 
      avatarUrl, 
      bannerUrl 
    }: { 
      channelId: string;
      name?: string; 
      description?: string; 
      avatarUrl?: string; 
      bannerUrl?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (name) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (avatarUrl) updates.avatar_url = avatarUrl;
      if (bannerUrl) updates.banner_url = bannerUrl;

      const { data, error } = await supabase
        .from('channels')
        .update(updates as any)
        .eq('id', channelId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-channel'] });
      queryClient.invalidateQueries({ queryKey: ['channel'] });
      toast.success('Channel updated!');
    },
  });
};

// Realtime channel updates hook
export const useChannelRealtime = (channelType: 'video' | 'books' = 'video') => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`channels-realtime-${channelType}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'channels',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['channels', channelType] });
        queryClient.invalidateQueries({ queryKey: ['my-channel'] });
        queryClient.invalidateQueries({ queryKey: ['channel'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'channel_subscriptions',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['channels', channelType] });
        queryClient.invalidateQueries({ queryKey: ['my-channel'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelType, queryClient]);
};
