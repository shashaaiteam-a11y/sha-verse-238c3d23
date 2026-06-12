/**
 * PageService - Handles all page-related operations
 * Independent module for page management
 */

import { BaseService, ServiceResult, PaginationParams, PaginatedResult } from './BaseService';
import { EventBus, EVENTS } from '@/lib/events/EventBus';
import { PAGE_PUBLIC_COLUMNS } from '@/lib/constants/pages';

export interface Page {
  id: string;
  name: string;
  slug?: string;
  category?: string;
  about?: string;
  avatar_url?: string;
  cover_url?: string;
  created_by: string;
  followers_count: number;
  verified: boolean;
  website?: string;
  email?: string;
  phone?: string;
  location?: string;
  hours?: string;
  created_at: string;
}

export interface PagePost {
  id: string;
  page_id: string;
  posted_by: string;
  content: string;
  image_url?: string;
  media_urls?: string[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_published: boolean;
  scheduled_at?: string;
  published_at?: string;
  created_at: string;
  profiles?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  pages?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export interface PageRole {
  id: string;
  page_id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'moderator' | 'analyst';
  assigned_at: string;
}

class PageServiceClass extends BaseService {
  /**
   * Get all pages
   */
  async getPages(params: PaginationParams = {}): Promise<ServiceResult<PaginatedResult<Page>>> {
    let query = this.supabase
      .from('pages')
      .select(PAGE_PUBLIC_COLUMNS, { count: 'exact' })
      .order('followers_count', { ascending: false });

    query = this.applyPagination(query, params);

    const { data, error, count } = await query;

    const limit = params.limit || 20;
    const page = params.page || 0;

    return this.handleResponse({
      data: data as Page[],
      total: count || 0,
      hasMore: (count || 0) > (page + 1) * limit,
      page,
    }, error);
  }

  /**
   * Get user's managed pages
   */
  async getUserPages(): Promise<ServiceResult<Page[]>> {
    const userId = await this.requireAuth();

    const { data, error } = await this.supabase
      .from('page_roles')
      .select(`
        pages (${PAGE_PUBLIC_COLUMNS})
      `)
      .eq('user_id', userId);

    if (error) {
      return this.handleResponse(null, error);
    }

    const pages = data?.map(d => d.pages).filter(Boolean) as Page[];
    return this.handleResponse(pages, null);
  }

  /**
   * Get a single page
   */
  async getPage(pageId: string): Promise<ServiceResult<Page>> {
    const { data, error } = await this.supabase
      .from('pages')
      .select(PAGE_PUBLIC_COLUMNS)
      .eq('id', pageId)
      .single();

    return this.handleResponse(data as Page, error);
  }

  /**
   * Create a new page
   */
  async createPage(params: {
    name: string;
    category?: string;
    about?: string;
    avatarUrl?: string;
    coverUrl?: string;
  }): Promise<ServiceResult<Page>> {
    const userId = await this.requireAuth();

    const { data, error } = await this.supabase
      .from('pages')
      .insert({
        name: params.name,
        category: params.category,
        about: params.about,
        avatar_url: params.avatarUrl,
        cover_url: params.coverUrl,
        created_by: userId,
      })
      .select(PAGE_PUBLIC_COLUMNS)
      .single();

    if (!error && data) {
      // Add creator as admin
      await this.supabase.from('page_roles').insert({
        page_id: data.id,
        user_id: userId,
        role: 'admin',
      });
    }

    return this.handleResponse(data as Page, error);
  }

  /**
   * Follow a page
   */
  async followPage(pageId: string): Promise<ServiceResult<boolean>> {
    const userId = await this.requireAuth();

    const { error } = await this.supabase
      .from('page_followers')
      .insert({
        page_id: pageId,
        user_id: userId,
      });

    if (!error) {
      EventBus.emit(EVENTS.PAGE_FOLLOWED, { pageId });
    }

    return this.handleResponse(!error, error);
  }

  /**
   * Unfollow a page
   */
  async unfollowPage(pageId: string): Promise<ServiceResult<boolean>> {
    const userId = await this.requireAuth();

    const { error } = await this.supabase
      .from('page_followers')
      .delete()
      .eq('page_id', pageId)
      .eq('user_id', userId);

    if (!error) {
      EventBus.emit(EVENTS.PAGE_UNFOLLOWED, { pageId });
    }

    return this.handleResponse(!error, error);
  }

  /**
   * Check if user follows a page
   */
  async isFollowing(pageId: string): Promise<ServiceResult<boolean>> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return this.handleResponse(false, null);
    }

    const { data, error } = await this.supabase
      .from('page_followers')
      .select('id')
      .eq('page_id', pageId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return this.handleResponse(null, error);
    }

    return this.handleResponse(!!data, null);
  }

  /**
   * Get user's role on a page
   */
  async getUserRole(pageId: string): Promise<ServiceResult<string | null>> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return this.handleResponse(null, null);
    }

    const { data, error } = await this.supabase
      .from('page_roles')
      .select('role')
      .eq('page_id', pageId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return this.handleResponse(null, error);
    }

    return this.handleResponse(data?.role || null, null);
  }

  /**
   * Get page posts
   */
  async getPagePosts(pageId: string, params: PaginationParams = {}): Promise<ServiceResult<PaginatedResult<PagePost>>> {
    let query = this.supabase
      .from('page_posts')
      .select(`
        *,
        profiles:posted_by (
          id,
          username,
          display_name,
          avatar_url
        ),
        pages:page_id (
          id,
          name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('page_id', pageId)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    query = this.applyPagination(query, params);

    const { data, error, count } = await query;

    const limit = params.limit || 20;
    const page = params.page || 0;

    return this.handleResponse({
      data: data as PagePost[],
      total: count || 0,
      hasMore: (count || 0) > (page + 1) * limit,
      page,
    }, error);
  }

  /**
   * Create a page post
   */
  async createPagePost(pageId: string, content: string, imageUrl?: string): Promise<ServiceResult<PagePost>> {
    const userId = await this.requireAuth();

    // Check role
    const roleResult = await this.getUserRole(pageId);
    if (!roleResult.data || !['admin', 'editor'].includes(roleResult.data)) {
      return this.handleResponse(null, { message: 'You must be an admin or editor to post' });
    }

    const { data, error } = await this.supabase
      .from('page_posts')
      .insert({
        page_id: pageId,
        posted_by: userId,
        content,
        image_url: imageUrl,
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .select(`
        *,
        profiles:posted_by (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (!error && data) {
      EventBus.emit(EVENTS.PAGE_POST_CREATED, data);
    }

    return this.handleResponse(data as PagePost, error);
  }
}

// Singleton export
export const PageService = new PageServiceClass();
