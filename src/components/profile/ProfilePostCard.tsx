import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  Pin,
  Pencil,
  Trash2,
  Globe,
  Users,
  Lock,
  Flag
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { PostComments } from '@/components/PostComments';
import { EmojiReactionPicker } from '@/components/EmojiReactionPicker';
import { useReactions } from '@/hooks/useReactions';
import { useSavedPosts } from '@/hooks/useSavedPosts';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShareDialog } from '@/components/ShareDialog';
import { useState } from 'react';

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
  const { userReaction, reactionCounts, toggleReaction } = useReactions(post.id, 'post');
  const { isPostSaved, toggleSavePost } = useSavedPosts();
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  const isSaved = isPostSaved(post.id, 'post');
  const totalReactions = Object.values(reactionCounts || {}).reduce((a: any, b: any) => a + b, 0);
  const isOwnPost = user?.id === post.user_id;

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
                  <DropdownMenuItem onClick={() => onPin?.(post.id)}>
                    <Pin className="w-4 h-4 mr-2" />
                    {post.pinned ? 'Unpin from profile' : 'Pin to profile'}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
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
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
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
      <div className="px-4 py-1 flex items-center justify-around border-b border-border">
        <EmojiReactionPicker
          currentReaction={userReaction}
          onReact={(emoji) => toggleReaction.mutate(emoji)}
          reactionCounts={reactionCounts}
        />
        
        <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground hover:text-foreground">
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Comment</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex-1 gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setShowShareDialog(true)}
        >
          <Share2 className="w-5 h-5" />
          <span className="hidden sm:inline">Share</span>
        </Button>
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
