import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useEffect } from 'react';

export const useGroupPosts = (groupId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch group posts
  const { data: posts, isLoading } = useQuery({
    queryKey: ['group-posts', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('group_posts')
        .select(`
          id,
          content,
          image_url,
          video_url,
          file_url,
          file_name,
          file_type,
          post_type,
          likes_count,
          comments_count,
          created_at,
          user_id,
          profiles:user_id (
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId,
  });

  // Fetch group details
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      if (!groupId) return null;

      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  // Fetch group members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('group_members')
        .select(`
          id,
          role,
          joined_at,
          profiles:user_id (
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('group_id', groupId)
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId,
  });

  // Create post in group
  const createPost = useMutation({
    mutationFn: async ({
      content,
      imageUrl,
      videoUrl,
      fileUrl,
      fileName,
      fileType,
      postType = 'text',
    }: {
      content: string;
      imageUrl?: string;
      videoUrl?: string;
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      postType?: string;
    }) => {
      if (!user || !groupId) throw new Error('Not authenticated or no group');

      const sb = supabase as any;
      // Build insert object with only provided fields
      const insertData: Record<string, any> = {
        group_id: groupId,
        user_id: user.id,
        content: content || '',
      };
      if (imageUrl) insertData.image_url = imageUrl;
      if (videoUrl) insertData.video_url = videoUrl;
      if (fileUrl) insertData.file_url = fileUrl;
      if (fileName) insertData.file_name = fileName;
      if (fileType) insertData.file_type = fileType;
      if (postType) insertData.post_type = postType;

      const { error } = await sb
        .from('group_posts')
        .insert(insertData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
      toast({ title: 'Post created!' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create post', description: error.message, variant: 'destructive' });
    },
  });

  // Toggle like on group post
  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('likes')
        .select('id')
        .eq('group_post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        await supabase.from('likes').delete().eq('id', existing.id);
      } else {
        await supabase.from('likes').insert({ group_post_id: postId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
    },
  });

  // Real-time subscription for group posts, comments, and likes
  useEffect(() => {
    if (!groupId) return;

    // Subscribe to group details changes (avatar, cover, name etc.)
    const groupChannel = supabase
      .channel(`group-detail-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'groups',
          filter: `id=eq.${groupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        }
      )
      .subscribe();

    // Subscribe to group posts changes
    const postsChannel = supabase
      .channel(`group-posts-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_posts',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
        }
      )
      .subscribe();

    // Subscribe to comments on group posts for realtime count updates
    const commentsChannel = supabase
      .channel(`group-post-comments-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
        },
        (payload: any) => {
          // Refetch posts to update comments_count
          if (payload.new?.group_post_id || payload.old?.group_post_id) {
            queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
          }
        }
      )
      .subscribe();

    // Subscribe to likes on group posts for realtime count updates
    const likesChannel = supabase
      .channel(`group-post-likes-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
        },
        (payload: any) => {
          // Refetch posts to update likes_count
          if (payload.new?.group_post_id || payload.old?.group_post_id) {
            queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(groupChannel);
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [groupId, queryClient]);

  return {
    posts,
    isLoading,
    group,
    groupLoading,
    members,
    membersLoading,
    createPost,
    toggleLike,
  };
};
