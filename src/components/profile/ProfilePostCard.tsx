import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Bookmark,
  BookmarkCheck,
  Pencil,
  Trash2,
  Globe,
  Users,
  Lock,
  Flag,
  Check,
  X
} from "lucide-react";
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { PostComments } from '@/components/PostComments';
import { EmojiReactionPicker } from '@/components/EmojiReactionPicker';
import { useReactions } from '@/hooks/useReactions';
import { useSavedPosts } from '@/hooks/useSavedPosts';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShareDialog } from '@/components/ShareDialog';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfilePostCardProps {
  post: any;
  isOwnProfile: boolean;
  onShare?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onPin?: (postId: string) => void;
}

const getVisibilityIcon = (visibility: string) => {
  switch (visibility) {
    case 'public':
      return <Globe className="w-3 h-3" />;
    case 'friends':
      return <Users className="w-3 h-3" />;
    case 'only_me':
      return <Lock className="w-3 h-3" />;
    default:
      return <Globe className="w-3 h-3" />;
  }
};

export const ProfilePostCard = ({ 
  post, 
  isOwnProfile,
  onShare,
  onDelete,
  onPin
}: ProfilePostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { userReaction, reactionCounts, toggleReaction } = useReactions(post.id, 'post');
  const { isPostSaved, toggleSavePost } = useSavedPosts();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editVisibility, setEditVisibility] = useState(post.visibility || 'public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isSaved = isPostSaved(post.id, 'post');
  const totalReactions = Object.values(reactionCounts || {}).reduce((a: any, b: any) => a + b, 0);
  const isOwnPost = user?.id === post.user_id;

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent, visibility: editVisibility, edited_at: new Date().toISOString() })
        .eq('id', post.id);
      if (error) throw error;
      toast({ title: 'Post updated' });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveToggle = () => {
    toggleSavePost.mutate({ postId: post.id, type: 'post' });
  };

  const handleProfileClick = () => {
    navigate(`/profile/${post.profiles?.id || post.user_id}`);
  };

  return (
    <Card className="shadow-sm overflow-hidden">
      {/* Post Header */}
      <div className="p-4 pb-0">
        <div className="flex items-start justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={handleProfileClick}
          >
            <Avatar className="h-10 w-10">
              {post.profiles?.avatar_url && <AvatarImage src={post.profiles.avatar_url} />}
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                {post.profiles?.display_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm hover:underline">
                {post.profiles?.display_name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                <span>·</span>
                {getVisibilityIcon(post.visibility || 'public')}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleSaveToggle}>
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 mr-2" />
                    Unsave post
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 mr-2" />
                    Save post
                  </>
                )}
              </DropdownMenuItem>

              {isOwnPost && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setIsEditing(true); setEditContent(post.content); setEditVisibility(post.visibility || 'public'); }}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit post
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(post.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete post
                  </DropdownMenuItem>
                </>
              )}

              {!isOwnPost && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <Flag className="w-4 h-4 mr-2" />
                    Report post
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Post Content */}
      <div className="px-4 py-3">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="text-sm min-h-[80px] resize-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setIsEditing(false); setEditContent(post.content); }}
                disabled={isSubmitting}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleEdit}
                disabled={isSubmitting || !editContent.trim()}
              >
                <Check className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{post.content}</p>
        )}
      </div>

      {/* Post Image */}
      {post.image_url && (
        <div className="bg-muted">
          <img 
            src={post.image_url} 
            alt="Post" 
            className="w-full max-h-[500px] object-cover"
          />
        </div>
      )}

      {/* Reaction Counts */}
      {(totalReactions > 0 || post.comments_count > 0 || post.shares_count > 0) && (
        <div className="px-4 py-2 flex items-center justify-between text-sm text-muted-foreground border-b border-border">
          <div className="flex items-center gap-1">
            {totalReactions > 0 && (
              <>
                <div className="flex -space-x-1">
                  <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-xs">👍</span>
                  {reactionCounts?.love > 0 && (
                    <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-xs">❤️</span>
                  )}
                </div>
                <span className="ml-1">{totalReactions}</span>
              </>
            )}
          </div>
          <div className="flex gap-3">
            {post.comments_count > 0 && (
              <span>{post.comments_count} comments</span>
            )}
            {post.shares_count > 0 && (
              <span>{post.shares_count} shares</span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex-1 flex items-center justify-around">
          <EmojiReactionPicker
            currentReaction={userReaction}
            onReact={(emoji) => toggleReaction.mutate(emoji)}
            reactionCounts={reactionCounts}
          />
          
          <button 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all rounded-lg px-3 py-2 font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">Comment</span>
          </button>
          
          <button 
            onClick={() => setShowShareDialog(true)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all rounded-lg px-3 py-2 font-medium"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-sm">Share</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <div className="px-4 pb-2">
        <PostComments postId={post.id} type="post" commentsCount={post.comments_count || 0} />
      </div>
      
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        postId={post.id}
        postType="post"
        postContent={post.content}
        postImage={post.image_url}
      />
    </Card>
  );
};
