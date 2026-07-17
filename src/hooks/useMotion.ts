// Motion Module Hooks - Independent from other modules
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Motion, MotionFilter, MotionCategory } from '@/components/motion/types';

// Fetch all motions with optional filtering
export const useMotions = (filter?: MotionFilter) => {
  const { data: motions, isLoading } = useQuery({
    queryKey: ['motions', filter],
    queryFn: async () => {
      let query = supabase
        .from('videos')
        .select(`
          *,
          channels:channel_id!inner (
            id,
            name,
            avatar_url,
            user_id,
            subscribers_count,
            description,
            channel_type
          )
        `)
        .eq('channels.channel_type', 'video');

      // Apply filters
      if (filter?.category && filter.category !== 'All') {
        query = query.eq('category', filter.category);
      }
      if (filter?.creatorId) {
        query = query.eq('channel_id', filter.creatorId);
      }
      if (filter?.isShort !== undefined) {
        query = query.eq('is_short', filter.isShort);
      }
      if (filter?.searchQuery) {
        query = query.ilike('title', `%${filter.searchQuery}%`);
      }

      // Apply sorting
      if (filter?.sortBy === 'popular') {
        query = query.order('views_count', { ascending: false });
      } else if (filter?.sortBy === 'trending') {
        query = query.order('likes_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as Motion[];
    },
  });

  return { motions, isLoading };
};

// Fetch trending motions
export const useTrendingMotions = () => {
  const { data: trending, isLoading } = useQuery({
    queryKey: ['motions', 'trending'],
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
        .order('views_count', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as Motion[];
    },
  });

  return { trending, isLoading };
};

// Fetch quick motions (shorts equivalent)
export const useQuickMotions = () => {
  const { data: quickMotions, isLoading } = useQuery({
    queryKey: ['motions', 'quick'],
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
        .eq('is_short', true)
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data as Motion[];
    },
  });

  return { quickMotions, isLoading };
};

// Fetch single motion
export const useMotion = (motionId?: string) => {
  const { data: motion, isLoading } = useQuery({
    queryKey: ['motion', motionId],
    queryFn: async () => {
      if (!motionId) return null;
      
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
            description,
            banner_url,
            channel_type
          )
        `)
        .eq('id', motionId)
        .single();
      
      if (error) throw error;
      return data as Motion;
    },
    enabled: !!motionId,
  });

  return { motion, isLoading };
};

// Increment view count
export const useIncrementMotionView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (motionId: string) => {
      // Server-side trigger (sync_video_views_count on video_views) maintains the counter.
      if (!motionId) return;
      await supabase.from('video_views').insert({ video_id: motionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motions'] });
    },
  });
};

// Motion reactions (React instead of Like)
export const useMotionReaction = (motionId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: hasReacted } = useQuery({
    queryKey: ['motion-reaction', motionId, user?.id],
    queryFn: async () => {
      if (!user || !motionId) return false;
      
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('video_id', motionId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!user && !!motionId,
  });

  const toggleReaction = useMutation({
    mutationFn: async () => {
      if (!user || !motionId) throw new Error('Not authenticated');

      if (hasReacted) {
        await supabase
          .from('likes')
          .delete()
          .eq('video_id', motionId)
          .eq('user_id', user.id);
        
        // Decrement count
        const { data: motion } = await supabase
          .from('videos')
          .select('likes_count')
          .eq('id', motionId)
          .single();
        
        if (motion) {
          await supabase
            .from('videos')
            .update({ likes_count: Math.max(0, (motion.likes_count || 0) - 1) })
            .eq('id', motionId);
        }
      } else {
        await supabase
          .from('likes')
          .insert({ video_id: motionId, user_id: user.id, reaction_type: 'react' });
        
        // Increment count
        const { data: motion } = await supabase
          .from('videos')
          .select('likes_count')
          .eq('id', motionId)
          .single();
        
        if (motion) {
          await supabase
            .from('videos')
            .update({ likes_count: (motion.likes_count || 0) + 1 })
            .eq('id', motionId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motion-reaction', motionId] });
      queryClient.invalidateQueries({ queryKey: ['motion', motionId] });
      queryClient.invalidateQueries({ queryKey: ['motions'] });
    },
  });

  return { hasReacted, toggleReaction };
};

// Follow creator (instead of Subscribe)
export const useFollowCreator = (creatorId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isFollowing } = useQuery({
    queryKey: ['following-creator', creatorId, user?.id],
    queryFn: async () => {
      if (!user || !creatorId) return false;
      
      const { data } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('channel_id', creatorId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!user && !!creatorId,
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user || !creatorId) throw new Error('Not authenticated');

      if (isFollowing) {
        await supabase
          .from('subscriptions')
          .delete()
          .eq('channel_id', creatorId)
          .eq('user_id', user.id);
        
        // Decrement count
        const { data: channel } = await supabase
          .from('channels')
          .select('subscribers_count')
          .eq('id', creatorId)
          .single();
        
        if (channel) {
          await supabase
            .from('channels')
            .update({ subscribers_count: Math.max(0, (channel.subscribers_count || 0) - 1) })
            .eq('id', creatorId);
        }
        
        toast.success('Unfollowed creator');
      } else {
        await supabase
          .from('subscriptions')
          .insert({ channel_id: creatorId, user_id: user.id });
        
        // Increment count
        const { data: channel } = await supabase
          .from('channels')
          .select('subscribers_count')
          .eq('id', creatorId)
          .single();
        
        if (channel) {
          await supabase
            .from('channels')
            .update({ subscribers_count: (channel.subscribers_count || 0) + 1 })
            .eq('id', creatorId);
        }
        
        toast.success('Now following!');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following-creator', creatorId] });
      queryClient.invalidateQueries({ queryKey: ['motion'] });
      queryClient.invalidateQueries({ queryKey: ['creator'] });
    },
  });

  return { isFollowing, toggleFollow };
};

// Save motion for later
export const useSaveMotion = (motionId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isSaved } = useQuery({
    queryKey: ['saved-motion', motionId, user?.id],
    queryFn: async () => {
      if (!user || !motionId) return false;
      
      const { data } = await supabase
        .from('saved_videos')
        .select('id')
        .eq('video_id', motionId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!user && !!motionId,
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user || !motionId) throw new Error('Not authenticated');

      if (isSaved) {
        await supabase
          .from('saved_videos')
          .delete()
          .eq('video_id', motionId)
          .eq('user_id', user.id);
        toast.success('Removed from saved');
      } else {
        await supabase
          .from('saved_videos')
          .insert({ video_id: motionId, user_id: user.id });
        toast.success('Saved for later');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-motion', motionId] });
      queryClient.invalidateQueries({ queryKey: ['saved-motions'] });
    },
  });

  return { isSaved, toggleSave };
};

// Get saved motions
export const useSavedMotions = () => {
  const { user } = useAuth();

  const { data: savedMotions, isLoading } = useQuery({
    queryKey: ['saved-motions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('saved_videos')
        .select(`
          id,
          created_at,
          videos:video_id (
            *,
            channels:channel_id (
              id,
              name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { savedMotions, isLoading };
};

// Motion watch history
export const useMotionHistory = () => {
  const { user } = useAuth();

  const { data: history, isLoading } = useQuery({
    queryKey: ['motion-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('watch_history')
        .select(`
          id,
          watched_at,
          watch_progress,
          videos:video_id (
            *,
            channels:channel_id (
              id,
              name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('watched_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { history, isLoading };
};

// Add to watch history
export const useAddToMotionHistory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (motionId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Upsert watch history
      await supabase
        .from('watch_history')
        .upsert({
          video_id: motionId,
          user_id: user.id,
          watched_at: new Date().toISOString(),
        }, {
          onConflict: 'video_id,user_id',
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motion-history'] });
    },
  });
};
