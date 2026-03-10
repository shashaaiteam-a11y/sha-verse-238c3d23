// Movion Algorithms Hook - Integrates Supabase data with recommendation algorithms
import { useMemo } from 'react';
import { MovionVideo, VideoType, MovionSubscription } from '@/movion/types';

// Transform Supabase video to MovionVideo type
export const transformToMovionVideo = (video: any): MovionVideo => {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    id: video.id,
    title: video.title || 'Untitled',
    description: video.description || '',
    thumbnail: video.thumbnail_url || 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400',
    videoUrl: video.video_url || video.hls_url || '',
    type: video.is_short ? VideoType.SHORT : VideoType.LONG,
    views: video.views_count || 0,
    likes: video.likes_count || 0,
    dislikes: video.dislikes_count || 0,
    timestamp: video.created_at ? new Date(video.created_at).toLocaleDateString() : 'Recently',
    duration: formatDuration(video.duration),
    channelId: video.channel_id,
    channelName: video.channels?.name || 'Unknown Channel',
    channelAvatar: video.channels?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.channel_id}`,
    category: video.category || 'Other',
    tags: video.tags || [],
    analytics: {
      views: video.views_count || 0,
      likes: video.likes_count || 0,
      dislikes: video.dislikes_count || 0,
      shares: 0,
      commentsCount: video.comments_count || 0,
      watchTimeSeconds: (video.views_count || 0) * 180,
      averageRetention: 0.5 + Math.random() * 0.3,
      replays: Math.floor((video.views_count || 0) * 0.1),
      engagementSpeed: Math.random(),
      subscribersGained: 0,
      uploadTimestampMs: video.created_at ? new Date(video.created_at).getTime() : Date.now(),
      dailyViews: [0, 0, 0, 0, 0, 0, 0],
    },
  };
};

/**
 * HOME FEED ALGORITHM - Applied to Supabase data
 */
export const usePrioritizedVideos = (
  videos: any[] | undefined,
  subscriptions: any[] | undefined,
  watchHistory: any[] | undefined,
  searchQuery?: string,
  category?: string
) => {
  return useMemo(() => {
    if (!videos || videos.length === 0) return [];

    // Get subscribed channel IDs
    const subscribedChannelIds = (subscriptions || []).map((s: any) => s.channel_id);
    
    // Get user's watched categories for personalization
    const historyCategories = (watchHistory || [])
      .map((h: any) => h.videos?.category)
      .filter(Boolean);
    const userTopCategories = Array.from(new Set(historyCategories));

    // Transform and filter videos
    let results = videos
      .filter((v: any) => !v.is_short) // Only long videos
      .map(transformToMovionVideo);

    // Category filter
    if (category && category !== 'All') {
      results = results.filter(v => v.category === category);
    }

    // Search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(v => 
        v.title.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query) ||
        v.channelName.toLowerCase().includes(query)
      );
    }

    // Sort by algorithm score
    const now = Date.now();
    return results.sort((a, b) => {
      const calculateScore = (v: MovionVideo) => {
        const analytics = v.analytics!;

        // WatchTime (Normalized)
        const watchTimeScore = Math.min(analytics.watchTimeSeconds / 10000, 1) * 0.4;
        
        // Likes (Normalized)
        const likesScore = Math.min(analytics.likes / 5000, 1) * 0.2;

        // Dislikes (Normalized)
        const dislikesScore = Math.min((analytics.dislikes || 0) / 1000, 1) * 0.1;
        
        // Comments (Normalized)
        const commentsScore = Math.min(analytics.commentsCount / 500, 1) * 0.1;
        
        // Freshness - 3 day decay window
        const hoursOld = (now - analytics.uploadTimestampMs) / (1000 * 60 * 60);
        const freshnessScore = Math.max(1 - (hoursOld / 72), 0) * 0.15; 
        
        // Category Match
        const categoryMatchScore = userTopCategories.includes(v.category) ? 0.15 : 0;

        // Subscription Boost
        const subBoost = subscribedChannelIds.includes(v.channelId) ? 1.2 : 1;

        return (watchTimeScore + likesScore - dislikesScore + commentsScore + freshnessScore + categoryMatchScore) * subBoost;
      };

      return calculateScore(b) - calculateScore(a);
    });
  }, [videos, subscriptions, watchHistory, searchQuery, category]);
};

/**
 * SHORTS/PULSE ALGORITHM - Applied to Supabase data
 */
export const usePrioritizedPulse = (shorts: any[] | undefined) => {
  return useMemo(() => {
    if (!shorts || shorts.length === 0) return [];

    const results = shorts.map(transformToMovionVideo);

    return results.sort((a, b) => {
      const calculatePulseScore = (v: MovionVideo) => {
        const analytics = v.analytics!;

        const retentionScore = (analytics.averageRetention || 0.5) * 0.5;
        const replaysScore = Math.min((analytics.replays || 0) / 10000, 1) * 0.3;
        const likesScore = Math.min(analytics.likes / 50000, 1) * 0.1;
        const dislikesScore = Math.min((analytics.dislikes || 0) / 5000, 1) * 0.1;
        const speedScore = (analytics.engagementSpeed || 0) * 0.2;

        return retentionScore + replaysScore + likesScore - dislikesScore + speedScore;
      };

      return calculatePulseScore(b) - calculatePulseScore(a);
    });
  }, [shorts]);
};

/**
 * SUBSCRIPTION FEED ALGORITHM - Applied to Supabase data
 */
export const usePrioritizedSubscriptions = (
  videos: any[] | undefined,
  subscriptions: any[] | undefined,
  channelFilter?: string,
  sortMode: 'smart' | 'recent' = 'smart'
) => {
  return useMemo(() => {
    if (!videos || !subscriptions || subscriptions.length === 0) return [];

    // Create subscription map with notification levels
    const subscriptionMap: Record<string, MovionSubscription> = {};
    subscriptions.forEach((s: any) => {
      subscriptionMap[s.channel_id] = {
        channelId: s.channel_id,
        subscribedAt: new Date(s.created_at).getTime(),
        notificationLevel: s.notification_level || 'PERSONALIZED',
      };
    });

    const subscribedChannelIds = Object.keys(subscriptionMap);

    // Filter to only subscribed channels
    let results = videos
      .filter((v: any) => subscribedChannelIds.includes(v.channel_id))
      .filter((v: any) => !channelFilter || v.channel_id === channelFilter)
      .map(transformToMovionVideo);

    if (sortMode === 'recent') {
      // Simple recency sort
      return results.sort((a, b) => {
        const dateA = a.analytics?.uploadTimestampMs || 0;
        const dateB = b.analytics?.uploadTimestampMs || 0;
        return dateB - dateA;
      });
    }

    // Smart sort: notification level priority + recency
    return results.sort((a, b) => {
      const subA = subscriptionMap[a.channelId];
      const subB = subscriptionMap[b.channelId];
      
      const levelScore: Record<string, number> = { 'ALL': 3, 'PERSONALIZED': 2, 'NONE': 1 };
      const scoreA = levelScore[subA?.notificationLevel || 'PERSONALIZED'] || 2;
      const scoreB = levelScore[subB?.notificationLevel || 'PERSONALIZED'] || 2;
      
      if (scoreA !== scoreB) return scoreB - scoreA;
      
      // Recency as tiebreaker
      const dateA = a.analytics?.uploadTimestampMs || 0;
      const dateB = b.analytics?.uploadTimestampMs || 0;
      return dateB - dateA;
    });
  }, [videos, subscriptions, channelFilter, sortMode]);
};

/**
 * RELATED VIDEOS ALGORITHM
 */
export const useRelatedVideos = (
  currentVideo: any | undefined,
  allVideos: any[] | undefined,
  limit: number = 10
) => {
  return useMemo(() => {
    if (!currentVideo || !allVideos) return [];

    const results = allVideos
      .filter((v: any) => v.id !== currentVideo.id && !v.is_short)
      .map(transformToMovionVideo)
      .sort((a, b) => {
        let scoreA = 0, scoreB = 0;
        
        // Same channel bonus
        if (a.channelId === currentVideo.channel_id) scoreA += 2;
        if (b.channelId === currentVideo.channel_id) scoreB += 2;
        
        // Same category bonus
        if (a.category === currentVideo.category) scoreA += 1;
        if (b.category === currentVideo.category) scoreB += 1;
        
        // Views as tiebreaker
        scoreA += a.views / 10000000;
        scoreB += b.views / 10000000;
        
        return scoreB - scoreA;
      });

    return results.slice(0, limit);
  }, [currentVideo, allVideos, limit]);
};
