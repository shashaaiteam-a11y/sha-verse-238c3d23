// Movion Watch Page - Live with Supabase + Related Videos Algorithm
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ThumbsUp, ThumbsDown, Share2, Download, MoreVertical, 
  Bookmark, Play, Pause, Volume2, VolumeX, Maximize, Settings, Loader2,
  ChevronDown, ChevronUp, MessageCircle
} from "lucide-react";
import { useVideo, useVideos } from "@/hooks/useVideos";
import { useVideoLike } from "@/hooks/useVideoLikes";
import { useVideoComments } from "@/hooks/useVideoComments";
import { useAddToHistory, useUpdateWatchProgress } from "@/hooks/useWatchHistory";
import { useMovionRealtime } from "@/hooks/useMovionRealtime";
import { useRelatedVideos } from "@/hooks/useMovionAlgorithms";
import { useIsInWatchLater, useToggleWatchLater } from "@/hooks/useWatchLater";
import { useIsSaved, useToggleSave } from "@/hooks/useVideoSave";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { SubscribeButton } from "@/movion/components/SubscribeButton";
import { ShareDialog } from "@/components/ShareDialog";
import CommentItem from "@/movion/components/CommentItem";
import { VideoPreRollAd, VideoMidRollAd } from "@/components/ads";

