import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  Send,
  Play,
  Clock,
  ListPlus,
  Check
} from "lucide-react";
import { useVideo, useVideos } from "@/hooks/useVideos";
import { useVideoLike } from "@/hooks/useVideoLikes";
import { useVideoComments } from "@/hooks/useVideoComments";
import { useIsSubscribed, useToggleSubscription } from "@/hooks/useSubscriptions";
import { useAddToHistory, useUpdateWatchProgress } from "@/hooks/useWatchHistory";
import { useIsSaved, useToggleSaved } from "@/hooks/useSavedVideos";
import { useVideoQualities, useTranscodingJob } from "@/hooks/useVideoQualities";
import { usePlaylists, useAddToPlaylist, useCreatePlaylist } from "@/hooks/usePlaylists";
import { useAuth } from "@/contexts/AuthContext";
import { VideoCard } from "@/components/movion/VideoCard";
import { HLSVideoPlayer } from "@/components/movion/HLSVideoPlayer";
import { TranscodingStatus } from "@/components/movion/TranscodingStatus";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ShareDialog } from "@/components/ShareDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const formatViews = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const formatSubscribers = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const VideoWatch = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { video, isLoading } = useVideo(videoId);
  const { videos } = useVideos();
  const { isLiked, isDisliked, toggleLike, toggleDislike } = useVideoLike(videoId);
  const { comments, addComment } = useVideoComments(videoId);
  const isSubscribed = useIsSubscribed(video?.channels?.id);
  const toggleSubscription = useToggleSubscription();
  
  // Playlists
  const { playlists } = usePlaylists();
  const addToPlaylist = useAddToPlaylist();
  const createPlaylist = useCreatePlaylist();
  
  // Video qualities and transcoding
  const { qualities } = useVideoQualities(videoId);
  const { job: transcodingJob } = useTranscodingJob(videoId);

  const [commentText, setCommentText] = useState("");
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Watch history and saved
  const addToHistory = useAddToHistory();
  const updateWatchProgress = useUpdateWatchProgress();
  const isSaved = useIsSaved(videoId);
  const toggleSaved = useToggleSaved();

  // Increment view count and add to history on mount
  const { incrementView } = useVideos();
  useEffect(() => {
    if (videoId) {
      incrementView.mutate(videoId);
      addToHistory.mutate({ videoId });
    }
  }, [videoId]);

  // Handle time update for watch progress
  const handleTimeUpdate = (currentTime: number, duration: number) => {
    if (videoId && duration > 0) {
      // Debounce updates - only save every 10 seconds
      if (Math.floor(currentTime) % 10 === 0) {
        updateWatchProgress.mutate({ videoId, currentTime, duration });
      }
    }
  };

  const handleSaveVideo = () => {
    if (videoId) {
      toggleSaved.mutate({ videoId, isSaved });
    }
  };

  // handleShare removed - using ShareDialog instead

  const handleAddToPlaylist = (playlistId: string) => {
    if (videoId) {
      addToPlaylist.mutate({ playlistId, videoId });
    }
  };

  const handleCreateNewPlaylist = () => {
    if (videoId) {
      createPlaylist.mutate(
        { title: 'New Playlist' },
        {
          onSuccess: (playlist) => {
            addToPlaylist.mutate({ playlistId: playlist.id, videoId });
          },
        }
      );
    }
  };

  const handleSubscribe = () => {
    if (video?.channels?.id) {
      toggleSubscription.mutate({
        channelId: video.channels.id,
        isSubscribed,
      });
    }
  };

  const handleAddComment = () => {
    if (commentText.trim()) {
      addComment.mutate(commentText.trim());
      setCommentText("");
    }
  };

  const relatedVideos = videos?.filter(v => v.id !== videoId).slice(0, 10);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Video not found</p>
        <Button onClick={() => navigate('/movion')}>Back to Movion</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate('/movion')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg truncate flex-1">{video.title}</h1>
        </div>
      </header>

      <div className="lg:flex lg:gap-6 lg:px-6 lg:py-4">
        {/* Main Content */}
        <div className="lg:flex-1">
          {/* Video Player */}
          {video.video_url ? (
            <HLSVideoPlayer
              videoUrl={video.video_url}
              hlsUrl={video.hls_url}
              qualities={qualities}
              poster={video.thumbnail_url || undefined}
              autoPlay
              onTimeUpdate={handleTimeUpdate}
            />
          ) : video.thumbnail_url ? (
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <img 
                src={video.thumbnail_url} 
                alt={video.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                <Play className="w-20 h-20 text-primary-foreground" />
              </div>
            </div>
          )}

          {/* Transcoding Status */}
          {transcodingJob && transcodingJob.status !== 'completed' && (
            <div className="mt-2 px-4 lg:px-0">
              <TranscodingStatus 
                status={transcodingJob.status} 
                progress={transcodingJob.progress || 0} 
              />
            </div>
          )}

          {/* Video Info */}
          <div className="p-4">
            <h1 className="text-lg font-semibold">{video.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>{formatViews(video.views_count || 0)} views</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(video.created_at || ''), { addSuffix: true })}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
              <Button
                variant={isLiked ? "default" : "secondary"}
                size="sm"
                className="rounded-full gap-2"
                onClick={() => toggleLike.mutate()}
              >
                <ThumbsUp className={cn("w-4 h-4", isLiked && "fill-current")} />
                {formatViews(video.likes_count || 0)}
              </Button>
              <Button 
                variant={isDisliked ? "default" : "secondary"} 
                size="sm" 
                className="rounded-full"
                onClick={() => toggleDislike.mutate()}
              >
                <ThumbsDown className={cn("w-4 h-4", isDisliked && "fill-current")} />
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                className="rounded-full gap-2"
                onClick={() => setShowShareDialog(true)}
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button 
                variant={isSaved ? "default" : "secondary"} 
                size="sm" 
                className="rounded-full gap-2"
                onClick={handleSaveVideo}
                disabled={toggleSaved.isPending}
              >
                {isSaved ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                {isSaved ? 'Saved' : 'Save'}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="rounded-full gap-2">
                    <ListPlus className="w-4 h-4" />
                    Playlist
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCreateNewPlaylist}>
                    Create new playlist
                  </DropdownMenuItem>
                  {playlists && playlists.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {playlists.map((playlist) => (
                        <DropdownMenuItem 
                          key={playlist.id}
                          onClick={() => handleAddToPlaylist(playlist.id)}
                        >
                          {playlist.title}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Channel Info */}
            {video.channels && (
              <div className="flex items-center justify-between mt-4 p-3 bg-muted rounded-xl">
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => navigate(`/movion/channel/${video.channels?.id}`)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={video.channels.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {video.channels.name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{video.channels.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSubscribers(video.channels.subscribers_count || 0)} subscribers
                    </p>
                  </div>
                </div>
                <Button
                  variant={isSubscribed ? "secondary" : "destructive"}
                  size="sm"
                  className="rounded-full"
                  onClick={handleSubscribe}
                  disabled={toggleSubscription.isPending}
                >
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </Button>
              </div>
            )}

            {/* Description */}
            {video.description && (
              <div className="mt-4 p-3 bg-muted rounded-xl">
                <p className={cn(
                  "text-sm whitespace-pre-wrap",
                  !showFullDescription && "line-clamp-3"
                )}>
                  {video.description}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 p-0 h-auto"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                >
                  {showFullDescription ? 'Show less' : 'Show more'}
                </Button>
              </div>
            )}

            {/* Comments */}
            <div className="mt-6">
              <h3 className="font-semibold mb-4">
                {comments?.length || 0} Comments
              </h3>

              {/* Add Comment */}
              <div className="flex gap-3 mb-4">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="resize-none min-h-[60px]"
                />
                <Button 
                  size="icon" 
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || addComment.isPending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Comment List */}
              <div className="space-y-4">
                {comments?.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {comment.profiles?.display_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.profiles?.display_name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at || ''), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Related Videos (Desktop Sidebar) */}
        <div className="hidden lg:block w-96">
          <h3 className="font-semibold mb-3">Related Videos</h3>
          <div className="space-y-3">
            {relatedVideos?.map((video) => (
              <VideoCard key={video.id} video={video} layout="list" />
            ))}
          </div>
        </div>
      </div>

      {/* Related Videos (Mobile) */}
      <div className="lg:hidden px-4 pb-4">
        <h3 className="font-semibold mb-3">Related Videos</h3>
        <div className="space-y-4">
          {relatedVideos?.map((video) => (
            <VideoCard key={video.id} video={video} layout="list" />
          ))}
        </div>
      </div>

      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        postId={videoId || ''}
        postType="video"
        postContent={video?.title}
        postImage={video?.thumbnail_url}
      />
    </div>
  );
};

export default VideoWatch;
