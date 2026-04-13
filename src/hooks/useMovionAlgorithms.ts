// Movion Algorithms Hook - Integrates Supabase data with recommendation algorithms
import { useMemo } from 'react';
import { MovionVideo, VideoType, MovionSubscription } from '@/movion/types';

// === Session Storage Keys ===
const SWIPE_AWAY_KEY = 'movion_swipe_away_session';
const SESSION_INTERESTS_KEY = 'movion_session_interests';

// === Swipe-Away Tracking (localStorage session data) ===
export const recordSwipeAway = (videoId: string) => {
  try {
    const data: Record<string, number> = JSON.parse(localStorage.getItem(SWIPE_AWAY_KEY) || '{}');
    data[videoId] = (data[videoId] || 0) + 1;
    localStorage.setItem(SWIPE_AWAY_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
};

const getSwipeAwayData = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(SWIPE_AWAY_KEY) || '{}');
  } catch { return {}; }
};

// === Session Interest Tracking ===
export const recordSessionInterest = (category: string) => {
  try {
    const data: Record<string, number> = JSON.parse(sessionStorage.getItem(SESSION_INTERESTS_KEY) || '{}');
    data[category] = (data[category] || 0) + 1;
    sessionStorage.setItem(SESSION_INTERESTS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
};

const getSessionInterests = (): string[] => {
  try {
    const data: Record<string, number> = JSON.parse(sessionStorage.getItem(SESSION_INTERESTS_KEY) || '{}');
    return Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);
  } catch { return []; }
};

// === Creator Diversity Pass ===
// Prevents same channel from appearing consecutively
const applyCreatorDiversity = (videos: MovionVideo[]): MovionVideo[] => {
  if (videos.length <= 2) return videos;
  const result = [...videos];
  for (let i = 1; i < result.length - 1; i++) {
    if (result[i].channelId === result[i - 1].channelId) {
      // Find next video with a different channel to swap
      for (let j = i + 1; j < result.length; j++) {
        if (result[j].channelId !== result[i - 1].channelId) {
          [result[i], result[j]] = [result[j], result[i]];
          break;
        }
      }
    }
  }
  return result;
};

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
    channelAvatar: video.channels?.avatar_url || '',
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
 * Now with session interest tracking + creator diversity
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

    const subscribedChannelIds = (subscriptions || []).map((s: any) => s.channel_id);
    
    const historyCategories = (watchHistory || [])
      .map((h: any) => h.videos?.category)
      .filter(Boolean);
    const userTopCategories = Array.from(new Set(historyCategories));

    // Session interests for dynamic boost
    const sessionInterests = getSessionInterests();

    let results = videos
      .filter((v: any) => !v.is_short)
      .map(transformToMovionVideo);

    if (category && category !== 'All') {
      results = results.filter(v => v.category === category);
    }

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(v => 
        v.title.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query) ||
        v.channelName.toLowerCase().includes(query)
      );
    }

    const now = Date.now();
    const sorted = results.sort((a, b) => {
      const calculateScore = (v: MovionVideo) => {
        const analytics = v.analytics!;

        const watchTimeScore = Math.min(analytics.watchTimeSeconds / 10000, 1) * 0.35;
        const likesScore = Math.min(analytics.likes / 5000, 1) * 0.15;
        const dislikesScore = Math.min((analytics.dislikes || 0) / 1000, 1) * 0.1;
        const commentsScore = Math.min(analytics.commentsCount / 500, 1) * 0.1;
        
        // Freshness - 3 day decay window
        const hoursOld = (now - analytics.uploadTimestampMs) / (1000 * 60 * 60);
        const freshnessScore = Math.max(1 - (hoursOld / 72), 0) * 0.15; 
        
        // Category Match (history-based)
        const categoryMatchScore = userTopCategories.includes(v.category) ? 0.1 : 0;

        // Session interest boost (dynamic)
        const sessionBoost = sessionInterests.includes(v.category) ? 0.05 : 0;

        // Subscription Boost
        const subBoost = subscribedChannelIds.includes(v.channelId) ? 1.2 : 1;

        return (watchTimeScore + likesScore - dislikesScore + commentsScore + freshnessScore + categoryMatchScore + sessionBoost) * subBoost;
      };

      return calculateScore(b) - calculateScore(a);
    });

    // Apply creator diversity
    return applyCreatorDiversity(sorted);
  }, [videos, subscriptions, watchHistory, searchQuery, category]);
};

