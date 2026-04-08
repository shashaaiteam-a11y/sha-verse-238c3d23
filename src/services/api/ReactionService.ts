/**
 * ReactionService - Handles all reaction/like operations
 * Independent module for managing reactions across different content types
 */

import { BaseService, ServiceResult } from './BaseService';
import { EventBus, EVENTS } from '@/lib/events/EventBus';

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';
export type TargetType = 'post' | 'group_post' | 'comment' | 'video' | 'book';

export interface Reaction {
  id: string;
  user_id: string;
  reaction_type: ReactionType;
  post_id?: string;
  group_post_id?: string;
  comment_id?: string;
  video_id?: string;
  book_id?: string;
  created_at: string;
}

export interface ReactionCounts {
  [key: string]: number;
}

export interface ToggleReactionResult {
  action: 'added' | 'removed' | 'updated';
  type: ReactionType;
}

class ReactionServiceClass extends BaseService {
  /**
   * Get column name based on target type
   */
  private getColumnName(targetType: TargetType): 'post_id' | 'group_post_id' | 'comment_id' | 'video_id' | 'book_id' {
    const columnMap: Record<TargetType, 'post_id' | 'group_post_id' | 'comment_id' | 'video_id' | 'book_id'> = {
      post: 'post_id',
      group_post: 'group_post_id',
      comment: 'comment_id',
      video: 'video_id',
      book: 'book_id',
    };
    return columnMap[targetType];
  }

  /**
   * Get user's reaction on a specific target
   */
  async getUserReaction(targetId: string, targetType: TargetType): Promise<ServiceResult<ReactionType | null>> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return this.handleResponse(null, null);
    }

    const column = this.getColumnName(targetType);

    const { data, error } = await this.supabase
      .from('likes')
      .select('reaction_type')
      .eq('user_id', userId)
      .eq(column, targetId)
      .limit(1);

    if (error) {
      return this.handleResponse(null, error);
    }

    return this.handleResponse(data?.[0]?.reaction_type as ReactionType || null, null);
  }

  /**
   * Get reaction counts for a target
   */
  async getReactionCounts(targetId: string, targetType: TargetType): Promise<ServiceResult<ReactionCounts>> {
    const column = this.getColumnName(targetType);

    const { data, error } = await this.supabase
      .from('likes')
      .select('reaction_type')
      .eq(column, targetId);

    if (error) {
      return this.handleResponse({}, error);
    }

    const counts: ReactionCounts = {};
    data?.forEach((item) => {
      const type = item.reaction_type || 'like';
      counts[type] = (counts[type] || 0) + 1;
    });

    return this.handleResponse(counts, null);
  }

  /**
   * Toggle reaction on a target
   */
  async toggleReaction(
    targetId: string, 
    targetType: TargetType, 
    reactionType: ReactionType
  ): Promise<ServiceResult<ToggleReactionResult>> {
    const userId = await this.requireAuth();
    const column = this.getColumnName(targetType);

    // Check for existing reaction
    const { data: existingArr } = await this.supabase
      .from('likes')
      .select('id, reaction_type')
      .eq('user_id', userId)
      .eq(column, targetId)
      .limit(1);
    const existing = existingArr?.[0];

    let result: ToggleReactionResult;

    if (existing) {
      if (existing.reaction_type === reactionType) {
        // Same reaction - remove it
        const { error } = await this.supabase
          .from('likes')
          .delete()
          .eq('id', existing.id);

        if (error) {
          return this.handleResponse(null, error);
        }

        result = { action: 'removed', type: reactionType };
        EventBus.emit(EVENTS.REACTION_REMOVED, { targetId, targetType, reactionType });
      } else {
        // Different reaction - update it
        const { error } = await this.supabase
          .from('likes')
          .update({ reaction_type: reactionType })
          .eq('id', existing.id);

        if (error) {
          return this.handleResponse(null, error);
        }

        result = { action: 'updated', type: reactionType };
        EventBus.emit(EVENTS.REACTION_UPDATED, { targetId, targetType, reactionType });
      }
    } else {
      // No existing reaction - create new
      const insertData = {
        user_id: userId,
        reaction_type: reactionType,
        [column]: targetId,
      };

      const { error } = await this.supabase
        .from('likes')
        .insert(insertData as any);

      if (error) {
        return this.handleResponse(null, error);
      }

      result = { action: 'added', type: reactionType };
      EventBus.emit(EVENTS.REACTION_ADDED, { targetId, targetType, reactionType });
    }

    return this.handleResponse(result, null);
  }

  /**
   * Get all reactions for a target with user info
   */
  async getReactionsWithUsers(targetId: string, targetType: TargetType): Promise<ServiceResult<Reaction[]>> {
    const column = this.getColumnName(targetType);

    const { data, error } = await this.supabase
      .from('likes')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq(column, targetId);

    return this.handleResponse(data as Reaction[], error);
  }
}

// Singleton export
export const ReactionService = new ReactionServiceClass();
