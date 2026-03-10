// Movion Global State Store

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { 
  MovionVideo, MovionComment, MovionChannel, VideoAnalytics, 
  NotificationLevel, VideoType, AnalyticsEvent, MovionSubscription, 
  ToastMessage, MovionNotification, UserEventLog 
} from './types';
import { MOCK_VIDEOS, MOCK_CHANNELS } from './constants';
import { prioritizeVideos, prioritizePulse, prioritizeSubscriptions, getRelatedVideos } from './algorithms';

const DEFAULT_CHANNEL: MovionChannel = {
  id: 'my-channel-main',
  name: 'Main Creator',
  handle: '@main_creator',
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=main`,
  subscribers: 0,
  description: 'My primary creative outlet.',
  watchTimeHours: 0,
  shortsViews: 0,
  joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
};

interface MovionStoreContextType {
  // Channel
  userChannel: MovionChannel;
  allChannels: MovionChannel[];
  updateChannelProfile: (updates: Partial<MovionChannel>) => void;
  getChannel: (id: string) => MovionChannel;
  
  // Videos
  userVideos: MovionVideo[];
  addUserVideo: (video: MovionVideo) => void;
  deleteVideo: (id: string) => void;
  hideVideo: (id: string) => void;
  hiddenVideos: string[];
  
  // Subscriptions
  subscriptions: Record<string, MovionSubscription>;
  isSubscribed: (channelId: string) => boolean;
  toggleSubscription: (channelId: string) => void;
  getSubNotification: (channelId: string) => NotificationLevel;
  setSubNotification: (channelId: string, level: NotificationLevel) => void;
  
  // Engagement
  likedVideos: MovionVideo[];
  dislikedVideos: MovionVideo[];
  watchLater: MovionVideo[];
  history: MovionVideo[];
  toggleLike: (video: MovionVideo) => void;
  toggleDislike: (video: MovionVideo) => void;
  toggleWatchLater: (video: MovionVideo) => void;
  addToHistory: (video: MovionVideo) => void;
  recordEngagement: (video: MovionVideo, watchTime: number, completed: boolean) => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchHistory: string[];
  addToSearchHistory: (term: string) => void;
  removeFromSearchHistory: (term: string) => void;
  
  // Analytics
  videoAnalytics: Record<string, VideoAnalytics>;
  emitEvent: (event: AnalyticsEvent) => void;
  
  // Comments
  comments: Record<string, MovionComment[]>;
  addComment: (videoId: string, text: string) => void;
  toggleCommentLike: (videoId: string, commentId: string, isLike: boolean) => void;
  pinComment: (videoId: string, commentId: string) => void;
  
  // Notifications & Toasts
  notifications: MovionNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
  
  // Feeds (Algorithm-powered)
  getHomeFeed: (category?: string) => MovionVideo[];
  getPulseFeed: () => MovionVideo[];
  getSubscriptionFeed: (channelFilter?: string, sortMode?: 'smart' | 'recent') => MovionVideo[];
  getRelatedVideos: (video: MovionVideo) => MovionVideo[];
  
  // Progress
  progress: Record<string, number>;
  setVideoProgress: (videoId: string, progress: number) => void;
}

const MovionStoreContext = createContext<MovionStoreContextType | null>(null);

export const MovionStoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Channel State
  const [userChannel, setUserChannel] = useState<MovionChannel>(() => {
    try {
      const saved = localStorage.getItem('movion_user_channel');
      return saved ? JSON.parse(saved) : DEFAULT_CHANNEL;
    } catch { return DEFAULT_CHANNEL; }
  });

  const [allChannels, setAllChannels] = useState<MovionChannel[]>(() => {
    try {
      const savedUserChannel = localStorage.getItem('movion_user_channel');
      const parsedUserChannel = savedUserChannel ? JSON.parse(savedUserChannel) : DEFAULT_CHANNEL;
      const baseChannels = [...MOCK_CHANNELS];
      if (!baseChannels.find(c => c.id === parsedUserChannel.id)) {
        baseChannels.push(parsedUserChannel);
      }
      return baseChannels;
    } catch { return [...MOCK_CHANNELS]; }
  });

  // Subscriptions
  const [subscriptions, setSubscriptions] = useState<Record<string, MovionSubscription>>(() => {
    try {
      const saved = localStorage.getItem('movion_subscriptions_v2');
      if (saved) return JSON.parse(saved);
      return { "c1": { channelId: "c1", subscribedAt: Date.now(), notificationLevel: 'ALL' } };
    } catch { return {}; }
  });

  // Videos
  const [userVideos, setUserVideos] = useState<MovionVideo[]>(() => {
    try { return JSON.parse(localStorage.getItem('movion_user_videos') || '[]'); } catch { return []; }
  });
  const [hiddenVideos, setHiddenVideos] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('movion_hidden_videos') || '[]'); } catch { return []; }
  });

  // Engagement
  const [likedVideos, setLikedVideos] = useState<MovionVideo[]>(() => {
    try { return JSON.parse(localStorage.getItem('movion_liked') || '[]'); } catch { return []; }
  });
  const [dislikedVideos, setDislikedVideos] = useState<MovionVideo[]>(() => {
    try { return JSON.parse(localStorage.getItem('movion_disliked') || '[]'); } catch { return []; }
  });
  const [watchLater, setWatchLater] = useState<MovionVideo[]>(() => {
    try { return JSON.parse(localStorage.getItem('movion_watch_later') || '[]'); } catch { return []; }
  });
  const [history, setHistory] = useState<MovionVideo[]>(() => {
    try { return JSON.parse(localStorage.getItem('movion_history') || '[]'); } catch { return []; }
  });

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('movion_search_history') || '[]'); } catch { return []; }
  });

  // Analytics
  const [videoAnalytics, setVideoAnalytics] = useState<Record<string, VideoAnalytics>>(() => {
    try {
      const saved = localStorage.getItem('movion_analytics_v4');
      if (saved) return JSON.parse(saved);
    } catch {}
    
    const initial: Record<string, VideoAnalytics> = {};
    MOCK_VIDEOS.forEach(v => {
      initial[v.id] = {
        views: v.views,
        likes: v.likes,
        dislikes: v.dislikes || 0,
        shares: Math.floor(v.views * 0.01),
        commentsCount: Math.floor(v.views * 0.005),
        watchTimeSeconds: v.views * 180,
        averageRetention: 0.4 + Math.random() * 0.3,
        replays: 0,
        engagementSpeed: Math.random(),
        subscribersGained: Math.floor(v.views * 0.002),
        uploadTimestampMs: Date.now() - (Math.random() * 86400000 * 30),
        dailyViews: Array.from({length: 7}, () => Math.floor(v.views / 7))
      };
    });
    return initial;
  });

  // Comments
  const [comments, setComments] = useState<Record<string, MovionComment[]>>(() => {
    try { return JSON.parse(localStorage.getItem('movion_comments_v2') || '{}'); } catch { return {}; }
  });

  // Notifications
  const [notifications, setNotifications] = useState<MovionNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Progress
  const [progress, setProgress] = useState<Record<string, number>>({});

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('movion_user_channel', JSON.stringify(userChannel));
    localStorage.setItem('movion_subscriptions_v2', JSON.stringify(subscriptions));
    localStorage.setItem('movion_user_videos', JSON.stringify(userVideos));
    localStorage.setItem('movion_hidden_videos', JSON.stringify(hiddenVideos));
    localStorage.setItem('movion_liked', JSON.stringify(likedVideos));
    localStorage.setItem('movion_disliked', JSON.stringify(dislikedVideos));
    localStorage.setItem('movion_watch_later', JSON.stringify(watchLater));
    localStorage.setItem('movion_history', JSON.stringify(history));
    localStorage.setItem('movion_search_history', JSON.stringify(searchHistory));
    localStorage.setItem('movion_analytics_v4', JSON.stringify(videoAnalytics));
    localStorage.setItem('movion_comments_v2', JSON.stringify(comments));
  }, [userChannel, subscriptions, userVideos, hiddenVideos, likedVideos, dislikedVideos, watchLater, history, searchHistory, videoAnalytics, comments]);

  // Toast helpers
  const addToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Channel helpers
  const updateChannelProfile = useCallback((updates: Partial<MovionChannel>) => {
    setUserChannel(prev => ({ ...prev, ...updates }));
    addToast("Profile updated", "success");
  }, [addToast]);

  const getChannel = useCallback((id: string): MovionChannel => {
    return allChannels.find(c => c.id === id) || userChannel;
  }, [allChannels, userChannel]);

  // Video helpers
  const addUserVideo = useCallback((video: MovionVideo) => {
    setUserVideos(prev => [video, ...prev]);
    addToast("Video uploaded successfully!", "success");
  }, [addToast]);

  const deleteVideo = useCallback((id: string) => {
    setUserVideos(prev => prev.filter(v => v.id !== id));
    addToast("Video deleted", "info");
  }, [addToast]);

  const hideVideo = useCallback((id: string) => {
    setHiddenVideos(prev => [...prev, id]);
    addToast("Video hidden from feed", "info");
  }, [addToast]);

  // Subscription helpers
  const isSubscribed = useCallback((channelId: string) => !!subscriptions[channelId], [subscriptions]);

  const toggleSubscription = useCallback((channelId: string) => {
    setSubscriptions(prev => {
      const isSubbed = !!prev[channelId];
      const newSubs = { ...prev };
      
      if (isSubbed) {
        delete newSubs[channelId];
      } else {
        newSubs[channelId] = { channelId, subscribedAt: Date.now(), notificationLevel: 'PERSONALIZED' };
      }
      
      setAllChannels(channels => channels.map(c => {
        if (c.id === channelId) {
          return { ...c, subscribers: c.subscribers + (isSubbed ? -1 : 1) };
        }
        return c;
      }));
      
      addToast(isSubbed ? "Subscription removed" : "Subscribed!", isSubbed ? "info" : "success");
      return newSubs;
    });
  }, [addToast]);

  const getSubNotification = useCallback((channelId: string): NotificationLevel => {
    return subscriptions[channelId]?.notificationLevel || 'PERSONALIZED';
  }, [subscriptions]);

  const setSubNotification = useCallback((channelId: string, level: NotificationLevel) => {
    setSubscriptions(prev => ({
      ...prev,
      [channelId]: { ...prev[channelId], notificationLevel: level }
    }));
    addToast(`Notifications set to ${level.toLowerCase()}`, "success");
  }, [addToast]);

  // Engagement helpers
  const toggleLike = useCallback((video: MovionVideo) => {
    setLikedVideos(prev => {
      const isLiked = prev.some(v => v.id === video.id);
      setDislikedVideos(d => d.filter(v => v.id !== video.id));
      return isLiked ? prev.filter(v => v.id !== video.id) : [...prev, video];
    });
  }, []);

  const toggleDislike = useCallback((video: MovionVideo) => {
    setDislikedVideos(prev => {
      const isDisliked = prev.some(v => v.id === video.id);
      setLikedVideos(l => l.filter(v => v.id !== video.id));
      return isDisliked ? prev.filter(v => v.id !== video.id) : [...prev, video];
    });
  }, []);

  const toggleWatchLater = useCallback((video: MovionVideo) => {
    setWatchLater(prev => {
      const exists = prev.some(v => v.id === video.id);
      addToast(exists ? "Removed from Watch Later" : "Saved to Watch Later", exists ? "info" : "success");
      return exists ? prev.filter(v => v.id !== video.id) : [...prev, video];
    });
  }, [addToast]);

  const addToHistory = useCallback((video: MovionVideo) => {
    setHistory(prev => {
      const filtered = prev.filter(v => v.id !== video.id);
      return [video, ...filtered].slice(0, 100);
    });
  }, []);

  const recordEngagement = useCallback((video: MovionVideo, watchTime: number, completed: boolean) => {
    setVideoAnalytics(prev => {
      const current = prev[video.id] || {
        views: video.views,
        likes: video.likes,
        dislikes: video.dislikes || 0,
        shares: 0,
        commentsCount: 0,
        watchTimeSeconds: 0,
        averageRetention: 0,
        replays: 0,
        engagementSpeed: 0,
        subscribersGained: 0,
        uploadTimestampMs: Date.now(),
        dailyViews: [0,0,0,0,0,0,0]
      };
      return {
        ...prev,
        [video.id]: {
          ...current,
          watchTimeSeconds: current.watchTimeSeconds + watchTime
        }
      };
    });
  }, []);

  // Search helpers
  const addToSearchHistory = useCallback((term: string) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(t => t.toLowerCase() !== term.toLowerCase());
      return [term, ...filtered].slice(0, 10);
    });
  }, []);

  const removeFromSearchHistory = useCallback((term: string) => {
    setSearchHistory(prev => prev.filter(t => t !== term));
  }, []);

  // Analytics
  const emitEvent = useCallback((event: AnalyticsEvent) => {
    if (!event.videoId) return;
    
    setVideoAnalytics(prev => {
      const current = prev[event.videoId!] || {
        views: 0, likes: 0, dislikes: 0, shares: 0, watchTimeSeconds: 0,
        averageRetention: 0, commentsCount: 0, replays: 0, engagementSpeed: 0,
        subscribersGained: 0, uploadTimestampMs: Date.now(), dailyViews: [0,0,0,0,0,0,0]
      };
      
      switch (event.type) {
        case 'watch_started':
          return { ...prev, [event.videoId!]: { ...current, views: current.views + 1 } };
        case 'video_liked':
          return { ...prev, [event.videoId!]: { ...current, likes: current.likes + (event.payload?.isLiked ? 1 : -1) } };
        case 'content_shared':
          return { ...prev, [event.videoId!]: { ...current, shares: current.shares + 1 } };
        case 'video_replay':
          return { ...prev, [event.videoId!]: { ...current, replays: current.replays + 1 } };
        default:
          return prev;
      }
    });
  }, []);

  // Comments
  const addComment = useCallback((videoId: string, text: string) => {
    const newComment: MovionComment = {
      id: Math.random().toString(36).substr(2, 9),
      videoId,
      userId: userChannel.id,
      userName: userChannel.name,
      userHandle: userChannel.handle,
      userAvatar: userChannel.avatar,
      text,
      createdAt: Date.now(),
      likeCount: 0,
      dislikeCount: 0,
      isLiked: false,
      isDisliked: false,
      pinned: false,
      isOwner: true
    };
    
    setComments(prev => ({
      ...prev,
      [videoId]: [newComment, ...(prev[videoId] || [])]
    }));
    addToast("Comment added", "success");
  }, [userChannel, addToast]);

  const toggleCommentLike = useCallback((videoId: string, commentId: string, isLike: boolean) => {
    setComments(prev => {
      const videoComments = prev[videoId] || [];
      return {
        ...prev,
        [videoId]: videoComments.map(c => {
          if (c.id === commentId) {
            if (isLike) {
              return { ...c, isLiked: !c.isLiked, likeCount: c.isLiked ? c.likeCount - 1 : c.likeCount + 1, isDisliked: false };
            }
            return { ...c, isDisliked: !c.isDisliked, dislikeCount: c.isDisliked ? c.dislikeCount - 1 : c.dislikeCount + 1, isLiked: false };
          }
          return c;
        })
      };
    });
  }, []);

  const pinComment = useCallback((videoId: string, commentId: string) => {
    setComments(prev => {
      const videoComments = prev[videoId] || [];
      return {
        ...prev,
        [videoId]: videoComments.map(c => ({
          ...c,
          pinned: c.id === commentId ? !c.pinned : false
        }))
      };
    });
    addToast("Comment pin updated", "info");
  }, [addToast]);

  // Notifications
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const notif = prev.find(n => n.id === id);
      if (notif && !notif.read) {
        setUnreadCount(c => Math.max(0, c - 1));
        return prev.map(n => n.id === id ? { ...n, read: true } : n);
      }
      return prev;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    addToast("All notifications marked as read", "success");
  }, [addToast]);

  // Progress
  const setVideoProgress = useCallback((videoId: string, prog: number) => {
    setProgress(prev => ({ ...prev, [videoId]: prog }));
  }, []);

  // Algorithm-powered feeds
  const allVideos = useMemo(() => [...MOCK_VIDEOS, ...userVideos].filter(v => !hiddenVideos.includes(v.id)), [userVideos, hiddenVideos]);

  const getHomeFeed = useCallback((category?: string) => {
    return prioritizeVideos(allVideos, Object.keys(subscriptions), history, searchQuery, category);
  }, [allVideos, subscriptions, history, searchQuery]);

  const getPulseFeed = useCallback(() => {
    return prioritizePulse(allVideos);
  }, [allVideos]);

  const getSubscriptionFeed = useCallback((channelFilter?: string, sortMode: 'smart' | 'recent' = 'smart') => {
    return prioritizeSubscriptions(allVideos, subscriptions, channelFilter, sortMode);
  }, [allVideos, subscriptions]);

  const getRelatedVideosForVideo = useCallback((video: MovionVideo) => {
    return getRelatedVideos(video, allVideos);
  }, [allVideos]);

  const value: MovionStoreContextType = {
    userChannel,
    allChannels,
    updateChannelProfile,
    getChannel,
    userVideos,
    addUserVideo,
    deleteVideo,
    hideVideo,
    hiddenVideos,
    subscriptions,
    isSubscribed,
    toggleSubscription,
    getSubNotification,
    setSubNotification,
    likedVideos,
    dislikedVideos,
    watchLater,
    history,
    toggleLike,
    toggleDislike,
    toggleWatchLater,
    addToHistory,
    recordEngagement,
    searchQuery,
    setSearchQuery,
    searchHistory,
    addToSearchHistory,
    removeFromSearchHistory,
    videoAnalytics,
    emitEvent,
    comments,
    addComment,
    toggleCommentLike,
    pinComment,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    toasts,
    addToast,
    removeToast,
    getHomeFeed,
    getPulseFeed,
    getSubscriptionFeed,
    getRelatedVideos: getRelatedVideosForVideo,
    progress,
    setVideoProgress
  };

  return (
    <MovionStoreContext.Provider value={value}>
      {children}
    </MovionStoreContext.Provider>
  );
};

export const useMovionStore = () => {
  const context = useContext(MovionStoreContext);
  if (!context) {
    throw new Error('useMovionStore must be used within MovionStoreProvider');
  }
  return context;
};
