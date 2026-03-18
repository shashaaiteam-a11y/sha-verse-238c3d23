import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

// ReactionType is now any emoji string (not just predefined types)
type ReactionType = string;
type TargetType = 'post' | 'group_post' | 'comment' | 'video';

export const useReactions = (targetId: string, targetType: TargetType = 'post') => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Helper to build filter
  const getFilter = () => {
    if (targetType === 'post') return { post_id: targetId };
    if (targetType === 'group_post') return { group_post_id: targetId };
    if (targetType === 'video') return { video_id: targetId };
    return { comment_id: targetId };
  };

  // Get user's current reaction
  const { data: userReaction } = useQuery({
    queryKey: ['user-reaction', targetId, targetType, user?.id],
    queryFn: async (): Promise<ReactionType | null> => {
      if (!user) return null;

      let query = supabase
        .from('likes')
        .select('id, reaction_type')
        .eq('user_id', user.id);

      if (targetType === 'post') {
        query = query.eq('post_id', targetId);
      } else if (targetType === 'group_post') {
        query = query.eq('group_post_id', targetId);
      } else if (targetType === 'video') {
        query = query.eq('video_id', targetId);
      } else {
        query = query.eq('comment_id', targetId);
      }

      const { data } = await query.limit(1);
      return (data?.[0]?.reaction_type as ReactionType) || null;
    },
    enabled: !!user && !!targetId,
  });

  // Get all reaction counts for this target
  const { data: reactionCounts = {} } = useQuery({
    queryKey: ['reaction-counts', targetId, targetType],
    queryFn: async (): Promise<Record<string, number>> => {
      let query = supabase.from('likes').select('reaction_type');

      if (targetType === 'post') {
        query = query.eq('post_id', targetId);
      } else if (targetType === 'group_post') {
        query = query.eq('group_post_id', targetId);
      } else if (targetType === 'video') {
        query = query.eq('video_id', targetId);
      } else {
        query = query.eq('comment_id', targetId);
      }

      const { data } = await query;
      if (!data) return {};

      // Count reactions by type
      const counts: Record<string, number> = {};
      data.forEach((item) => {
        const type = (item.reaction_type as string) || 'like';
        counts[type] = (counts[type] || 0) + 1;
      });

      return counts;
    },
    enabled: !!targetId,
  });

  // Toggle reaction - IMPORTANT: Reactions are FINAL and cannot be changed once added
  const toggleReaction = useMutation({
    mutationFn: async (reactionEmoji: ReactionType) => {
      if (!user) throw new Error('Not authenticated');

      // Check if user already has a reaction on this target
      let checkQuery = supabase
        .from('likes')
        .select('id, reaction_type')
        .eq('user_id', user.id);

      if (targetType === 'post') {
        checkQuery = checkQuery.eq('post_id', targetId);
      } else if (targetType === 'group_post') {
        checkQuery = checkQuery.eq('group_post_id', targetId);
      } else if (targetType === 'video') {
        checkQuery = checkQuery.eq('video_id', targetId);
      } else {
        checkQuery = checkQuery.eq('comment_id', targetId);
      }

      const { data: existingArr } = await checkQuery.limit(1);
      const existing = existingArr?.[0];

      if (existing) {
        // User has already reacted - REACTION IS FINAL, cannot be changed
        // Silently ignore the request (no update, no remove allowed)
        return { action: 'already_reacted', type: existing.reaction_type };
      } else {
        // No existing reaction - create new one (this is the ONLY allowed action)
        const insertData: Record<string, string> = {
          user_id: user.id,
          reaction_type: reactionEmoji,
        };
        
        if (targetType === 'post') {
          insertData.post_id = targetId;
        } else if (targetType === 'group_post') {
          insertData.group_post_id = targetId;
        } else if (targetType === 'video') {
          insertData.video_id = targetId;
        } else {
          insertData.comment_id = targetId;
        }

        await supabase.from('likes').insert(insertData as any);
        return { action: 'added', type: reactionEmoji };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-reaction', targetId, targetType] });
      queryClient.invalidateQueries({ queryKey: ['reaction-counts', targetId, targetType] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });
    },
  });

  // Realtime subscription for reactions
  useEffect(() => {
    if (!targetId) return;

    const filterColumn = targetType === 'post' ? 'post_id' : targetType === 'group_post' ? 'group_post_id' : 'comment_id';

    const channel = supabase
      .channel(`reactions-${targetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `${filterColumn}=eq.${targetId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reaction-counts', targetId, targetType] });
          queryClient.invalidateQueries({ queryKey: ['user-reaction', targetId, targetType] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetId, targetType, queryClient]);

  return {
    userReaction,
    reactionCounts,
    toggleReaction,
  };
};