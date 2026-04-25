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
  X,
  ChevronRight,
  Eye
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { PostComments } from '@/components/PostComments';
import { EmojiReactionPicker } from '@/components/EmojiReactionPicker';
import { useReactions } from '@/hooks/useReactions';
import { useSavedPosts } from '@/hooks/useSavedPosts';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShareDialog } from '@/components/ShareDialog';
import { HashtagText } from '@/components/HashtagText';
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
  const labels: Record<string, string> = {
    public: 'Public - Anyone can see',
    friends: 'Friends - Only friends can see',
    private: 'Only Me - Only you can see'
  };
  const label = labels[visibility] || labels.public;
  
  switch (visibility) {
    case 'public':
      return <span title={label}><Globe className="w-3 h-3 text-green-500" /></span>;
    case 'friends':
      return <span title={label}><Users className="w-3 h-3 text-blue-500" /></span>;
    case 'private':
      return <span title={label}><Lock className="w-3 h-3 text-gray-500" /></span>;
    default:
      return <span title={label}><Globe className="w-3 h-3 text-green-500" /></span>;
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
  const [showPrivacySubmenu, setShowPrivacySubmenu] = useState(false);
  
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
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickPrivacyChange = async (newVisibility: 'public' | 'friends' | 'private') => {
    if (newVisibility === post.visibility) {
      setShowPrivacySubmenu(false);
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ visibility: newVisibility, edited_at: new Date().toISOString() })
        .eq('id', post.id);
      if (error) throw error;
      
      const visibilityLabels = { public: 'Public', friends: 'Friends', private: 'Only Me' };
      toast({ 
        title: 'Privacy updated', 
        description: `Post is now ${visibilityLabels[newVisibility]}` 
      });
      
      // Invalidate queries to refresh posts for all viewers in realtime
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts', post.user_id] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
      setShowPrivacySubmenu(false);
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
                  <DropdownMenuItem 
                    onClick={() => setShowPrivacySubmenu(true)}
                    disabled={isSubmitting}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    <span>Edit Privacy</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </DropdownMenuItem>
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
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="text-sm min-h-[80px] resize-none"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Visibility:</span>
              {(['public', 'friends', 'private'] as const).map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant={editVisibility === v ? 'default' : 'outline'}
                  className="h-7 text-xs gap-1"
                  onClick={() => setEditVisibility(v)}
                >
                  {v === 'public' && <Globe className="w-3 h-3" />}
                  {v === 'friends' && <Users className="w-3 h-3" />}
                  {v === 'private' && <Lock className="w-3 h-3" />}
                  {v === 'public' ? 'Public' : v === 'friends' ? 'Friends' : 'Only Me'}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setIsEditing(false); setEditContent(post.content); setEditVisibility(post.visibility || 'public'); }}
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

      {/* Post Media (images + videos) */}
      {(() => {
        const allMedia = [
          ...(post.image_url ? [post.image_url] : []),
          ...(post.media_urls || [])
        ].filter(Boolean);
        if (allMedia.length === 0) return null;

        const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url);

        if (allMedia.length === 1) {
          const url = allMedia[0];
          if (isVideo(url)) {
            return (
              <div className="bg-muted">
                <video
                  src={url}
                  controls
                  className="w-full max-h-[500px] object-cover"
                  preload="metadata"
                />
              </div>
            );
          }
          return (
            <div className="bg-muted">
              <img
                src={url}
                alt="Post"
                className="w-full max-h-[500px] object-cover"
                loading="lazy"
              />
            </div>
          );
        }

        return (
          <div className={`grid gap-0.5 bg-muted ${
            allMedia.length === 2 ? 'grid-cols-2' :
            allMedia.length === 3 ? 'grid-cols-2' :
            'grid-cols-2'
          }`}>
            {allMedia.slice(0, 4).map((url, idx) => {
              const isLastVisible = idx === 3 && allMedia.length > 4;
              return (
                <div
                  key={idx}
                  className={`relative ${
                    allMedia.length === 3 && idx === 0 ? 'row-span-2' : ''
                  }`}
                >
                  {isVideo(url) ? (
                    <video
                      src={url}
                      controls
                      className="w-full h-full object-cover aspect-square"
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={url}
                      alt={`Media ${idx + 1}`}
                      className="w-full h-full object-cover aspect-square"
                      loading="lazy"
                    />
                  )}
                  {isLastVisible && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                      <span className="text-white text-2xl font-bold">+{allMedia.length - 4}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

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

      {/* Privacy Submenu Dialog */}
      {showPrivacySubmenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPrivacySubmenu(false)}>
          <div className="bg-card rounded-lg shadow-lg p-4 w-72" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Who can see this post?</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPrivacySubmenu(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleQuickPrivacyChange('public')}
                disabled={isSubmitting}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  post.visibility === 'public' ? 'bg-primary/10 border border-primary' : 'hover:bg-secondary'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Public</p>
                  <p className="text-xs text-muted-foreground">Anyone can see</p>
                </div>
                {post.visibility === 'public' && <Check className="w-4 h-4 text-primary" />}
              </button>
              
              <button
                onClick={() => handleQuickPrivacyChange('friends')}
                disabled={isSubmitting}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  post.visibility === 'friends' ? 'bg-primary/10 border border-primary' : 'hover:bg-secondary'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Friends</p>
                  <p className="text-xs text-muted-foreground">Only friends can see</p>
                </div>
                {post.visibility === 'friends' && <Check className="w-4 h-4 text-primary" />}
              </button>
              
              <button
                onClick={() => handleQuickPrivacyChange('private')}
                disabled={isSubmitting}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  post.visibility === 'private' ? 'bg-primary/10 border border-primary' : 'hover:bg-secondary'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Only Me</p>
                  <p className="text-xs text-muted-foreground">Only you can see</p>
                </div>
                {post.visibility === 'private' && <Check className="w-4 h-4 text-primary" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
