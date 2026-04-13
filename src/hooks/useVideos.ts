import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Resolution configs for transcoding
const RESOLUTION_CONFIGS = [
  { name: '360p', width: 640, height: 360, bitrate: 800 },
  { name: '720p', width: 1280, height: 720, bitrate: 2500 },
  { name: '1080p', width: 1920, height: 1080, bitrate: 5000 },
];

export const useVideos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: videos, isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          channels:channel_id!inner (
            id,
            name,
            avatar_url,
            user_id,
            subscribers_count,
            channel_type
          )
        `)
        .eq('channels.channel_type', 'video')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: trendingVideos } = useQuery({
    queryKey: ['trending-videos'],
    queryFn: async () => {
      // First refresh trending scores via RPC
      await supabase.rpc('calculate_trending_scores');
      
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          channels:channel_id!inner (
            id,
            name,
            avatar_url,
            user_id,
            subscribers_count,
            channel_type
          )
        `)
        .eq('channels.channel_type', 'video')
        .order('trending_score', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
  });

  const incrementView = useMutation({
    mutationFn: async (videoId: string) => {
      // Insert into video_views — trigger auto-updates videos.views_count
      await supabase
        .from('video_views')
        .insert({ video_id: videoId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });

  return { videos, trendingVideos, isLoading, incrementView };
};

export const useVideo = (videoId?: string) => {
  const { data: video, isLoading } = useQuery({
    queryKey: ['video', videoId],
    queryFn: async () => {
      if (!videoId) return null;
      
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          channels:channel_id (
            id,
            name,
            avatar_url,
            user_id,
            subscribers_count,
            description
          )
        `)
        .eq('id', videoId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!videoId,
  });

  return { video, isLoading };
};

// Poll Mux for transcoding completion
const pollTranscodingStatus = async (videoId: string, assetId: string, playbackId: string) => {
  const maxAttempts = 60; // 5 minutes max
  let attempts = 0;

  const checkStatus = async () => {
    attempts++;
    if (attempts > maxAttempts) {
      console.log('Transcoding polling timeout');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('mux-transcode', {
        body: {
          action: 'check-status',
          assetId,
        },
      });

      if (error) {
        console.error('Error checking status:', error);
        setTimeout(checkStatus, 5000);
        return;
      }

      if (data?.status === 'ready') {
        // Complete transcoding
        await supabase.functions.invoke('mux-transcode', {
          body: {
            action: 'complete-transcoding',
            videoId,
            playbackId,
            duration: data.duration,
            assetId,
          },
        });
        console.log('Transcoding completed for video:', videoId);
      } else if (data?.status === 'preparing' || data?.status === 'waiting') {
        // Still processing, check again in 5 seconds
        setTimeout(checkStatus, 5000);
      } else if (data?.status === 'errored') {
        console.error('Mux transcoding failed');
        await supabase
          .from('videos')
          .update({ transcoding_status: 'failed' })
          .eq('id', videoId);
      }
    } catch (e) {
      console.error('Polling error:', e);
      setTimeout(checkStatus, 5000);
    }
  };

  // Start polling after a short delay
  setTimeout(checkStatus, 3000);
};

export const useUploadVideo = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      title, 
      description, 
      channelId, 
      videoFile, 
      thumbnailFile,
      duration,
      isShort,
      category
    }: { 
      title: string; 
      description?: string; 
      channelId: string; 
      videoFile: File; 
      thumbnailFile?: File;
      duration?: number;
      isShort?: boolean;
      category?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Upload video file
      const videoPath = `${user.id}/${Date.now()}_${videoFile.name}`;
      const { error: videoError } = await supabase.storage
        .from('videos')
        .upload(videoPath, videoFile);
      
      if (videoError) throw videoError;

      const { data: videoUrlData } = supabase.storage
        .from('videos')
        .getPublicUrl(videoPath);

      let thumbnailUrl = null;
      if (thumbnailFile) {
        const thumbPath = `${user.id}/${Date.now()}_thumb_${thumbnailFile.name}`;
        const { error: thumbError } = await supabase.storage
          .from('videos')
          .upload(thumbPath, thumbnailFile);
        
        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from('videos')
            .getPublicUrl(thumbPath);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      }

      // Create video record - set as READY immediately so video is playable
      const { data: video, error } = await supabase
        .from('videos')
        .insert({
          title,
          description,
          channel_id: channelId,
          video_url: videoUrlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          transcoding_status: 'ready', // Set to ready immediately - video is playable right away
          duration: duration ? Math.round(duration) : null,
          is_short: isShort || false,
          category: category || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Try Mux transcoding in background (optional - doesn't block upload)
      try {
        supabase.functions.invoke('mux-transcode', {
          body: {
            action: 'create-asset',
            videoId: video.id,
            videoUrl: videoUrlData.publicUrl,
          },
        }).then(({ data: muxData, error: muxError }) => {
          if (!muxError && muxData?.playbackId) {
            // Background poll for HLS version (optional quality improvement)
            pollTranscodingStatus(video.id, muxData.assetId, muxData.playbackId);
          }
        }).catch(console.error);
      } catch (e) {
        console.error('Mux transcoding skipped:', e);
      }

      // Create original quality entry
      await supabase.from('video_qualities').insert({
        video_id: video.id,
        resolution: 'original',
        video_url: videoUrlData.publicUrl,
        status: 'ready',
      });

      // Create transcoding job
      await supabase.from('transcoding_jobs').insert({
        video_id: video.id,
        status: 'pending',
        progress: 0,
      });

      // Create placeholder entries for each resolution
      for (const config of RESOLUTION_CONFIGS) {
        await supabase.from('video_qualities').insert({
          video_id: video.id,
          resolution: config.name,
          video_url: videoUrlData.publicUrl, // Will be updated after transcoding
          width: config.width,
          height: config.height,
          bitrate: config.bitrate,
          status: 'processing',
        });
      }

      return video;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['channel-videos'] });
      toast.success('Video uploaded! Transcoding will begin shortly.');
    },
    onError: (error) => {
      toast.error('Failed to upload video: ' + error.message);
    },
  });
};
