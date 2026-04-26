import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from '@/components/PostCard';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Single-post deep-link page.
 * Resolves /post/:postId  and  /group-post/:postId
 *
 * Loads the post (or group post) by id and renders it inside PostCard
 * so shared links from anywhere (chat, external apps, comments) land on
 * a real, focused view of that content.
 */
const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const isGroupPost = window.location.pathname.startsWith('/group-post/');

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!postId) return;
      setLoading(true);
      setError(null);

      try {
        if (isGroupPost) {
          const { data, error: err } = await supabase
            .from('group_posts')
            .select(`
              *,
              author:profiles!group_posts_user_id_fkey (
                id, display_name, username, avatar_url, is_verified
              )
            `)
            .eq('id', postId)
            .maybeSingle();

          if (err) throw err;
          if (!data) {
            setError('Post not found');
          } else if (!cancelled) {
            setPost({
              id: data.id,
              content: data.content || '',
              image_url: data.image_url,
              created_at: data.created_at,
              user_id: data.user_id,
              likes_count: data.likes_count || 0,
              comments_count: data.comments_count || 0,
              shares_count: data.shares_count || 0,
              author: data.author,
              visibility: 'public',
            });
          }
        } else {
          const { data, error: err } = await supabase
            .from('posts')
            .select(`
              *,
              author:profiles!posts_user_id_fkey (
                id, display_name, username, avatar_url, is_verified
              )
            `)
            .eq('id', postId)
            .maybeSingle();

          if (err) throw err;
          if (!data) {
            setError('Post not found');
          } else if (!cancelled) {
            setPost(data);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load post');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [postId, isGroupPost]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold">Post</h1>
      </div>

      <div className="mx-auto max-w-2xl p-4">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-base font-semibold text-foreground">{error}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The post may have been deleted or you may not have permission to view it.
            </p>
            <Button className="mt-4" onClick={() => navigate('/')}>
              Go Home
            </Button>
          </div>
        )}

        {!loading && !error && post && <PostCard post={post} />}
      </div>
    </div>
  );
};

export default PostDetail;
