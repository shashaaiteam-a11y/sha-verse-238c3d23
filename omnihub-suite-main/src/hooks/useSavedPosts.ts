import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useEffect } from 'react';

type PostType = 'post' | 'group_post';

export const useSavedPosts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all saved posts
  const { data: savedPosts, isLoading } = useQuery({
    queryKey: ['saved-posts', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('saved_posts')
        .select(`
          id,
          post_id,
          group_post_id,
          created_at,
          posts:post_id (
            id,
            content,
            image_url,
            created_at,
            likes_count,
            comments_count,
            profiles:user_id (
              id,
              display_name,
              username,
              avatar_url
            )
          ),
          group_posts:group_post_id (
            id,
            content,
            image_url,
            created_at,
            likes_count,
            comments_count,
            profiles:user_id (
              id,
              display_name,
              username,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Check if a specific post is saved
  const isPostSaved = (postId: string, type: PostType = 'post') => {
    if (!savedPosts) return false;
    
    if (type === 'post') {
      return savedPosts.some(sp => sp.post_id === postId);
    } else {
      return savedPosts.some(sp => sp.group_post_id === postId);
    }
  };

  // Toggle save/unsave
  const toggleSavePost = useMutation({
    mutationFn: async ({ postId, type }: { postId: string; type: PostType }) => {
      if (!user) throw new Error('Not authenticated');

      const column = type === 'post' ? 'post_id' : 'group_post_id';
      
      // Check if already saved
      const { data: existing } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('user_id', user.id)
        .eq(column, postId)
        .maybeSingle();

      if (existing) {
        // Unsave
        await supabase.from('saved_posts').delete().eq('id', existing.id);
        return { action: 'unsaved' };
      } else {
        // Save
        const insertData: any = { user_id: user.id };
        insertData[column] = postId;
        
        await supabase.from('saved_posts').insert(insertData);
        return { action: 'saved' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
      toast({
        title: result.action === 'saved' ? 'Post saved!' : 'Post removed from saved',
        description: result.action === 'saved' 
          ? 'You can find it in your saved posts' 
          : 'Post removed from your collection',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('saved-posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_posts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    savedPosts,
    isLoading,
    isPostSaved,
    toggleSavePost,
  };
};