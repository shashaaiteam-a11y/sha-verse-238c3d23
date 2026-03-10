// Motion Module Type Definitions
// Completely independent from other modules

export interface Motion {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  hls_url?: string | null;
  duration?: number | null;
  views_count?: number | null;
  likes_count?: number | null;
  comments_count?: number | null;
  category?: string | null;
  tags?: string[] | null;
  is_short?: boolean | null;
  transcoding_status?: string | null;
  created_at?: string | null;
  channel_id: string;
  channels?: Creator | null;
}

export interface Creator {
  id: string;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  subscribers_count?: number | null;
  user_id: string;
  channel_type: string;
  created_at?: string | null;
  badge?: CreatorBadge | null;
}

export interface CreatorBadge {
  id: string;
  channel_id: string;
  badge_level: 'newcomer' | 'rising' | 'established' | 'verified' | 'partner';
  badge_icon_url?: string | null;
  verified_at?: string | null;
  total_followers: number;
  total_boosts_received: number;
  total_motions: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  earned_at: string;
}

export interface Boost {
  id: string;
  video_id?: string | null;
  sender_id: string;
  channel_id: string;
  amount_cents: number;
  message?: string | null;
  boost_tier: 'spark' | 'flame' | 'blaze' | 'supernova';
  animation_type: 'sparkle' | 'fire' | 'lightning' | 'cosmic';
  is_highlighted: boolean;
  created_at: string;
  sender?: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
  };
}

export interface CreatorEarnings {
  id: string;
  channel_id: string;
  period_start: string;
  period_end: string;
  ad_revenue_cents: number;
  boost_revenue_cents: number;
  membership_revenue_cents: number;
  total_views: number;
  total_watch_minutes: number;
}

export interface MotionComment {
  id: string;
  content: string;
  video_id: string;
  user_id: string;
  created_at: string;
  profiles?: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
  };
}

export type MotionCategory = 
  | 'All'
  | 'Tech'
  | 'Comedy'
  | 'Education'
  | 'Music'
  | 'Gaming'
  | 'News'
  | 'Quick'
  | 'Lifestyle'
  | 'Sports';

export interface MotionFilter {
  category?: MotionCategory;
  creatorId?: string;
  searchQuery?: string;
  isShort?: boolean;
  sortBy?: 'recent' | 'popular' | 'trending';
}

// Boost tier pricing in cents
export const BOOST_TIERS = {
  spark: { amount: 2900, label: '₹29', color: 'cyan' },
  flame: { amount: 5900, label: '₹59', color: 'orange' },
  blaze: { amount: 9900, label: '₹99', color: 'purple' },
  supernova: { amount: 0, label: 'Custom', color: 'gold' }, // Custom amount
} as const;

// Badge level requirements
export const BADGE_LEVELS = {
  newcomer: { followers: 0, motions: 0, label: 'Newcomer' },
  rising: { followers: 100, motions: 10, label: 'Rising Star' },
  established: { followers: 1000, motions: 50, label: 'Established' },
  verified: { followers: 10000, motions: 100, label: 'Verified' },
  partner: { followers: 100000, motions: 500, label: 'Partner' },
} as const;
