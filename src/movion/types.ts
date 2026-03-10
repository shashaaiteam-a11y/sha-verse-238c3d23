// Movion Types - YouTube/TikTok Clone

export enum VideoType {
  LONG = 'LONG',
  SHORT = 'SHORT'
}

export type NotificationLevel = 'ALL' | 'PERSONALIZED' | 'NONE';

export interface UserPermissions {
  canUpload: boolean;
  canComment: boolean;
  isCreator: boolean;
  monetizationEnabled: boolean;
}

export interface MovionChannel {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  banner?: string;
  subscribers: number;
  description: string;
  watchTimeHours: number;
  shortsViews: number;
  joinedDate: string;
}

export interface MovionSubscription {
  channelId: string;
  subscribedAt: number;
  notificationLevel: NotificationLevel;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export interface MovionNotification {
  id: string;
  type: 'upload' | 'live' | 'comment' | 'community' | 'alert';
  channelId?: string;
  channelName?: string;
  channelAvatar?: string;
  text: string;
  time: string;
  read: boolean;
  videoId?: string;
  thumbnail?: string;
  link?: string;
}

export interface VideoAnalytics {
  views: number;
  likes: number;
  dislikes: number;
  shares: number;
  commentsCount: number;
  watchTimeSeconds: number;
  averageRetention: number;
  replays: number;
  engagementSpeed: number;
  subscribersGained: number;
  uploadTimestampMs: number;
  dailyViews: number[];
}

export interface MovionVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  type: VideoType;
  views: number;
  likes: number;
  dislikes: number;
  timestamp: string;
  duration: string;
  channelId: string;
  channelName: string;
  channelAvatar: string;
  category: string;
  tags?: string[];
  visibility?: 'public' | 'private' | 'unlisted';
  analytics?: VideoAnalytics;
}

export type AnalyticsEventType = 
  | 'watch_started' 
  | 'retention_hit' 
  | 'video_liked' 
  | 'video_disliked'
  | 'channel_followed' 
  | 'content_shared'
  | 'video_replay';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  videoId?: string;
  channelId?: string;
  payload?: any;
}

export interface MovionComment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatar: string;
  text: string;
  createdAt: number;
  likeCount: number;
  dislikeCount: number;
  isLiked: boolean;
  isDisliked: boolean;
  parentId?: string;
  pinned: boolean;
  isOwner: boolean;
  replies?: MovionComment[];
}

export interface UserEngagement {
  watchTime: Record<string, number>;
  progress: Record<string, number>;
  skips: Record<string, number>;
  likes: Set<string>;
  shares: Record<string, number>;
  topCategories: string[];
}

export interface LiveChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: number;
  isSuperChat: boolean;
  amount: string;
  color: string;
}

export interface UserEventLog {
  id: string;
  userId: string;
  action: string;
  videoId?: string;
  videoTitle?: string;
  channelId?: string;
  channelName?: string;
  sourcePlatform?: string;
  timestamp: number;
}
