import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bookmark, MessageCircle, Share2 } from "lucide-react";
import { useSavedPosts } from '@/hooks/useSavedPosts';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { PostComments } from '@/components/PostComments';
import { EmojiReactionPicker } from '@/components/EmojiReactionPicker';
import { useReactions } from '@/hooks/useReactions';
import { useShares } from '@/hooks/useShares';
import { ShareDialog } from '@/components/ShareDialog';

// Component for post reactions - Now uses full emoji chart
const SavedPostReactions = ({ postId, type }: { postId: string; type: 'post' | 'group_post' }) => {
  const { userReaction, reactionCounts, toggleReaction } = useReactions(postId, type);
  
  return (
    <EmojiReactionPicker
      currentReaction={userReaction}
      onReact={(emoji) => toggleReaction.mutate(emoji)}
      reactionCounts={reactionCounts}
      disabled={toggleReaction.isPending}
    />
  );
};
import { useState } from 'react';

const SavedPosts = () => {
  const { savedPosts, isLoading, toggleSavePost } = useSavedPosts();
  const { sharePost, shareGroupPost } = useShares();
  const navigate = useNavigate();
  const [shareDialogPost, setShareDialogPost] = useState<{ id: string; content: string; image?: string; isGroupPost: boolean } | null>(null);

  // Transform saved posts to unified format
  const posts = savedPosts?.map((saved: any) => {
    const isGroupPost = !!saved.group_post_id;
    const postData = isGroupPost ? saved.group_posts : saved.posts;
    
    return {
      ...postData,
      savedId: saved.id,
      savedAt: saved.created_at,
      isGroupPost,
      originalPostId: isGroupPost ? saved.group_post_id : saved.post_id,
    };
  }).filter((p: any) => p.id) || [];

  return (
    <div className="min-h-screen bg-gradient-subtle page-content">
      {/* Header */}
      <header className="sticky-header">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">Saved Posts</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <Card key={post.savedId} className="p-4 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => navigate(`/profile/${post.profiles?.id}`)}
                  >
                    <Avatar className="w-10 h-10">
                      {post.profiles?.avatar_url && <AvatarImage src={post.profiles.avatar_url} />}
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        {post.profiles?.display_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-sm hover:text-primary transition-colors">
                        {post.profiles?.display_name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        {post.isGroupPost && <span className="ml-1">• Group post</span>}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleSavePost.mutate({ 
                      postId: post.originalPostId, 
                      type: post.isGroupPost ? 'group_post' : 'post' 
                    })}
                    className="h-9 w-9"
                  >
                    <Bookmark className="w-4 h-4 fill-current text-primary" />
                  </Button>
                </div>

                <p className="text-sm mb-3 break-words">{post.content}</p>

                {post.image_url && (
                  <div className="mb-3 -mx-4">
                    <img 
                      src={post.image_url} 
                      alt="Post" 
                      className="w-full max-h-[400px] object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-4">
                    <SavedPostReactions 
                      postId={post.id} 
                      type={post.isGroupPost ? 'group_post' : 'post'} 
                    />
                    <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm">{post.comments_count || 0}</span>
                    </button>
                  </div>
                  <button 
                    onClick={() => setShareDialogPost({ 
                      id: post.id, 
                      content: post.content, 
                      image: post.image_url,
                      isGroupPost: post.isGroupPost 
                    })}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>

                <PostComments 
                  postId={post.id} 
                  type={post.isGroupPost ? 'group_post' : 'post'} 
                  commentsCount={post.comments_count || 0} 
                />
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Saved Posts</h3>
            <p className="text-muted-foreground text-sm">
              Posts you save will appear here. Click the bookmark icon on any post to save it.
            </p>
            <Button className="mt-4" onClick={() => navigate('/')}>
              Browse Feed
            </Button>
          </Card>
        )}
      </div>
      
      {shareDialogPost && (
        <ShareDialog
          open={!!shareDialogPost}
          onOpenChange={(open) => !open && setShareDialogPost(null)}
          postId={shareDialogPost.id}
          postType={shareDialogPost.isGroupPost ? 'group_post' : 'post'}
          postContent={shareDialogPost.content}
          postImage={shareDialogPost.image}
        />
      )}
    </div>
  );
};

export default SavedPosts;
