import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageCircle, Share2, MoreHorizontal, Bookmark, Pin, Globe, Users, Lock, 
  Edit2, Trash2, Flag, BadgeCheck, X, Check, Image as ImageIcon, FileText, BarChart2,
  MapPin
} from "lucide-react";
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSavedPosts } from '@/hooks/useSavedPosts';
import { useReactions } from '@/hooks/useReactions';
import { EmojiReactionPicker } from '@/components/EmojiReactionPicker';
import { PostComments } from '@/components/PostComments';
import { HashtagText } from '@/components/HashtagText';
import { ShareDialog } from '@/components/ShareDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PostAuthor {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  is_verified?: boolean;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Post {
  id: string;
  content: string;
  image_url?: string;
  media_urls?: string[];
  metadata?: {
    location?: string;
  };
  poll_data?: {
    question: string;
    options: PollOption[];
    total_votes: number;
    user_vote?: string;
  };
  created_at: string;
  edited_at?: string;
  user_id: string;
  visibility?: 'public' | 'friends' | 'private';
  pinned?: boolean;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  profiles?: PostAuthor;
}

interface PostCardProps {
  post: Post;
  onShare?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
}

// Post Reactions Component - Now uses full emoji chart
const PostReactions = ({ postId }: { postId: string }) => {
  const { userReaction, reactionCounts, toggleReaction } = useReactions(postId, 'post');
  
  return (
    <EmojiReactionPicker
      currentReaction={userReaction}
      onReact={(emoji) => toggleReaction.mutate(emoji)}
      reactionCounts={reactionCounts}
      disabled={toggleReaction.isPending}
    />
  );
};

// Visibility Icon Component
const getVisibilityIcon = (visibility?: string) => {
  switch (visibility) {
    case 'friends':
      return <Users className="w-3 h-3" />;
    case 'private':
      return <Lock className="w-3 h-3" />;
    default:
      return <Globe className="w-3 h-3" />;
  }
};

