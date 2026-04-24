import { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MessageCircle, Share2, Bookmark, Globe, Users, Lock,
  BadgeCheck, Play, Book, Eye, ThumbsUp, MapPin, FileText, BarChart2,
  Clock, Check
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSavedPosts } from '@/hooks/useSavedPosts';
import { useReactions } from '@/hooks/useReactions';
import { usePollVotes } from '@/hooks/usePollVotes';
import { EmojiReactionPicker } from '@/components/EmojiReactionPicker';
import { PostComments, PostCommentsRef } from '@/components/PostComments';
import { HashtagText } from '@/components/HashtagText';
import { ShareDialog } from '@/components/ShareDialog';
import { FeedItem, FeedItemType } from '@/hooks/useFeed';
import { useToast } from '@/components/ui/use-toast';

interface FeedCardProps {
  item: FeedItem;
  onShare?: () => void;
}

// Content Type Badge Component
const ContentTypeBadge = ({ type }: { type: FeedItemType }) => {
  const config = {
    video: { label: 'Video', icon: Play, className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    book: { label: 'Book', icon: Book, className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    post: { label: 'Post', icon: FileText, className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    group_post: { label: 'Group', icon: Users, className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    page_post: { label: 'Page', icon: Globe, className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  };

  const { label, icon: Icon, className } = config[type];

  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 font-medium ${className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
};

// Reactions Component - Now uses full emoji chart
const ItemReactions = ({ itemId, type }: { itemId: string; type: 'post' | 'group_post' | 'video' | 'book' }) => {
  const { userReaction, reactionCounts, toggleReaction } = useReactions(itemId, type);
  
  return (
    <EmojiReactionPicker
      currentReaction={userReaction}
      onReact={(emoji) => toggleReaction.mutate(emoji)}
      reactionCounts={reactionCounts}
      disabled={toggleReaction.isPending}
    />
  );
};

// Reaction Summary (shows emoji counts at top) - Now supports all emojis
const ItemReactionsSummary = ({ itemId, type }: { itemId: string; type: 'post' | 'group_post' | 'video' | 'book' }) => {
  const { reactionCounts } = useReactions(itemId, type);
  
  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);
  
  const topReactions = Object.entries(reactionCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (totalReactions === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1">
        {topReactions.map(([emoji]) => (
          <span key={emoji} className="text-base bg-card rounded-full">{emoji}</span>
        ))}
      </div>
      <span className="text-sm">{totalReactions}</span>
    </div>
  );
};

// Facebook-style Poll Component with database voting
const PollDisplay = ({ pollData, postId }: { pollData: any; postId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { pollOptions, userVote, totalVotes, hasVoted, isLoading, vote } = usePollVotes(postId);
  const [isVoting, setIsVoting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // Check if poll has expired
  const expiresAt = pollData?.expires_at ? new Date(pollData.expires_at) : null;
  const isExpired = expiresAt ? new Date() > expiresAt : false;

  // Update time remaining
  useEffect(() => {
    if (!expiresAt || isExpired) return;

    const updateTime = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Poll ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`Ends in ${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`Ends in ${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`Ends in ${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [expiresAt, isExpired]);

  const handleVote = async (optionId: string) => {
    if (hasVoted || !user || isVoting || isExpired) return;
    
    setIsVoting(true);
    try {
      await vote.mutateAsync(optionId);
      toast({ title: 'Vote recorded!' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to vote',
        variant: 'destructive'
      });
    } finally {
      setIsVoting(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="mt-3 p-3 bg-secondary/50 rounded-lg animate-pulse">
        <div className="h-4 bg-secondary rounded w-3/4 mb-3"></div>
        <div className="space-y-2">
          <div className="h-10 bg-secondary rounded"></div>
          <div className="h-10 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  // Use database options if available, fallback to poll_data options for old posts
  const displayOptions = pollOptions.length > 0 
    ? pollOptions.map(opt => ({ id: opt.id, text: opt.option_text, votes: opt.vote_count }))
    : (pollData?.options || []);

  const displayTotalVotes = pollOptions.length > 0 
    ? totalVotes 
    : (pollData?.total_votes || displayOptions.reduce((sum: number, opt: any) => sum + (opt.votes || 0), 0));

  // Determine if results should be shown
  const showResults = hasVoted || isExpired;

  return (
    <div className="mt-3 p-4 bg-secondary/50 rounded-xl border border-border/50">
      {/* Poll Question */}
      <div className="flex items-start gap-2 mb-4">
        <BarChart2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <span className="font-semibold text-base">{pollData.question}</span>
      </div>

      {/* Poll Options */}
      <div className="space-y-2">
        {displayOptions.map((option: any) => {
          const percentage = displayTotalVotes > 0 ? Math.round(((option.votes || 0) / displayTotalVotes) * 100) : 0;
          const isSelected = userVote?.option_id === option.id;
          const canVote = !hasVoted && !isExpired && user;

          return (
            <button
              key={option.id}
              onClick={() => canVote && handleVote(option.id)}
              disabled={!canVote || isVoting}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all relative overflow-hidden ${
                isSelected 
                  ? 'border-primary bg-primary/5' 
                  : showResults 
                    ? 'border-border/50 bg-background/50'
                    : 'border-border hover:border-primary/50 hover:bg-secondary cursor-pointer'
              } ${!canVote && !showResults ? 'opacity-60' : ''}`}
            >
              {/* Progress bar background (only show after voting) */}
              {showResults && (
                <div 
                  className={`absolute inset-0 transition-all duration-500 ${
                    isSelected ? 'bg-primary/15' : 'bg-muted/50'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Radio circle or checkmark */}
                  {showResults ? (
                    isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                    )
                  ) : (
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      canVote ? 'border-muted-foreground/50' : 'border-muted-foreground/30'
                    }`} />
                  )}
                  <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                    {option.text}
                  </span>
                </div>
                
                {/* Percentage (only show after voting) */}
                {showResults && (
                  <span className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                    {percentage}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Poll Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Check className="w-4 h-4" />
          <span>{displayTotalVotes} vote{displayTotalVotes !== 1 ? 's' : ''}</span>
        </div>
        
        {expiresAt && (
          <div className={`flex items-center gap-1 text-sm ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
            <Clock className="w-4 h-4" />
            <span>{isExpired ? 'Poll ended' : timeRemaining}</span>
          </div>
        )}
      </div>

      {/* Login prompt */}
      {!user && !isExpired && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Login to vote
        </p>
      )}
    </div>
  );
};

export const FeedCard = ({ item, onShare }: FeedCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPostSaved, toggleSavePost } = useSavedPosts();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const commentsRef = useRef<PostCommentsRef>(null);

  const author = item.profiles;
  const isOwner = user?.id === item.user_id;
  const itemLocation = item.metadata?.location;
  const itemFeeling = item.metadata?.feeling;

  // Handle comment button click
  const handleCommentClick = () => {
    commentsRef.current?.expand();
  };

  // Get context label (where it was posted)
  const getContextLabel = () => {
    switch (item.type) {
      case 'group_post':
        return (
          <span className="text-xs text-muted-foreground">
            in <span className="font-medium text-foreground hover:underline cursor-pointer" onClick={(e) => {
              e.stopPropagation();
              navigate(`/groups/${item.group_id}`);
            }}>{item.group?.name}</span>
          </span>
        );
      case 'page_post':
        return item.page && (
          <span className="text-xs text-muted-foreground">
            via <span className="font-medium text-foreground hover:underline cursor-pointer" onClick={(e) => {
              e.stopPropagation();
              navigate(`/pages/${item.page_id}`);
            }}>{item.page.name}</span>
          </span>
        );
      case 'video':
        return item.channel && (
          <span className="text-xs text-muted-foreground">
            on <span className="font-medium text-foreground hover:underline cursor-pointer" onClick={(e) => {
              e.stopPropagation();
              navigate(`/movion/channel/${item.channel_id}`);
            }}>{item.channel.name}</span>
          </span>
        );
      case 'book':
        return item.channel && (
          <span className="text-xs text-muted-foreground">
            by <span
                 className="font-medium text-foreground hover:underline cursor-pointer"
                 onClick={(e) => {
                   e.stopPropagation();
                   navigate(`/bookshelf/channel/${item.channel_id}`);
                 }}
               >{item.author || item.channel.name}</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Render based on item type
  const renderContent = () => {
    switch (item.type) {
      case 'video':
        return (
          <div 
            className="relative cursor-pointer group"
            onClick={() => navigate(`/movion/watch/${item.id}`)}
          >
            <div className="aspect-video bg-secondary rounded-lg overflow-hidden">
              {item.thumbnail_url ? (
                <img 
                  src={item.thumbnail_url} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <Play className="w-12 h-12 text-primary" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                  <Play className="w-8 h-8 text-primary-foreground fill-current" />
                </div>
              </div>
            </div>
            <h3 className="font-semibold mt-2 line-clamp-2">{item.title}</h3>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {item.views_count || 0} views
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" /> {item.likes_count || 0}
              </span>
            </div>
          </div>
        );

      case 'book':
        return (
          <div 
            className="flex gap-4 cursor-pointer group"
            onClick={() => navigate(`/bookshelf/book/${item.id}`)}
          >
            <div className="w-24 h-36 flex-shrink-0 bg-secondary rounded-lg overflow-hidden shadow-md">
              {item.cover_url ? (
                <img 
                  src={item.cover_url} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <Book className="w-8 h-8 text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h3>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{item.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {item.views_count || 0} reads
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" /> {item.likes_count || 0}
                </span>
              </div>
            </div>
          </div>
        );

      default: // post, group_post, or page_post
        const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url);
        const allMedia = [
          ...(item.image_url ? [item.image_url] : []),
          ...(item.media_urls || [])
        ].filter(Boolean);

        // Navigation target for clickable content (group_post → group page, page_post → page)
        const navigateTarget =
          item.type === 'group_post' && item.group_id
            ? `/groups/${item.group_id}`
            : item.type === 'page_post' && item.page_id
            ? `/pages/${item.page_id}`
            : null;

        const handleContentClick = (e: React.MouseEvent) => {
          if (!navigateTarget) return;
          // Don't navigate if user clicked on an interactive element (link, button, video controls, hashtag)
          const target = e.target as HTMLElement;
          if (target.closest('a, button, video, input, [role="button"]')) return;
          navigate(navigateTarget);
        };

        const contentClickableClass = navigateTarget ? 'cursor-pointer' : '';

        return (
          <>
            {/* Feeling/Activity Badge */}
            {itemFeeling && (
              <div className="mb-2 text-sm text-muted-foreground">
                — {itemFeeling.emoji} {itemFeeling.text}
              </div>
            )}
            
            {item.content && (
              <div
                className={`text-sm sm:text-base mb-3 break-words leading-relaxed whitespace-pre-wrap ${contentClickableClass}`}
                onClick={handleContentClick}
              >
                <HashtagText content={item.content} />
              </div>
            )}

            {/* Poll Display */}
            {item.poll_data && (
              <PollDisplay pollData={item.poll_data} postId={item.id} />
            )}

            {allMedia.length === 1 && (
              <div className="mb-3 -mx-3 sm:-mx-4">
                {isVideo(allMedia[0]) ? (
                  <video 
                    src={allMedia[0]} 
                    controls 
                    className="w-full max-h-[500px] object-cover"
                    preload="metadata"
                  />
                ) : (
                  <img 
                    src={allMedia[0]} 
                    alt="Post" 
                    className="w-full max-h-[500px] object-cover"
                    loading="lazy"
                  />
                )}
              </div>
            )}
            {allMedia.length > 1 && (
              <div className={`mb-3 -mx-3 sm:-mx-4 grid gap-0.5 grid-cols-2`}>
                {allMedia.slice(0, 4).map((url, idx) => (
                  isVideo(url) ? (
                    <video 
                      key={idx}
                      src={url} 
                      controls 
                      className="w-full object-cover aspect-square"
                      preload="metadata"
                    />
                  ) : (
                    <img 
                      key={idx}
                      src={url} 
                      alt={`Media ${idx + 1}`} 
                      className="w-full object-cover aspect-square"
                      loading="lazy"
                    />
                  )
                ))}
              </div>
            )}
          </>
        );
    }
  };

  const canReact = item.type === 'post' || item.type === 'group_post' || item.type === 'video' || item.type === 'page_post' || item.type === 'book';
  const commentType = item.type === 'group_post' ? 'group_post' : item.type === 'video' ? 'video' : item.type === 'book' ? 'book' : 'post';

  return (
    <Card className="p-3 sm:p-4 shadow-md hover:shadow-lg transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div 
            className="cursor-pointer tap-highlight rounded-full"
            onClick={() => {
              if (item.type === 'page_post' && item.page_id) {
                navigate(`/pages/${item.page_id}`);
              } else {
                navigate(`/profile/${item.user_id}`);
              }
            }}
          >
            <Avatar className="w-10 h-10 sm:w-11 sm:h-11">
              {item.type === 'page_post' && item.page?.avatar_url ? (
                <AvatarImage src={item.page.avatar_url} />
              ) : author?.avatar_url ? (
                <AvatarImage src={author.avatar_url} />
              ) : null}
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
                {item.type === 'page_post' ? item.page?.name?.[0] : author?.display_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span 
                className="font-semibold text-sm hover:text-primary transition-colors cursor-pointer truncate"
                onClick={() => {
                  if (item.type === 'page_post' && item.page_id) {
                    navigate(`/pages/${item.page_id}`);
                  } else {
                    navigate(`/profile/${item.user_id}`);
                  }
                }}
              >
                {item.type === 'page_post' ? item.page?.name : author?.display_name}
              </span>
              {author?.is_verified && (
                <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
              )}
              {getContextLabel()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
              {item.visibility && (
                <>
                  <span>·</span>
                  {item.visibility === 'friends' ? <Users className="w-3 h-3" /> : item.visibility === 'private' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                </>
              )}
              {itemLocation && (
                <>
                  <span>·</span>
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{itemLocation}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Content Type Badge */}
          <ContentTypeBadge type={item.type} />
          
          {/* Save Button */}
          {(item.type === 'post' || item.type === 'group_post' || item.type === 'page_post') && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 touch-target rounded-full"
              onClick={() => toggleSavePost.mutate({ 
                postId: item.id, 
                type: item.type === 'group_post' ? 'group_post' : 'post' 
              })}
              title={isPostSaved(item.id) ? 'Unsave' : 'Save'}
            >
              <Bookmark className={`w-4 h-4 ${isPostSaved(item.id) ? 'fill-current text-primary' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Reaction Summary - Facebook Style */}
      {canReact && (
        <div className="flex items-center justify-between py-2 text-sm text-muted-foreground">
          <ItemReactionsSummary itemId={item.id} type={commentType as any} />
          <div className="flex gap-4">
            {(item.comments_count || 0) > 0 && (
              <button onClick={handleCommentClick} className="hover:underline">
                {item.comments_count} comments
              </button>
            )}
            {(item.shares_count || 0) > 0 && (
              <span>{item.shares_count} shares</span>
            )}
          </div>
        </div>
      )}

      {/* Actions Bar - Facebook Style */}
      <div className="flex items-center pt-2 border-t border-border overflow-hidden">
        <div className="flex-1 flex items-center justify-around min-w-0">
          {canReact && <ItemReactions itemId={item.id} type={commentType as any} />}
          
          <button 
            onClick={handleCommentClick}
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

      {/* Comments */}
      {(item.type === 'post' || item.type === 'group_post' || item.type === 'page_post' || item.type === 'video' || item.type === 'book') && (
        <PostComments ref={commentsRef} postId={item.id} type={commentType} commentsCount={item.comments_count || 0} />
      )}

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        postId={item.id}
        postType={item.type === 'group_post' ? 'group_post' : item.type === 'video' ? 'video' : item.type === 'book' ? 'book' : 'post'}
        postContent={item.content || item.description || item.title}
        postImage={item.image_url || item.cover_url || item.thumbnail_url}
      />
    </Card>
  );
};
