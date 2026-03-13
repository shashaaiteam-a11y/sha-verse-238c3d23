/**
 * GroupService - Handles all group-related operations
 * Independent module for group management
 */

import { BaseService, ServiceResult, PaginationParams, PaginatedResult } from './BaseService';
import { EventBus, EVENTS } from '@/lib/events/EventBus';

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  cover_url?: string;
  creator_id: string;
  is_private: boolean;
  members_count: number;
  posts_count: number;
  require_join_approval: boolean;
  require_post_approval: boolean;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface GroupPost {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  pinned: boolean;
  is_announcement: boolean;
  approval_status: string;
  created_at: string;
  profiles?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
  };
  group?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

class GroupServiceClass extends BaseService {
  /**
   * Get all groups
   */
  async getGroups(params: PaginationParams = {}): Promise<ServiceResult<PaginatedResult<Group>>> {
    let query = this.supabase
      .from('groups')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    query = this.applyPagination(query, params);

    const { data, error, count } = await query;

    const limit = params.limit || 20;
    const page = params.page || 0;

    return this.handleResponse({
      data: data as Group[],
      total: count || 0,
      hasMore: (count || 0) > (page + 1) * limit,
      page,
    }, error);
  }

  /**
   * Get user's joined groups
   */
  async getUserGroups(): Promise<ServiceResult<Group[]>> {
    const userId = await this.requireAuth();

    const { data, error } = await this.supabase
      .from('group_members')
      .select(`
        groups (*)
      `)
      .eq('user_id', userId);

    if (error) {
      return this.handleResponse(null, error);
    }

    const groups = data?.map(d => d.groups).filter(Boolean) as Group[];
    return this.handleResponse(groups, null);
  }

  /**
   * Get a single group
   */
  async getGroup(groupId: string): Promise<ServiceResult<Group>> {
    const { data, error } = await this.supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    return this.handleResponse(data as Group, error);
  }

  /**
   * Create a new group
   */
  async createGroup(params: {
    name: string;
    description?: string;
    isPrivate?: boolean;
    avatarUrl?: string;
    coverUrl?: string;
  }): Promise<ServiceResult<Group>> {
    const userId = await this.requireAuth();

    const { data, error } = await this.supabase
      .from('groups')
      .insert({
        name: params.name,
        description: params.description,
        is_private: params.isPrivate || false,
        avatar_url: params.avatarUrl,
        cover_url: params.coverUrl,
        creator_id: userId,
      })
      .select()
      .single();

    if (!error && data) {
      // Add creator as admin member
      await this.supabase.from('group_members').insert({
        group_id: data.id,
        user_id: userId,
        role: 'admin',
      });
    }

    return this.handleResponse(data as Group, error);
  }

  /**
   * Join a group
   */
  async joinGroup(groupId: string): Promise<ServiceResult<boolean>> {
    const userId = await this.requireAuth();

    // Check if group requires approval
    const { data: group } = await this.supabase
      .from('groups')
      .select('require_join_approval')
      .eq('id', groupId)
      .single();

    if (group?.require_join_approval) {
      // Create join request
      const { error } = await this.supabase
        .from('group_join_requests')
        .insert({
          group_id: groupId,
          user_id: userId,
          status: 'pending',
        });

      return this.handleResponse(!error, error);
    }

    // Direct join
    const { error } = await this.supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        role: 'member',
      });

    if (!error) {
      EventBus.emit(EVENTS.GROUP_JOINED, { groupId });
    }

    return this.handleResponse(!error, error);
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId: string): Promise<ServiceResult<boolean>> {
    const userId = await this.requireAuth();

    const { error } = await this.supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (!error) {
      EventBus.emit(EVENTS.GROUP_LEFT, { groupId });
    }

    return this.handleResponse(!error, error);
  }

  /**
   * Check if user is a member
   */
  async isMember(groupId: string): Promise<ServiceResult<{ isMember: boolean; role?: string }>> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return this.handleResponse({ isMember: false }, null);
    }

    const { data, error } = await this.supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return this.handleResponse(null, error);
    }

    return this.handleResponse({
      isMember: !!data,
      role: data?.role,
    }, null);
  }

  /**
   * Get group posts
   */
  async getGroupPosts(groupId: string, params: PaginationParams = {}): Promise<ServiceResult<PaginatedResult<GroupPost>>> {
    let query = this.supabase
      .from('group_posts')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        ),
        groups:group_id (
          id,
          name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('group_id', groupId)
      .eq('approval_status', 'approved')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    query = this.applyPagination(query, params);

    const { data, error, count } = await query;

    const limit = params.limit || 20;
    const page = params.page || 0;

    return this.handleResponse({
      data: data as GroupPost[],
      total: count || 0,
      hasMore: (count || 0) > (page + 1) * limit,
      page,
    }, error);
  }

  /**
   * Create a group post
   */
  async createGroupPost(groupId: string, content: string, imageUrl?: string): Promise<ServiceResult<GroupPost>> {
    const userId = await this.requireAuth();

    // Check membership
    const membershipResult = await this.isMember(groupId);
    if (!membershipResult.data?.isMember) {
      return this.handleResponse(null, { message: 'You must be a member to post' });
    }

    // Check if posts require approval
    const { data: group } = await this.supabase
      .from('groups')
      .select('require_post_approval')
      .eq('id', groupId)
      .single();

    const approvalStatus = group?.require_post_approval && membershipResult.data.role === 'member' 
      ? 'pending' 
      : 'approved';

    const { data, error } = await this.supabase
      .from('group_posts')
      .insert({
        group_id: groupId,
        user_id: userId,
        content,
        image_url: imageUrl,
        approval_status: approvalStatus,
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
      EventBus.emit(EVENTS.GROUP_POST_CREATED, data);
    }

    return this.handleResponse(data as GroupPost, error);
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string): Promise<ServiceResult<GroupMember[]>> {
    const { data, error } = await this.supabase
      .from('group_members')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: false });

    return this.handleResponse(data as GroupMember[], error);
  }
}

// Singleton export
export const GroupService = new GroupServiceClass();