export const PostCard = ({ post, onShare, onPin, onDelete }: PostCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPostSaved, toggleSavePost } = useSavedPosts();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editVisibility, setEditVisibility] = useState(post.visibility || 'public');
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const isOwner = user?.id === post.user_id;
  const author = post.profiles;
  const postLocation = post.metadata?.location;

  // Combine image_url and media_urls for display
  const allMedia = [
    ...(post.image_url ? [post.image_url] : []),
    ...(post.media_urls || [])
  ].filter(Boolean);

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          content: editContent,
          visibility: editVisibility,
          edited_at: new Date().toISOString()
        })
        .eq('id', post.id);

      if (error) throw error;

      toast({ title: 'Post updated' });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast({ title: 'Post deleted' });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      onDelete?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Render media grid
  const renderMediaGrid = () => {
    if (allMedia.length === 0) return null;

    const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url);
    const isPdf = (url: string) => /\.pdf$/i.test(url);

    if (allMedia.length === 1) {
      const url = allMedia[0];
      if (isVideo(url)) {
        return (
          <div className="mb-3 -mx-3 sm:-mx-4">
            <video 
              src={url} 
              controls 
              className="w-full max-h-[500px] object-cover"
              preload="metadata"
            />
          </div>
        );
      }
      if (isPdf(url)) {
        return (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 mb-3 bg-secondary rounded-lg hover:bg-muted transition-colors"
          >
            <FileText className="w-10 h-10 text-destructive" />
            <div>
              <p className="font-medium">PDF Document</p>
              <p className="text-xs text-muted-foreground">Click to view</p>
            </div>
          </a>
        );
      }
      return (
        <div 
          className="mb-3 -mx-3 sm:-mx-4 cursor-pointer"
          onClick={() => setSelectedMediaIndex(0)}
        >
          <img 
            src={url} 
            alt="Post" 
            className="w-full max-h-[500px] object-cover"
            loading="lazy"
          />
        </div>
      );
    }

    // Multi-image grid
    return (
      <div className={`mb-3 -mx-3 sm:-mx-4 grid gap-0.5 ${
        allMedia.length === 2 ? 'grid-cols-2' :
        allMedia.length === 3 ? 'grid-cols-2' :
        'grid-cols-2'
      }`}>
        {allMedia.slice(0, 4).map((url, idx) => {
          const isLastVisible = idx === 3 && allMedia.length > 4;
          return (
            <div 
              key={idx}
              className={`relative cursor-pointer ${
                allMedia.length === 3 && idx === 0 ? 'row-span-2' : ''
              }`}
              onClick={() => setSelectedMediaIndex(idx)}
            >
              {isVideo(url) ? (
                <video 
                  src={url} 
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
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">+{allMedia.length - 4}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render poll
  const renderPoll = () => {
    if (!post.poll_data) return null;

    const poll = post.poll_data;
    const hasVoted = !!poll.user_vote;

    return (
      <div className="mb-3 p-4 bg-secondary rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-5 h-5 text-primary" />
          <h4 className="font-semibold">{poll.question}</h4>
        </div>
        <div className="space-y-2">
          {poll.options.map((option) => {
            const percentage = poll.total_votes > 0 
              ? Math.round((option.votes / poll.total_votes) * 100) 
              : 0;
            const isUserVote = poll.user_vote === option.id;

            return (
              <div 
                key={option.id}
                className={`relative p-3 rounded-lg border transition-colors ${
                  isUserVote ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                } ${!hasVoted ? 'cursor-pointer' : ''}`}
              >
                <div 
                  className="absolute inset-0 bg-primary/20 rounded-lg transition-all"
                  style={{ width: hasVoted ? `${percentage}%` : '0%' }}
                />
                <div className="relative flex justify-between items-center">
                  <span className="font-medium">{option.text}</span>
                  {hasVoted && (
                    <span className="text-sm text-muted-foreground">{percentage}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{poll.total_votes} votes</p>
      </div>
    );
  };

  return (
    <>
      <Card className="p-3 sm:p-4 shadow-md hover:shadow-lg transition-all">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer tap-highlight rounded-lg p-1 -ml-1"
            onClick={() => navigate(`/profile/${post.user_id}`)}
          >
            <Avatar className="w-10 h-10 sm:w-11 sm:h-11">
              {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
                {author?.display_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm hover:text-primary transition-colors truncate">
                  {author?.display_name}
                </h3>
                {author?.is_verified && (
                  <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                )}
                {post.pinned && (
                  <Pin className="w-3 h-3 text-primary flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                <span>·</span>
                {getVisibilityIcon(post.visibility)}
                {postLocation && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      {postLocation}
                    </span>
                  </>
                )}
                {post.edited_at && (
                  <>
                    <span>·</span>
                    <span>Edited</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Post Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 touch-target rounded-full">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => toggleSavePost.mutate({ postId: post.id, type: 'post' })}>
                <Bookmark className={`w-4 h-4 mr-2 ${isPostSaved(post.id) ? 'fill-current' : ''}`} />
                {isPostSaved(post.id) ? 'Unsave Post' : 'Save Post'}
              </DropdownMenuItem>
              
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setIsEditing(true); setEditContent(post.content); setEditVisibility(post.visibility || 'public'); }}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onPin}>
                    <Pin className={`w-4 h-4 mr-2 ${post.pinned ? 'fill-current' : ''}`} />
                    {post.pinned ? 'Unpin Post' : 'Pin Post'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                </>
              )}
              
              {!isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Flag className="w-4 h-4 mr-2" />
                    Report Post
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="mb-3 space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[100px] text-sm"
              placeholder="What's on your mind?"
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
            <div className="flex justify-end gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(post.content);
                  setEditVisibility(post.visibility || 'public');
                }}
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
          <div className="text-sm sm:text-base mb-3 break-words leading-relaxed whitespace-pre-wrap">
            <HashtagText content={post.content} />
          </div>
        )}

        {/* Media Grid */}
        {renderMediaGrid()}

        {/* Poll */}
        {renderPoll()}

        {/* Actions Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-4 sm:gap-6">
            <PostReactions postId={post.id} />
            
            <button className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground hover:text-primary transition-colors touch-target ripple rounded-lg px-2 py-1.5">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{post.comments_count || 0}</span>
            </button>
          </div>
          
          <button 
            onClick={() => setShowShareDialog(true)}
            className="text-muted-foreground hover:text-primary transition-colors touch-target ripple rounded-full p-2"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Comments */}
        <PostComments postId={post.id} type="post" commentsCount={post.comments_count || 0} />
      </Card>

      {/* Media Lightbox Dialog */}
      <Dialog open={selectedMediaIndex !== null} onOpenChange={() => setSelectedMediaIndex(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setSelectedMediaIndex(null)}
            >
              <X className="w-5 h-5" />
            </Button>
            {selectedMediaIndex !== null && allMedia[selectedMediaIndex] && (
              <img 
                src={allMedia[selectedMediaIndex]} 
                alt="Full size" 
                className="w-full max-h-[90vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        postId={post.id}
        postType="post"
        postContent={post.content}
        postImage={post.image_url}
      />
    </>
  );
};
