// Creator Dashboard Hooks - Independent module for creator analytics
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CreatorBadge, CreatorEarnings } from '@/components/motion/types';
import { compressVideo } from '@/lib/media/compressVideo';
import { compressImage } from '@/lib/media/compressImage';

// Get creator's channel
export const useMyCreatorChannel = () => {
  const { user } = useAuth();

  const { data: channel, isLoading } = useQuery({
    queryKey: ['my-creator-channel', user?.id],
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

// Get creator badge
export const useCreatorBadge = (channelId?: string) => {
  const { data: badge, isLoading } = useQuery({
    queryKey: ['creator-badge', channelId],
    queryFn: async () => {
      if (!channelId) return null;
      
      const { data, error } = await supabase
        .from('creator_badges')
        .select('*')
        .eq('channel_id', channelId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      
      return {
        ...data,
        badge_level: data.badge_level as CreatorBadge['badge_level'],
        achievements: (data.achievements || []) as unknown as CreatorBadge['achievements'],
      } as CreatorBadge;
    },
    enabled: !!channelId,
  });

  return { badge, isLoading };
};

// Get creator earnings
export const useCreatorEarnings = (channelId?: string) => {
  const { data: earnings, isLoading } = useQuery({
    queryKey: ['creator-earnings', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      const { data, error } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('channel_id', channelId)
        .order('period_end', { ascending: false })
        .limit(12);
      
      if (error) throw error;
      return data as CreatorEarnings[];
    },
    enabled: !!channelId,
  });

  // Calculate totals
  const totalEarnings = earnings?.reduce((sum, e) => 
    sum + e.ad_revenue_cents + e.boost_revenue_cents + e.membership_revenue_cents, 0
  ) || 0;

  const totalViews = earnings?.reduce((sum, e) => sum + e.total_views, 0) || 0;
  const totalWatchMinutes = earnings?.reduce((sum, e) => sum + e.total_watch_minutes, 0) || 0;

  return { earnings, totalEarnings, totalViews, totalWatchMinutes, isLoading };
};

// Get creator's motions
export const useCreatorMotions = (channelId?: string) => {
  const { data: motions, isLoading } = useQuery({
    queryKey: ['creator-motions', channelId],
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

  return { motions, isLoading };
};

// Get creator stats summary
export const useCreatorStats = (channelId?: string) => {
  const queryClient = useQueryClient();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['creator-stats', channelId],
    queryFn: async () => {
      if (!channelId) return null;
      
      // Get channel info
      const { data: channel } = await supabase
        .from('channels')
        .select('subscribers_count')
        .eq('id', channelId)
        .single();

      // Get total views from all videos
      const { data: videos } = await supabase
        .from('videos')
        .select('views_count, likes_count')
        .eq('channel_id', channelId);

      // Get total boosts
      const { data: boosts } = await supabase
        .from('creator_boosts')
        .select('amount_cents')
        .eq('channel_id', channelId);

      const totalViews = videos?.reduce((sum, v) => sum + (v.views_count || 0), 0) || 0;
      const totalReacts = videos?.reduce((sum, v) => sum + (v.likes_count || 0), 0) || 0;
      const totalBoosts = boosts?.reduce((sum, b) => sum + b.amount_cents, 0) || 0;
      const motionCount = videos?.length || 0;

      return {
        followers: channel?.subscribers_count || 0,
        totalViews,
        totalReacts,
        totalBoosts,
        motionCount,
      };
    },
    enabled: !!channelId,
  });

  // Realtime: creator stats live - views, subscribers, boosts update instantly
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`creator-stats-${channelId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'channels',
        filter: `id=eq.${channelId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['creator-stats', channelId] });
        queryClient.invalidateQueries({ queryKey: ['my-creator-channel'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'videos',
        filter: `channel_id=eq.${channelId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['creator-stats', channelId] });
        queryClient.invalidateQueries({ queryKey: ['creator-motions', channelId] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'creator_boosts',
        filter: `channel_id=eq.${channelId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['creator-stats', channelId] });
        queryClient.invalidateQueries({ queryKey: ['creator-earnings', channelId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'creator_badges',
        filter: `channel_id=eq.${channelId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['creator-badge', channelId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  return { stats, isLoading };
};

// Create creator channel
export const useCreateCreatorChannel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
    }: {
      name: string;
      description?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          channel_type: 'video',
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial badge
      await supabase.from('creator_badges').insert({
        channel_id: channel.id,
        badge_level: 'newcomer',
      });

      return channel;
    },
    onSuccess: () => {
      toast.success('Creator channel created!');
      queryClient.invalidateQueries({ queryKey: ['my-creator-channel'] });
    },
    onError: (error) => {
      toast.error('Failed to create channel: ' + error.message);
    },
  });
};

// Upload motion
export const useUploadMotion = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      title,
      description,
      videoFile,
      thumbnailFile,
      category,
      isQuick,
      duration,
    }: {
      channelId: string;
      title: string;
      description?: string;
      videoFile: File;
      thumbnailFile?: File;
      category?: string;
      isQuick?: boolean;
      duration?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Compress video before upload (size-thresholded, safe fallback)
      const compressedVideo = await compressVideo(videoFile, {
        onLargeFileWarning: () =>
          toast.info('Large video — compressing before upload, please wait…'),
      });

      // Upload video
      const videoPath = `${user.id}/${Date.now()}_${compressedVideo.name}`;
      const { error: videoError } = await supabase.storage
        .from('videos')
        .upload(videoPath, compressedVideo);
      
      if (videoError) throw videoError;

      const { data: videoUrlData } = supabase.storage
        .from('videos')
        .getPublicUrl(videoPath);

      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (thumbnailFile) {
        const thumb = await compressImage(thumbnailFile);
        const thumbPath = `${user.id}/${Date.now()}_thumb_${thumb.name}`;
        const { error: thumbError } = await supabase.storage
          .from('videos')
          .upload(thumbPath, thumb);
        
        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from('videos')
            .getPublicUrl(thumbPath);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      }

      // Create video record
      const { data: motion, error } = await supabase
        .from('videos')
        .insert({
          channel_id: channelId,
          title,
          description: description || null,
          video_url: videoUrlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          category: category || 'Entertainment',
          is_short: isQuick || false,
          duration: duration ? Math.round(duration) : null,
          transcoding_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Update badge motion count (owner-scoped RPC; direct updates are blocked by a DB guard)
      const { error: badgeError } = await supabase.rpc('increment_creator_badge_motions', {
        _channel_id: channelId,
      });
      if (badgeError) {
        console.error('Failed to update creator badge motion count', badgeError);
      }


      return motion;
    },
    onSuccess: () => {
      toast.success('Motion uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['creator-motions'] });
      queryClient.invalidateQueries({ queryKey: ['motions'] });
    },
    onError: (error) => {
      toast.error('Failed to upload: ' + error.message);
    },
  });
};

// Delete motion
export const useDeleteMotion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (motionId: string) => {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', motionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Motion deleted');
      queryClient.invalidateQueries({ queryKey: ['creator-motions'] });
      queryClient.invalidateQueries({ queryKey: ['motions'] });
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });
};
