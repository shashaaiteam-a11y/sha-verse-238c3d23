/**
 * StoryService - Handles all story-related operations
 * Independent module for story CRUD and interactions
 */

import { BaseService, ServiceResult } from './BaseService';
import { EventBus, EVENTS } from '@/lib/events/EventBus';
import { compressForUpload } from '@/lib/media/compressFile';

export interface Story {
  id: string;
  user_id: string;
  media_url?: string;
  media_type: 'image' | 'video' | 'text';
  caption?: string;
  background_color?: string;
  text_content?: string;
  created_at: string;
  expires_at: string;
  profiles?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface StoryGroup {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  stories: Story[];
  hasUnviewed: boolean;
  latestStoryTime: string;
}

export interface CreateStoryParams {
  file?: File;
  caption?: string;
  textContent?: string;
  backgroundColor?: string;
  mediaType?: 'image' | 'video' | 'text';
}

class StoryServiceClass extends BaseService {
  /**
   * Get all active stories
   */
  async getStories(): Promise<ServiceResult<Story[]>> {
    const { data, error } = await this.supabase
      .from('stories')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    return this.handleResponse(data as Story[], error);
  }

  /**
   * Get user's viewed story IDs
   */
  async getViewedStoryIds(): Promise<ServiceResult<string[]>> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return this.handleResponse([], null);
    }

    const { data, error } = await this.supabase
      .from('story_views')
      .select('story_id')
      .eq('viewer_id', userId);

    if (error) {
      return this.handleResponse([], error);
    }

    return this.handleResponse(data?.map(v => v.story_id) || [], null);
  }

  /**
   * Get stories grouped by user
   */
  async getStoryGroups(): Promise<ServiceResult<StoryGroup[]>> {
    const [storiesResult, viewedResult] = await Promise.all([
      this.getStories(),
      this.getViewedStoryIds(),
    ]);

    if (!storiesResult.success || !storiesResult.data) {
      return this.handleResponse([], storiesResult.error);
    }

    const viewedIds = new Set(viewedResult.data || []);
    const groupMap = new Map<string, StoryGroup>();

    storiesResult.data.forEach(story => {
      if (!story.profiles) return;

      const userId = story.user_id;
      if (!groupMap.has(userId)) {
        groupMap.set(userId, {
          userId,
          username: story.profiles.username,
          displayName: story.profiles.display_name,
          avatarUrl: story.profiles.avatar_url,
          stories: [],
          hasUnviewed: false,
          latestStoryTime: story.created_at,
        });
      }

      const group = groupMap.get(userId)!;
      group.stories.push(story);

      if (!viewedIds.has(story.id)) {
        group.hasUnviewed = true;
      }

      if (new Date(story.created_at) > new Date(group.latestStoryTime)) {
        group.latestStoryTime = story.created_at;
      }
    });

    // Sort: unviewed first, then by latest story time
    const groups = Array.from(groupMap.values()).sort((a, b) => {
      if (a.hasUnviewed !== b.hasUnviewed) {
        return a.hasUnviewed ? -1 : 1;
      }
      return new Date(b.latestStoryTime).getTime() - new Date(a.latestStoryTime).getTime();
    });

    return this.handleResponse(groups, null);
  }

  /**
   * Create a media story
   */
  async createStory(params: CreateStoryParams): Promise<ServiceResult<Story>> {
    const userId = await this.requireAuth();

    let mediaUrl: string | undefined;
    let mediaType = params.mediaType || 'image';

    if (params.file) {
      // Compress media before upload (image/video). Safe no-op on failure.
      const uploadFile = await compressForUpload(params.file);
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await this.supabase.storage
        .from('stories')
        .upload(fileName, uploadFile);

      if (uploadError) {
        return this.handleResponse(null, uploadError);
      }

      const { data: urlData } = this.supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      mediaUrl = urlData.publicUrl;
      mediaType = params.file.type.startsWith('video/') ? 'video' : 'image';
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data, error } = await this.supabase
      .from('stories')
      .insert({
        user_id: userId,
        media_url: mediaUrl,
        media_type: mediaType,
        caption: params.caption,
        text_content: params.textContent,
        background_color: params.backgroundColor,
        expires_at: expiresAt.toISOString(),
      })
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (!error && data) {
      EventBus.emit(EVENTS.STORY_CREATED, data);
    }

    return this.handleResponse(data as Story, error);
  }

  /**
   * Create a text story
   */
  async createTextStory(textContent: string, backgroundColor: string): Promise<ServiceResult<Story>> {
    return this.createStory({
      textContent,
      backgroundColor,
      mediaType: 'text',
    });
  }

  /**
   * Mark story as viewed
   */
  async viewStory(storyId: string): Promise<ServiceResult<boolean>> {
    const userId = await this.requireAuth();

    const { error } = await this.supabase
      .from('story_views')
      .upsert({
        story_id: storyId,
        viewer_id: userId,
      }, {
        onConflict: 'story_id,viewer_id',
      });

    if (!error) {
      EventBus.emit(EVENTS.STORY_VIEWED, { storyId });
    }

    return this.handleResponse(!error, error);
  }

  /**
   * Delete a story
   */
  async deleteStory(storyId: string): Promise<ServiceResult<boolean>> {
    const userId = await this.requireAuth();

    const { error } = await this.supabase
      .from('stories')
      .delete()
      .eq('id', storyId)
      .eq('user_id', userId);

    if (!error) {
      EventBus.emit(EVENTS.STORY_DELETED, { storyId });
    }

    return this.handleResponse(!error, error);
  }

  /**
   * React to a story
   */
  async reactToStory(storyId: string, reaction: string): Promise<ServiceResult<boolean>> {
    const userId = await this.requireAuth();

    const { error } = await this.supabase
      .from('story_reactions')
      .insert({
        story_id: storyId,
        user_id: userId,
        reaction_type: reaction,
      });

    return this.handleResponse(!error, error);
  }

  /**
   * Get story viewers
   */
  async getStoryViewers(storyId: string): Promise<ServiceResult<any[]>> {
    const { data, error } = await this.supabase
      .from('story_views')
      .select(`
        *,
        profiles:viewer_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('story_id', storyId)
      .order('viewed_at', { ascending: false });

    return this.handleResponse(data || [], error);
  }
}

// Singleton export
export const StoryService = new StoryServiceClass();