/**
 * SHORTS/PULSE ALGORITHM - Applied to Supabase data
 * Now with freshness boost (48hr decay), swipe-away penalty, creator diversity, hidden filter
 */
export const usePrioritizedPulse = (shorts: any[] | undefined, hiddenVideoIds?: string[]) => {
  return useMemo(() => {
    if (!shorts || shorts.length === 0) return [];

    const swipeAwayData = getSwipeAwayData();
    const now = Date.now();

    let results = shorts.map(transformToMovionVideo);

    // Filter out hidden (Not Interested) videos
    if (hiddenVideoIds && hiddenVideoIds.length > 0) {
      results = results.filter(v => !hiddenVideoIds.includes(v.id));
    }

    const sorted = results.sort((a, b) => {
      const calculatePulseScore = (v: MovionVideo) => {
        const analytics = v.analytics!;

        const retentionScore = (analytics.averageRetention || 0.5) * 0.4;
        const replaysScore = Math.min((analytics.replays || 0) / 10000, 1) * 0.2;
        const likesScore = Math.min(analytics.likes / 50000, 1) * 0.1;
        const dislikesScore = Math.min((analytics.dislikes || 0) / 5000, 1) * 0.1;
        const speedScore = (analytics.engagementSpeed || 0) * 0.1;

        // Freshness boost - 48hr decay window for new Shorts
        const hoursOld = (now - analytics.uploadTimestampMs) / (1000 * 60 * 60);
        const freshnessScore = Math.max(1 - (hoursOld / 48), 0) * 0.2;

        // Swipe-away penalty
        const swipeCount = swipeAwayData[v.id] || 0;
        const swipePenalty = Math.min(swipeCount * 0.1, 0.3); // max 0.3 penalty

        return retentionScore + replaysScore + likesScore - dislikesScore + speedScore + freshnessScore - swipePenalty;
      };

      return calculatePulseScore(b) - calculatePulseScore(a);
    });

    // Apply creator diversity
    return applyCreatorDiversity(sorted);
  }, [shorts, hiddenVideoIds]);
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

    const subscriptionMap: Record<string, MovionSubscription> = {};
    subscriptions.forEach((s: any) => {
      subscriptionMap[s.channel_id] = {
        channelId: s.channel_id,
        subscribedAt: new Date(s.created_at).getTime(),
        notificationLevel: s.notification_level || 'PERSONALIZED',
      };
    });

    const subscribedChannelIds = Object.keys(subscriptionMap);

    let results = videos
      .filter((v: any) => subscribedChannelIds.includes(v.channel_id))
      .filter((v: any) => !channelFilter || v.channel_id === channelFilter)
      .map(transformToMovionVideo);

    if (sortMode === 'recent') {
      return results.sort((a, b) => {
        const dateA = a.analytics?.uploadTimestampMs || 0;
        const dateB = b.analytics?.uploadTimestampMs || 0;
        return dateB - dateA;
      });
    }

    return results.sort((a, b) => {
      const subA = subscriptionMap[a.channelId];
      const subB = subscriptionMap[b.channelId];
      
      const levelScore: Record<string, number> = { 'ALL': 3, 'PERSONALIZED': 2, 'NONE': 1 };
      const scoreA = levelScore[subA?.notificationLevel || 'PERSONALIZED'] || 2;
      const scoreB = levelScore[subB?.notificationLevel || 'PERSONALIZED'] || 2;
      
      if (scoreA !== scoreB) return scoreB - scoreA;
      
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
        
        if (a.channelId === currentVideo.channel_id) scoreA += 2;
        if (b.channelId === currentVideo.channel_id) scoreB += 2;
        
        if (a.category === currentVideo.category) scoreA += 1;
        if (b.category === currentVideo.category) scoreB += 1;
        
        scoreA += a.views / 10000000;
        scoreB += b.views / 10000000;
        
        return scoreB - scoreA;
      });

    return results.slice(0, limit);
  }, [currentVideo, allVideos, limit]);
};
