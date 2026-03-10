// Movion Recommendation Algorithms

import { MovionVideo, VideoType, MovionChannel, MovionSubscription } from './types';

/**
 * HOME FEED ALGORITHM
 * Score = (WatchTime * 0.4) + (Likes * 0.2) - (Dislikes * 0.1) + (Comments * 0.1) + (Freshness * 0.15) + (Category Match * 0.15)
 */
export const prioritizeVideos = (
  videos: MovionVideo[], 
  subscriptions: string[], 
  history: MovionVideo[], 
  searchQuery?: string,
  category?: string
): MovionVideo[] => {
  const userTopCategories = Array.from(new Set(history.map(v => v.category)));
  const now = Date.now();

  let results = [...videos].filter(v => v.type === VideoType.LONG);
  
  if (category && category !== 'All' && category !== 'New to you') {
    results = results.filter(v => v.category === category);
  }

  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    results = results.filter(v => 
      v.title.toLowerCase().includes(query) ||
      v.description.toLowerCase().includes(query) ||
      v.channelName.toLowerCase().includes(query) ||
      v.category.toLowerCase().includes(query)
    );
  }

  return results.sort((a, b) => {
    const calculateScore = (v: MovionVideo) => {
      const analytics = v.analytics || { 
        watchTimeSeconds: v.views * 180, 
        likes: v.likes, 
        dislikes: v.dislikes || 0, 
        commentsCount: Math.floor(v.views * 0.005), 
        uploadTimestampMs: now - 86400000 
      };

      // WatchTime (Normalized)
      const watchTimeScore = Math.min(analytics.watchTimeSeconds / 10000, 1) * 0.4;
      
      // Likes (Normalized)
      const likesScore = Math.min(analytics.likes / 5000, 1) * 0.2;

      // Dislikes (Normalized)
      const dislikesScore = Math.min((analytics.dislikes || 0) / 1000, 1) * 0.1;
      
      // Comments (Normalized)
      const commentsScore = Math.min(analytics.commentsCount / 500, 1) * 0.1;
      
      // Freshness - 3 day decay window
      const hoursOld = (now - (analytics.uploadTimestampMs || now - 86400000)) / (1000 * 60 * 60);
      const freshnessScore = Math.max(1 - (hoursOld / 72), 0) * 0.15; 
      
      // Category Match
      const categoryMatchScore = userTopCategories.includes(v.category) ? 0.15 : 0;

      // Subscription Boost
      const subBoost = subscriptions.includes(v.channelId) ? 1.2 : 1;

      return (watchTimeScore + likesScore - dislikesScore + commentsScore + freshnessScore + categoryMatchScore) * subBoost;
    };

    return calculateScore(b) - calculateScore(a);
  });
};

/**
 * SHORTS/PULSE ALGORITHM
 * Score = (Retention % * 0.5) + (Replays * 0.3) + (Likes * 0.1) - (Dislikes * 0.1) + (Engagement Speed * 0.2)
 */
export const prioritizePulse = (videos: MovionVideo[]): MovionVideo[] => {
  const shorts = videos.filter(v => v.type === VideoType.SHORT);
  
  return shorts.sort((a, b) => {
    const calculatePulseScore = (v: MovionVideo) => {
      const analytics = v.analytics || { 
        averageRetention: 0.5, 
        replays: Math.floor(v.views * 0.1),
        likes: v.likes,
        dislikes: v.dislikes || 0,
        engagementSpeed: Math.random()
      };

      const retentionScore = (analytics.averageRetention || 0.5) * 0.5;
      const replaysScore = Math.min((analytics.replays || 0) / 10000, 1) * 0.3;
      const likesScore = Math.min(analytics.likes / 50000, 1) * 0.1;
      const dislikesScore = Math.min((analytics.dislikes || 0) / 5000, 1) * 0.1;
      const speedScore = (analytics.engagementSpeed || 0) * 0.2;

      return retentionScore + replaysScore + likesScore - dislikesScore + speedScore;
    };

    return calculatePulseScore(b) - calculatePulseScore(a);
  });
};

/**
 * SUBSCRIPTION FEED ALGORITHM
 * Sort by notification level + recency
 */
export const prioritizeSubscriptions = (
  videos: MovionVideo[],
  subscriptions: Record<string, MovionSubscription>,
  channelFilter?: string,
  sortMode: 'smart' | 'recent' = 'smart'
): MovionVideo[] => {
  const subbedChannelIds = Object.keys(subscriptions);
  
  let results = videos.filter(v => 
    subbedChannelIds.includes(v.channelId) && 
    (!channelFilter || v.channelId === channelFilter)
  );

  if (sortMode === 'recent') {
    // Simple recency sort based on timestamp string
    return results.sort((a, b) => {
      const getHours = (ts: string) => {
        if (ts.includes('hour')) return parseInt(ts) || 1;
        if (ts.includes('day')) return (parseInt(ts) || 1) * 24;
        if (ts.includes('week')) return (parseInt(ts) || 1) * 168;
        return 999;
      };
      return getHours(a.timestamp) - getHours(b.timestamp);
    });
  }

  // Smart sort: notification level priority + recency
  return results.sort((a, b) => {
    const subA = subscriptions[a.channelId];
    const subB = subscriptions[b.channelId];
    
    const levelScore = { 'ALL': 3, 'PERSONALIZED': 2, 'NONE': 1 };
    const scoreA = levelScore[subA?.notificationLevel || 'PERSONALIZED'];
    const scoreB = levelScore[subB?.notificationLevel || 'PERSONALIZED'];
    
    if (scoreA !== scoreB) return scoreB - scoreA;
    
    // Recency as tiebreaker
    const getHours = (ts: string) => {
      if (ts.includes('hour')) return parseInt(ts) || 1;
      if (ts.includes('day')) return (parseInt(ts) || 1) * 24;
      if (ts.includes('week')) return (parseInt(ts) || 1) * 168;
      return 999;
    };
    return getHours(a.timestamp) - getHours(b.timestamp);
  });
};

/**
 * Get related videos for Watch page
 */
export const getRelatedVideos = (
  currentVideo: MovionVideo,
  allVideos: MovionVideo[],
  limit: number = 10
): MovionVideo[] => {
  return allVideos
    .filter(v => v.id !== currentVideo.id && v.type === VideoType.LONG)
    .sort((a, b) => {
      let scoreA = 0, scoreB = 0;
      
      // Same channel bonus
      if (a.channelId === currentVideo.channelId) scoreA += 2;
      if (b.channelId === currentVideo.channelId) scoreB += 2;
      
      // Same category bonus
      if (a.category === currentVideo.category) scoreA += 1;
      if (b.category === currentVideo.category) scoreB += 1;
      
      // Views as tiebreaker
      scoreA += a.views / 10000000;
      scoreB += b.views / 10000000;
      
      return scoreB - scoreA;
    })
    .slice(0, limit);
};
