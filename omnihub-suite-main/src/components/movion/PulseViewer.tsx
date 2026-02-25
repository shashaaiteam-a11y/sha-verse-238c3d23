// Pulse Viewer - Full-screen vertical video viewer with swipe navigation
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  X, Heart, MessageCircle, Share2, Bookmark, MoreVertical,
  Volume2, VolumeX, ChevronUp, ChevronDown, Link2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useVideoLike } from "@/hooks/useVideoLikes";
import { useIsSaved, useToggleSaved } from "@/hooks/useSavedVideos";
import { useIsSubscribed, useToggleSubscription } from "@/hooks/useSubscriptions";
import { toast } from "sonner";

interface Video {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  hls_url?: string | null;
  thumbnail_url?: string | null;
  views_count?: number | null;
  likes_count?: number | null;
  comments_count?: number | null;
  channels?: {
    id: string;
    name: string;
    avatar_url?: string | null;
    subscribers_count?: number | null;
  } | null;
}

interface PulseViewerProps {
  videos: Video[];
  initialIndex?: number;
  onClose: () => void;
}

const formatCount = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export const PulseViewer = ({ videos, initialIndex = 0, onClose }: PulseViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentVideo = videos[currentIndex];
  const { isLiked, toggleLike } = useVideoLike(currentVideo?.id);
  const isSaved = useIsSaved(currentVideo?.id);
  const toggleSave = useToggleSaved();
  const isSubscribed = useIsSubscribed(currentVideo?.channels?.id);
  const toggleSubscription = useToggleSubscription();

  const goToNext = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, videos.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') goToNext();
      if (e.key === 'ArrowUp' || e.key === 'k') goToPrev();
      if (e.key === 'Escape') onClose();
      if (e.key === 'm') setIsMuted(prev => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, onClose]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNext();
      else goToPrev();
    }
    
    setTouchStart(null);
  };

  // Auto-play when video changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex]);

  const handleLike = () => {
    if (!user) {
      toast.error("Please sign in to react");
      return;
    }
    toggleLike.mutate();
  };

  const handleSave = () => {
    if (!user) {
      toast.error("Please sign in to save");
      return;
    }
    if (currentVideo) {
      toggleSave.mutate({ videoId: currentVideo.id, isSaved });
    }
  };

  const handleFollow = () => {
    if (!user) {
      toast.error("Please sign in to link-up");
      return;
    }
    if (currentVideo?.channels?.id) {
      toggleSubscription.mutate({
        channelId: currentVideo.channels.id,
        isSubscribed
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: currentVideo?.title,
        url: `${window.location.origin}/movion/pulse/${currentVideo?.id}`
      });
    } catch {
      navigator.clipboard.writeText(`${window.location.origin}/movion/pulse/${currentVideo?.id}`);
      toast.success("Link copied!");
    }
  };

  if (!currentVideo) return null;

  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Video Container - 9:16 aspect ratio for Shorts/Pulse format */}
      <div className="relative w-full h-full md:w-auto md:h-full md:max-h-screen md:aspect-[9/16] mx-auto bg-black"
      >
        {/* Video - fullscreen 9:16 vertical display */}
        <video
          ref={videoRef}
          src={currentVideo.hls_url || currentVideo.video_url || ''}
          poster={currentVideo.thumbnail_url || undefined}
          className="w-full h-full object-cover"
          loop
          muted={isMuted}
          playsInline
          autoPlay
          onClick={() => {
            if (videoRef.current?.paused) {
              videoRef.current.play();
            } else {
              videoRef.current?.pause();
            }
          }}
        />

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 rounded-full bg-background/30 backdrop-blur-sm text-white hover:bg-background/50"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Mute button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 rounded-full bg-background/30 backdrop-blur-sm text-white hover:bg-background/50"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>

        {/* Navigation arrows (desktop) */}
        <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full bg-background/30 backdrop-blur-sm text-white hover:bg-background/50",
              currentIndex === 0 && "opacity-30 pointer-events-none"
            )}
            onClick={goToPrev}
          >
            <ChevronUp className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full bg-background/30 backdrop-blur-sm text-white hover:bg-background/50",
              currentIndex === videos.length - 1 && "opacity-30 pointer-events-none"
            )}
            onClick={goToNext}
          >
            <ChevronDown className="w-6 h-6" />
          </Button>
        </div>

        {/* Right side actions */}
        <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5">
          {/* Like */}
          <button onClick={handleLike} className="flex flex-col items-center gap-1">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all",
              isLiked ? "bg-red-500 text-white" : "bg-background/30 backdrop-blur-sm text-white"
            )}>
              <Heart className={cn("w-6 h-6", isLiked && "fill-current")} />
            </div>
            <span className="text-white text-xs font-medium">
              {formatCount(currentVideo.likes_count || 0)}
            </span>
          </button>

          {/* Comment */}
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center text-white">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">
              {formatCount(currentVideo.comments_count || 0)}
            </span>
          </button>

          {/* Save */}
          <button onClick={handleSave} className="flex flex-col items-center gap-1">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all",
              isSaved ? "bg-primary text-primary-foreground" : "bg-background/30 backdrop-blur-sm text-white"
            )}>
              <Bookmark className={cn("w-6 h-6", isSaved && "fill-current")} />
            </div>
            <span className="text-white text-xs font-medium">Save</span>
          </button>

          {/* Share */}
          <button onClick={handleShare} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center text-white">
              <Share2 className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">Share</span>
          </button>

          {/* More */}
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center text-white">
              <MoreVertical className="w-6 h-6" />
            </div>
          </button>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-4 left-4 right-20 text-white">
          {/* Channel info */}
          {currentVideo.channels && (
            <div className="flex items-center gap-3 mb-3">
              <Avatar 
                className="w-10 h-10 cursor-pointer ring-2 ring-white/30"
                onClick={() => navigate(`/movion/channel/${currentVideo.channels!.id}`)}
              >
                <AvatarImage src={currentVideo.channels.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  {currentVideo.channels.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  @{currentVideo.channels.name}
                </p>
              </div>
              <Button
                size="sm"
                variant={isSubscribed ? "secondary" : "default"}
                className={cn(
                  "rounded-full text-xs h-8 gap-1",
                  isSubscribed ? "bg-white/20 text-white hover:bg-white/30" : "bg-white text-black hover:bg-white/90"
                )}
                onClick={handleFollow}
              >
                <Link2 className="w-3 h-3" />
                {isSubscribed ? "Linked" : "Link-up"}
              </Button>
            </div>
          )}

          {/* Title & Description */}
          <h3 className="font-semibold text-sm line-clamp-2 mb-1">
            {currentVideo.title}
          </h3>
          {currentVideo.description && (
            <p className="text-xs text-white/70 line-clamp-2">
              {currentVideo.description}
            </p>
          )}
        </div>

        {/* Progress indicator */}
        <div className="absolute bottom-0 left-0 right-0 flex gap-1 p-2">
          {videos.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                idx === currentIndex ? "bg-white" : "bg-white/30"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
