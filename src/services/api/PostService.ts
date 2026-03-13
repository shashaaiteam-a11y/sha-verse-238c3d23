/**
 * PostService - Handles all post-related API operations
 * Completely independent module for post CRUD operations
 */

import { BaseService, ServiceResult, PaginationParams, PaginatedResult } from './BaseService';
import { EventBus, EVENTS } from '@/lib/events/EventBus';

export interface Post {
  id: string;
  content: string;
  user_id: string;
  image_url?: string | null;
  media_urls?: string[] | null;
  visibility: 'public' | 'friends' | 'private';
  likes_count: number;
  comments_count: number;
  shares_count: number;
  pinned: boolean;
  poll_data?: any;
  metadata?: any;
  created_at: string;
  profiles?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
  };
}

export interface CreatePostParams {
  content: string;
  imageUrl?: string;
  mediaUrls?: string[];
  visibility?: 'public' | 'friends' | 'private';
  pollData?: any;
  feeling?: string;
}

export interface UpdatePostParams {
  content?: string;
  imageUrl?: string;
  mediaUrls?: string[];
  visibility?: 'public' | 'friends' | 'private';
  pinned?: boolean;
}

class PostServiceClass extends BaseService {
  /**
   * Get posts for feed
   */
  async getPosts(params: PaginationParams = {}): Promise<ServiceResult<PaginatedResult<Post>>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return this.handleResponse(null, { message: 'Not authenticated' });
      }

      // Get friend IDs
      const { data: friendships } = await this.supabase
        .from('friendships')
        .select('friend_id, user_id')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      const friendIds = friendships?.map(f => 
        f.user_id === userId ? f.friend_id : f.user_id
      ) || [];

      // Build visibility filter:
      // - Public posts from friends and self
      // - Friends-only posts from friends and self
      // - Private posts only from self
      let visibilityFilter = '';
      if (friendIds.length > 0) {
        const friendsList = friendIds.join(',');
        visibilityFilter = `and(visibility.eq.public,or(user_id.eq.${userId},user_id.in.(${friendsList}))),and(visibility.eq.friends,or(user_id.eq.${userId},user_id.in.(${friendsList}))),and(visibility.eq.private,user_id.eq.${userId})`;
      } else {
        // No friends - only show own posts
        visibilityFilter = `user_id.eq.${userId}`;
      }

      let query = this.supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `, { count: 'exact' })
        .or(visibilityFilter)
        .order('created_at', { ascending: false });

      query = this.applyPagination(query, params);

      const { data, error, count } = await query;

      if (error) {
        return this.handleResponse(null, error);
      }

      const limit = params.limit || 20;
      const page = params.page || 0;

      return this.handleResponse({
        data: data as Post[],
        total: count || 0,
        hasMore: (count || 0) > (page + 1) * limit,
        page,
      }, null);
    } catch (error: any) {
      return this.handleResponse(null, error);
    }
  }

  /**
   * Get a single post by ID
   */
  async getPost(postId: string): Promise<ServiceResult<Post>> {
    const { data, error } = await this.supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('id', postId)
      .single();

    return this.handleResponse(data as Post, error);
  }

  /**
   * Get posts by user ID
   */
  async getUserPosts(userId: string, params: PaginationParams = {}): Promise<ServiceResult<PaginatedResult<Post>>> {
    const currentUserId = await this.getCurrentUserId();
    
    let query = this.supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `, { count: 'exact' })
      .eq('user_id', userId);

    // If not viewing own posts, apply visibility filter
    if (currentUserId && currentUserId !== userId) {
      // Get friendship status
      const { data: friendship } = await this.supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${userId},friend_id.eq.${currentUserId}),and(user_id.eq.${currentUserId},friend_id.eq.${userId})`)
        .eq('status', 'accepted')
        .limit(1);
      
      const isFriend = friendship && friendship.length > 0;
      
      if (isFriend) {
        // Friends can see public and friends-only posts
        query = query.or('visibility.eq.public,visibility.eq.friends');
      } else {
        // Non-friends can only see public posts
        query = query.eq('visibility', 'public');
      }
    }
    // Own profile: show all posts (no visibility filter needed)

    query = query.order('created_at', { ascending: false });
    query = this.applyPagination(query, params);

    const { data, error, count } = await query;

    const limit = params.limit || 20;
    const page = params.page || 0;

    return this.handleResponse({
      data: data as Post[],
      total: count || 0,
      hasMore: (count || 0) > (page + 1) * limit,
      page,
    }, error);
  }

  /**
   * Create a new post
   */
  async createPost(params: CreatePostParams): Promise<ServiceResult<Post>> {
    const userId = await this.requireAuth();

    const { data, error } = await this.supabase
      .from('posts')
      .insert({
        content: params.content,
        user_id: userId,
        image_url: params.imageUrl,
        media_urls: params.mediaUrls,
        visibility: params.visibility || 'public',
        poll_data: params.pollData,
        metadata: params.feeling ? { feeling: params.feeling } : {},
      })
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .single();

    if (!error && data) {
      EventBus.emit(EVENTS.FEED_POST_CREATED, data);
    }

    return this.handleResponse(data as Post, error);
  }

  /**
   * Update an existing post
   */
  async updatePost(postId: string, params: UpdatePostParams): Promise<ServiceResult<Post>> {
    const userId = await this.requireAuth();

    const { data, error } = await this.supabase
      .from('posts')
      .update({
        content: params.content,
        image_url: params.imageUrl,
        media_urls: params.mediaUrls,
        visibility: params.visibility,
        pinned: params.pinned,
        edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId)
      .select()
      .single();

    if (!error && data) {
      EventBus.emit(EVENTS.FEED_POST_UPDATED, data);
    }

    return this.handleResponse(data as Post, error);
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<ServiceResult<boolean>> {
    const userId = await this.requireAuth();

    const { error } = await this.supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId);

    if (!error) {
      EventBus.emit(EVENTS.FEED_POST_DELETED, { postId });
    }

    return this.handleResponse(!error, error);
  }

  /**
   * Check post visibility for sharing
   */
  async checkSharePermission(postId: string): Promise<ServiceResult<{ canShare: boolean; visibility: string; reason?: string }>> {
    const userId = await this.getCurrentUserId();

    const { data: post, error } = await this.supabase
      .from('posts')
      .select('visibility, user_id')
      .eq('id', postId)
      .single();

    if (error || !post) {
      return this.handleResponse({ canShare: false, visibility: 'unknown', reason: 'Post not found' }, null);
    }

    if (post.visibility === 'private') {
      return this.handleResponse({ canShare: false, visibility: 'private', reason: 'Private posts cannot be shared' }, null);
    }

    if (post.visibility === 'friends' && post.user_id !== userId) {
      // Check if they are friends
      const { data: friendship } = await this.supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${post.user_id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${post.user_id})`)
        .eq('status', 'accepted')
        .limit(1);

      if (!friendship || friendship.length === 0) {
        return this.handleResponse({ canShare: false, visibility: 'friends', reason: 'Only friends can share this post' }, null);
      }
    }

    return this.handleResponse({ canShare: true, visibility: post.visibility }, null);
  }
}

// Singleton export
export const PostService = new PostServiceClass();