const MovionWatch = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Enable realtime updates
  useMovionRealtime();
  
  // Supabase hooks
  const { video, isLoading: videoLoading } = useVideo(videoId);
  const { videos: allVideos, incrementView } = useVideos();
  const { comments, addComment, isLoading: commentsLoading } = useVideoComments(videoId);
  const { isLiked, isDisliked, toggleLike, toggleDislike } = useVideoLike(videoId);
  const addToHistory = useAddToHistory();
  const updateProgress = useUpdateWatchProgress();
  
  // Watch Later & Save hooks
  const isInWatchLater = useIsInWatchLater(videoId);
  const toggleWatchLater = useToggleWatchLater();
  const isSaved = useIsSaved(videoId);
  const toggleSave = useToggleSave();
  
  // Algorithm-powered related videos
  const relatedVideos = useRelatedVideos(video, allVideos, 10);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommentsOpen, setIsCommentsOpen] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [preRollDone, setPreRollDone] = useState(false);
  const [midRollShown, setMidRollShown] = useState(false);
  const [showMidRoll, setShowMidRoll] = useState(false);
  
  // Reload and play video when videoId changes
  useEffect(() => {
    if (videoRef.current && video) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
      setProgress(0);
      setIsPlaying(true);
      setPreRollDone(false);
      setMidRollShown(false);
      setShowMidRoll(false);
    }
  }, [video?.id]);

  // Trigger mid-roll at 50% for videos 3+ minutes
  useEffect(() => {
    if (!video || midRollShown) return;
    const dur = video.duration ?? 0;
    if (dur >= 180 && progress >= 50) {
      setMidRollShown(true);
      setShowMidRoll(true);
      videoRef.current?.pause();
    }
  }, [progress, video, midRollShown]);

  // Add to history and increment views on mount
  useEffect(() => {
    if (video && user) {
      addToHistory.mutate({ videoId: video.id });
      incrementView.mutate(video.id);
    }
  }, [video?.id, user?.id]);
  
  // Update and save progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && video) {
        const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(isNaN(currentProgress) ? 0 : currentProgress);
        
        // Save progress every 10 seconds
        if (user && !isNaN(currentProgress) && currentProgress > 0 && videoRef.current) {
          updateProgress.mutate({ 
            videoId: video.id, 
            currentTime: videoRef.current.currentTime,
            duration: videoRef.current.duration 
          });
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [video?.id, user?.id]);
  
  if (videoLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <Skeleton className="aspect-video rounded-xl" />
            <Skeleton className="h-8 w-3/4" />
            <div className="flex gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground gap-4">
        <p className="text-xl font-medium">Video not found</p>
        <Button onClick={() => navigate('/movion')}>Back to Movion</Button>
      </div>
    );
  }

  const channel = video.channels;
  
  const handleLike = () => {
    if (!user) {
      toast.error("Please sign in to like videos");
      return;
    }
    toggleLike.mutate();
  };
  
  const handleDislike = () => {
    if (!user) {
      toast.error("Please sign in");
      return;
    }
    toggleDislike.mutate();
  };
  
  const handleComment = () => {
    if (!user) {
      toast.error("Please sign in to comment");
      return;
    }
    if (commentText.trim()) {
      addComment.mutate(commentText);
      setCommentText("");
    }
  };

  const handleWatchLater = () => {
    if (!user) {
      toast.error("Please sign in");
      return;
    }
    toggleWatchLater.mutate({ videoId: video.id, isInList: isInWatchLater });
  };

  const handleSave = () => {
    if (!user) {
      toast.error("Please sign in");
      return;
    }
    toggleSave.mutate({ videoId: video.id, isSaved });
  };

  const handleShare = () => {
    setShareOpen(true);
  };

  const handleDownload = () => {
    if (video.video_url) {
      const a = document.createElement('a');
      a.href = video.video_url;
      a.download = `${video.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Download started");
    }
  };
  
  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-6 p-4">
        {/* Main Video Section */}
        <div className="flex-1">
          {/* Video Player */}
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden group">
            <video
              ref={videoRef}
              src={video.hls_url || video.video_url}
              poster={video.thumbnail_url}
              className="w-full h-full object-contain"
              autoPlay
              onClick={() => {
                if (videoRef.current) {
                  if (videoRef.current.paused) {
                    videoRef.current.play().catch(() => {});
                  } else {
                    videoRef.current.pause();
                  }
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Pre-roll Ad Overlay */}
            {!preRollDone && (
              <VideoPreRollAd onComplete={() => setPreRollDone(true)} />
            )}

            {/* Mid-roll Ad Overlay */}
            {showMidRoll && (
              <VideoMidRollAd
                onComplete={() => {
                  setShowMidRoll(false);
                  videoRef.current?.play().catch(() => {});
                }}
              />
            )}

            {/* Video Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Progress Bar */}
              <div className="w-full h-1 bg-white/30 rounded-full mb-3 cursor-pointer">
                <div 
                  className="h-full bg-red-600 rounded-full relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => {
                    if (videoRef.current) {
                      isPlaying ? videoRef.current.pause() : videoRef.current.play();
                    }
                  }}>
                    {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white" />}
                  </button>
                  <button onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !isMuted;
                      setIsMuted(!isMuted);
                    }
                  }}>
                    {isMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
                  </button>
                  <span className="text-white text-sm">{formatDuration(video.duration)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-white cursor-pointer" />
                  <Maximize className="w-5 h-5 text-white cursor-pointer" onClick={() => videoRef.current?.requestFullscreen()} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Video Info */}
          <div className="mt-4">
            <h1 className="text-xl font-semibold">{video.title}</h1>
            
            <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
              {/* Channel Info */}
              <div className="flex items-center gap-3">
                <Avatar 
                  className="w-10 h-10 cursor-pointer"
                  onClick={() => navigate(`/movion/channel/${video.channel_id}`)}
                >
                  <AvatarImage src={channel?.avatar_url} />
                  <AvatarFallback>{channel?.name?.[0] || 'C'}</AvatarFallback>
                </Avatar>
                <div>
                  <p 
                    className="font-medium cursor-pointer hover:underline"
                    onClick={() => navigate(`/movion/channel/${video.channel_id}`)}
                  >
                    {channel?.name || 'Unknown Channel'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatViews(channel?.subscribers_count || 0)} subscribers
                  </p>
                </div>
                <SubscribeButton 
                  channelId={video.channel_id}
                  channelOwnerId={channel?.user_id}
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-secondary rounded-full">
                  <button 
                    className={`flex items-center gap-2 px-4 py-2 rounded-l-full ${isLiked ? 'text-primary' : ''}`}
                    onClick={handleLike}
                  >
                    <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{formatViews(video.likes_count || 0)}</span>
                  </button>
                  <div className="w-px h-6 bg-border" />
                  <button 
                    className={`px-4 py-2 rounded-r-full ${isDisliked ? 'text-destructive' : ''}`}
                    onClick={handleDislike}
                  >
                    <ThumbsDown className={`w-5 h-5 ${isDisliked ? 'fill-current' : ''}`} />
                  </button>
                </div>
                
                <Button variant="secondary" className="rounded-full gap-2" onClick={handleShare}>
                  <Share2 className="w-5 h-5" />
                  Share
                </Button>
                
                {/* Three Dots Menu with all actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleWatchLater} className="gap-2">
                      <Bookmark className={`w-4 h-4 ${isInWatchLater ? 'fill-current' : ''}`} />
                      {isInWatchLater ? 'Remove from Watch Later' : 'Save to Watch Later'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownload} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare} className="gap-2">
                      <Share2 className="w-4 h-4" />
                      Share
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Description */}
            <div className="mt-4 p-3 bg-secondary rounded-xl">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <span>{formatViews(video.views_count || 0)} views</span>
                <span>•</span>
                <span>{video.created_at ? formatDistanceToNow(new Date(video.created_at), { addSuffix: true }) : 'Recently'}</span>
              </div>
              <p className={`text-sm whitespace-pre-wrap ${!showFullDescription ? 'line-clamp-2' : ''}`}>
                {video.description || 'No description'}
              </p>
              {video.description && video.description.length > 100 && (
                <button 
                  className="text-sm font-medium mt-2"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                >
                  {showFullDescription ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
            
            {/* Comments Section with Toggle */}
            <div className="mt-6">
              <button
                onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                className="flex items-center gap-3 w-full text-left py-2 mb-4"
              >
                <MessageCircle className="w-5 h-5" />
                <h3 className="text-lg font-semibold flex-1">
                  {comments?.length || 0} Comments
                </h3>
                {isCommentsOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              
              {isCommentsOpen && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  {/* Add Comment */}
                  {user && (
                    <div className="flex gap-3 mb-6">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>{user.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Textarea
                          placeholder="Add a comment..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="min-h-[40px] resize-none"
                        />
                        {commentText && (
                          <div className="flex justify-end gap-2 mt-2">
                            <Button variant="ghost" onClick={() => setCommentText("")}>
                              Cancel
                            </Button>
                            <Button onClick={handleComment} disabled={addComment.isPending}>
                              {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Comment'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Comments List */}
                  {commentsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(comments || []).filter((c: any) => !c.parent_comment_id).map((comment: any) => (
                        <CommentItem
                          key={comment.id}
                          comment={comment}
                          videoId={videoId!}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Related Videos Sidebar - Algorithm Powered */}
        <div className="w-full lg:w-[400px] space-y-3">
          <h3 className="font-semibold mb-3">Related Videos</h3>
          {relatedVideos.map((vid) => (
            <div 
              key={vid.id}
              className="flex gap-2 cursor-pointer group"
              onClick={() => navigate(`/movion/watch/${vid.id}`)}
            >
              <div className="relative w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                <img 
                  src={vid.thumbnail} 
                  alt={vid.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                  {vid.duration}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary">
                  {vid.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">{vid.channelName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatViews(vid.views)} views
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        postId={video.id}
        postType="video"
        postContent={video.title}
        postImage={video.thumbnail_url}
      />
    </div>
  );
};

export default MovionWatch;
