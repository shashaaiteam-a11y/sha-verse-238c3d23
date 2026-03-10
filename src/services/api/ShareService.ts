/**
 * ShareService - Handles all sharing operations
 * Independent module for content sharing across timeline, groups, pages, and external platforms
 */

import { BaseService, ServiceResult } from './BaseService';
import { EventBus, EVENTS } from '@/lib/events/EventBus';

export type ShareTarget = 'timeline' | 'group' | 'page';
export type ContentType = 'post' | 'group_post' | 'video' | 'book' | 'page_post';

export interface ShareParams {
  contentId: string;
  contentType: ContentType;
  target: ShareTarget;
  targetId?: string; // group_id or page_id for group/page shares
  comment?: string;
}

export interface SharePermission {
  canShare: boolean;
  visibility: string;
  reason?: string;
}

class ShareServiceClass extends BaseService {
  /**
   * Share content to timeline
   */
  async shareToTimeline(contentId: string, contentType: ContentType, comment?: string): Promise<ServiceResult<any>> {
    const userId = await this.requireAuth();

    if (contentType === 'post') {
      const { data, error } = await this.supabase
        .from('shares')
        .insert({
          post_id: contentId,
          user_id: userId,
          comment,
        })
        .select()
        .single();

      if (!error) {
        EventBus.emit(EVENTS.SHARE_COMPLETED, { contentId, contentType, target: 'timeline' });
      }

      return this.handleResponse(data, error);
    }

    if (contentType === 'group_post') {
      const { data, error } = await this.supabase
        .from('shares')
        .insert({
          group_post_id: contentId,
          user_id: userId,
          comment,
        })
        .select()
        .single();

      if (!error) {
        EventBus.emit(EVENTS.SHARE_COMPLETED, { contentId, contentType, target: 'timeline' });
      }

      return this.handleResponse(data, error);
    }

    return this.handleResponse(null, { message: 'Unsupported content type for timeline share' });
  }

  /**
   * Share content to a group
   */
  async shareToGroup(contentId: string, contentType: ContentType, groupId: string, comment?: string): Promise<ServiceResult<any>> {
    const userId = await this.requireAuth();

    // Check if user is a member of the group
    const { data: membership } = await this.supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return this.handleResponse(null, { message: 'You must be a member of the group to share' });
    }

    // Create a group post that references the original content
    const shareContent = comment || `Shared a ${contentType}`;
    
    const { data, error } = await this.supabase
      .from('group_posts')
      .insert({
        group_id: groupId,
        user_id: userId,
        content: shareContent,
        // Store reference to original content in metadata or as a special field
      })
      .select()
      .single();

    if (!error) {
      EventBus.emit(EVENTS.SHARE_COMPLETED, { contentId, contentType, target: 'group', targetId: groupId });
      EventBus.emit(EVENTS.GROUP_POST_CREATED, data);
    }

    return this.handleResponse(data, error);
  }

  /**
   * Share content to a page
   */
  async shareToPage(contentId: string, contentType: ContentType, pageId: string, comment?: string): Promise<ServiceResult<any>> {
    const userId = await this.requireAuth();

    // Check if user is an admin of the page
    const { data: role } = await this.supabase
      .from('page_roles')
      .select('role')
      .eq('page_id', pageId)
      .eq('user_id', userId)
      .single();

    if (!role || !['admin', 'editor'].includes(role.role)) {
      return this.handleResponse(null, { message: 'You must be an admin or editor to share to this page' });
    }

    const shareContent = comment || `Shared a ${contentType}`;

    const { data, error } = await this.supabase
      .from('page_posts')
      .insert({
        page_id: pageId,
        posted_by: userId,
        content: shareContent,
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error) {
      EventBus.emit(EVENTS.SHARE_COMPLETED, { contentId, contentType, target: 'page', targetId: pageId });
      EventBus.emit(EVENTS.PAGE_POST_CREATED, data);
    }

    return this.handleResponse(data, error);
  }

  /**
   * Check if content can be shared based on privacy settings
   */
  async checkSharePermission(contentId: string, contentType: ContentType): Promise<ServiceResult<SharePermission>> {
    const userId = await this.getCurrentUserId();

    if (contentType === 'post') {
      const { data: post, error } = await this.supabase
        .from('posts')
        .select('visibility, user_id')
        .eq('id', contentId)
        .single();

      if (error || !post) {
        return this.handleResponse({ canShare: false, visibility: 'unknown', reason: 'Content not found' }, null);
      }

      if (post.visibility === 'private') {
        return this.handleResponse({ canShare: false, visibility: 'private', reason: 'Private content cannot be shared' }, null);
      }

      if (post.visibility === 'friends' && post.user_id !== userId) {
        const { data: friendship } = await this.supabase
          .from('friendships')
          .select('id')
          .or(`and(user_id.eq.${post.user_id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${post.user_id})`)
          .eq('status', 'accepted')
          .limit(1);

        if (!friendship || friendship.length === 0) {
          return this.handleResponse({ canShare: false, visibility: 'friends', reason: 'Only friends can share this content' }, null);
        }
      }

      return this.handleResponse({ canShare: true, visibility: post.visibility }, null);
    }

    // Group posts are shareable if user is in the group
    if (contentType === 'group_post') {
      const { data: post } = await this.supabase
        .from('group_posts')
        .select('group_id')
        .eq('id', contentId)
        .single();

      if (!post) {
        return this.handleResponse({ canShare: false, visibility: 'unknown', reason: 'Content not found' }, null);
      }

      const { data: membership } = await this.supabase
        .from('group_members')
        .select('id')
        .eq('group_id', post.group_id)
        .eq('user_id', userId)
        .single();

      if (!membership) {
        return this.handleResponse({ canShare: false, visibility: 'group', reason: 'You must be a group member to share' }, null);
      }

      return this.handleResponse({ canShare: true, visibility: 'group' }, null);
    }

    // Videos and books are generally public
    if (contentType === 'video' || contentType === 'book') {
      return this.handleResponse({ canShare: true, visibility: 'public' }, null);
    }

    return this.handleResponse({ canShare: true, visibility: 'public' }, null);
  }

  /**
   * Generate external share URL
   */
  generateExternalShareUrl(contentId: string, contentType: ContentType): string {
    const baseUrl = window.location.origin;
    const pathMap: Record<ContentType, string> = {
      post: `/post/${contentId}`,
      group_post: `/group-post/${contentId}`,
      video: `/video/${contentId}`,
      book: `/bookshelf/book/${contentId}`,
      page_post: `/page-post/${contentId}`,
    };

    return `${baseUrl}${pathMap[contentType] || `/content/${contentId}`}`;
  }

  /**
   * Share to external platforms
   */
  shareToExternal(contentId: string, contentType: ContentType, platform: string, title?: string): void {
    const url = encodeURIComponent(this.generateExternalShareUrl(contentId, contentType));
    const text = encodeURIComponent(title || 'Check this out!');
    
    const platformUrls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      messenger: `fb-messenger://share?link=${url}`,
      email: `mailto:?subject=${text}&body=${url}`,
    };

    const shareUrl = platformUrls[platform];
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Copy share link to clipboard
   */
  async copyShareLink(contentId: string, contentType: ContentType): Promise<ServiceResult<boolean>> {
    try {
      const url = this.generateExternalShareUrl(contentId, contentType);
      await navigator.clipboard.writeText(url);
      return this.handleResponse(true, null);
    } catch (error: any) {
      return this.handleResponse(false, error);
    }
  }
}

// Singleton export
export const ShareService = new ShareServiceClass();
