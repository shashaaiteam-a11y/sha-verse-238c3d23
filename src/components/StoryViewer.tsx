import { useState, useEffect, useRef, useCallback } from "react";
import { X, Pause, Play, Trash2, Eye, Heart, Send, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StoryGroup } from "@/hooks/useStories";
import { useStories } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface StoryViewerProps {
  storyGroup: StoryGroup;
  onClose: () => void;
}

const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "🔥"];

const StoryViewer = ({ storyGroup, onClose }: StoryViewerProps) => {
  const { user } = useAuth();
  const { viewStory, deleteStory } = useStories();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const mediaDurationRef = useRef<number>(5000);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerStartedRef = useRef<boolean>(false);

  // Lock body scroll when story viewer is open (like Facebook)
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const currentStory = storyGroup.stories[currentIndex];
  const isOwnStory = storyGroup.user.id === user?.id;
  const currentIndexRef = useRef(currentIndex);
  const onCloseRef = useRef(onClose);

  // Update refs whenever they change
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  // Start progress and timer - without dependencies on currentIndex
  const startTimer = useCallback(() => {
    clearTimers();
    timerStartedRef.current = true;
    
    // Use refs to avoid dependency issues
    const duration = Math.max(mediaDurationRef.current, 5000);
    const startTime = Date.now();

    // Progress bar animation
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / duration) * 100;
      setProgress(Math.min(newProgress, 100));
    }, 50);

    // Auto-advance timer
    timerRef.current = setTimeout(() => {
      const nextIndex = currentIndexRef.current + 1;
      if (nextIndex < storyGroup.stories.length) {
        setCurrentIndex(nextIndex);
      } else {
        onCloseRef.current();
      }
    }, duration);
  }, [storyGroup.stories.length, clearTimers]);

  // Handle story change
  useEffect(() => {
    setProgress(0);
    setMediaLoaded(false);
    setMediaError(false);
    mediaDurationRef.current = 5000;
    timerStartedRef.current = false;
    setShowReactions(false);
    setReplyText("");
    clearTimers();

    // Mark story as viewed and update view count
    if (currentStory && !isOwnStory) {
      viewStory.mutate(currentStory.id);
      setViewCount((prev) => prev + 1);
    }

    // Fallback: if media doesn't load within 8 seconds, silently advance
    const fallbackTimeoutId = setTimeout(() => {
      setMediaLoaded((prevLoaded) => {
        if (!prevLoaded) {
          console.warn("Media fallback timeout - advancing");
          mediaDurationRef.current = 1000; // advance quickly
          setMediaError(false);
          return true;
        }
        return prevLoaded;
      });
    }, 8000);

    return () => clearTimeout(fallbackTimeoutId);
  }, [currentIndex, currentStory?.id]);

  // Handle pause/resume
  useEffect(() => {
    if (isPaused) {
      clearTimers();
      timerStartedRef.current = false; // Reset so timer can restart on resume
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } else if (mediaLoaded && videoRef.current && currentStory?.media_type === 'video') {
      // Resume video if it's paused
      videoRef.current.play().catch(console.error);
    }
  }, [isPaused, mediaLoaded, currentStory?.media_type, clearTimers]);

  // Handle video loaded metadata
  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      if (duration && isFinite(duration) && duration > 0) {
        mediaDurationRef.current = duration * 1000;
      }
    }
    setMediaLoaded(true);
  };

  // Handle video can play
  const handleVideoCanPlay = () => {
    if (!mediaLoaded && videoRef.current) {
      const duration = videoRef.current.duration;
      if (duration && isFinite(duration) && duration > 0) {
        mediaDurationRef.current = duration * 1000;
      }
      setMediaLoaded(true);
    }
  };

  // Handle image loaded
  const handleImageLoaded = () => {
    // Use 5 seconds as minimum for still images
    mediaDurationRef.current = 5000;
    setMediaLoaded(true);
  };

  // Handle media error
  const handleMediaError = () => {
    console.error("Media load error for:", currentStory?.media_url);
    // Don't show error screen — just silently advance to next story
    mediaDurationRef.current = 500;
    setMediaError(false);
    setMediaLoaded(true);
  };

  // Handle text story loaded
  const handleTextStoryLoaded = useCallback(() => {
    mediaDurationRef.current = 5000;
    setMediaLoaded(true);
  }, []);

  // Auto-load for text stories
  useEffect(() => {
    if (currentStory?.story_type === 'text' || currentStory?.media_type === 'text') {
      handleTextStoryLoaded();
    }
  }, [currentStory?.story_type, currentStory?.media_type, handleTextStoryLoaded]);

  // Handle stories with no media_url (missing media) - show for 5 seconds then advance
  useEffect(() => {
    const isMediaStory = currentStory?.story_type !== 'text' && currentStory?.media_type !== 'text';
    const hasNoMedia = !currentStory?.media_url;
    
    if (isMediaStory && hasNoMedia && !mediaLoaded) {
      mediaDurationRef.current = 5000;
      setMediaLoaded(true);
    }
  }, [currentStory?.story_type, currentStory?.media_type, currentStory?.media_url, mediaLoaded]);

  // Dedicated effect to start timer when media is loaded
  useEffect(() => {
    if (mediaLoaded && !isPaused && !timerStartedRef.current) {
      // Small delay to ensure everything is ready
      const timeoutId = setTimeout(() => {
        if (!timerStartedRef.current) {
          startTimer();
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [mediaLoaded, isPaused, startTimer]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < storyGroup.stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleDeleteStory = async () => {
    await deleteStory.mutateAsync(currentStory.id);
    if (storyGroup.stories.length === 1) {
      onClose();
    } else {
      goToNext();
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    console.log("Reply:", replyText);
    // TODO: Integrate with backend
    setReplyText("");
    setIsPaused(false);
  };

  const handleReaction = (reaction: string) => {
    console.log("Reaction:", reaction);
    setShowReactions(false);
    // TODO: Integrate with backend
  };

  if (!currentStory) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-50"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Story container */}
      <div className="relative w-full h-full md:w-auto md:h-[95vh] md:aspect-[9/16] mx-auto flex flex-col bg-black overflow-hidden rounded-none md:rounded-xl shadow-2xl">
        {/* Progress bars */}
        <div className="absolute top-4 left-4 right-4 z-40 flex gap-1">
          {storyGroup.stories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all"
                style={{
                  width:
                    index < currentIndex
                      ? "100%"
                      : index === currentIndex
                      ? `${progress}%`
                      : "0%",
                  transitionDuration: index === currentIndex ? "50ms" : "0ms"
                }}
              />
            </div>
          ))}
        </div>

        {/* User info */}
        <div className="absolute top-8 left-4 right-4 z-40 flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src={storyGroup.user.avatar_url || ""} />
            <AvatarFallback>
              {storyGroup.user.display_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">
              {storyGroup.user.display_name}
            </p>
            <p className="text-white/70 text-xs">
              {formatDistanceToNow(new Date(currentStory.created_at), {
                addSuffix: true,
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={togglePause}
            >
              {isPaused ? (
                <Play className="w-5 h-5" />
              ) : (
                <Pause className="w-5 h-5" />
              )}
            </Button>
            {isOwnStory && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleDeleteStory}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Loading indicator */}
        {!mediaLoaded && !mediaError && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-sm">Loading story...</p>
            </div>
          </div>
        )}

        {/* Story content */}
        <div className="w-full h-full flex items-center justify-center flex-1">
          {(currentStory.story_type === "text" || currentStory.media_type === "text") ? (
            <div
              className="w-full h-full flex items-center justify-center p-8"
              style={{ background: currentStory.background_color || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
            >
              <p className="text-white text-2xl font-semibold text-center">
                {currentStory.text_content}
              </p>
            </div>
          ) : currentStory.media_type === "video" && currentStory.media_url ? (
            <video
              ref={videoRef}
              key={currentStory.id}
              src={currentStory.media_url}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted={false}
              onLoadedMetadata={handleVideoLoadedMetadata}
              onCanPlay={handleVideoCanPlay}
              onError={handleMediaError}
              onEnded={goToNext}
            />
          ) : currentStory.media_url ? (
            <img
              key={currentStory.id}
              src={currentStory.media_url}
              alt=""
              className="w-full h-full object-cover"
              onLoad={handleImageLoaded}
              onError={handleMediaError}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white text-center p-8 bg-gradient-to-b from-gray-800 to-gray-900">
              <p className="text-lg mb-2">No media available</p>
              <p className="text-sm text-white/70">Tap right to go to next story</p>
            </div>
          )}
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute top-20 left-4 right-4 z-40">
            <p className="text-white text-center bg-black/60 rounded-lg px-4 py-2 text-sm">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* View count - like WhatsApp */}
        <div className="absolute bottom-20 left-4 z-40 flex items-center gap-2 text-white/90">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">{viewCount} views</span>
        </div>

        {/* Navigation areas - Instagram style: left half = prev, right half = next */}
        <div
          className="absolute left-0 top-0 bottom-24 w-1/2 z-30 cursor-pointer"
          onClick={goToPrevious}
        />
        <div
          className="absolute right-0 top-0 bottom-24 w-1/2 z-30 cursor-pointer"
          onClick={goToNext}
        />

        {/* Bottom interaction bar - like Instagram */}
        <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-4 px-4">
          {/* Reactions and actions row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Like button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={toggleLike}
              >
                <Heart 
                  className="w-5 h-5"
                  fill={isLiked ? "currentColor" : "none"}
                  color={isLiked ? "#ff3b30" : "currentColor"}
                />
              </Button>

              {/* Reply button */}
              {!isOwnStory && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setIsPaused(true)}
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
              )}

              {/* Reactions button */}
              {!isOwnStory && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 relative"
                  onClick={() => setShowReactions(!showReactions)}
                >
                  <span className="text-lg">😊</span>
                </Button>
              )}
            </div>

            {/* Share button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

          {/* Reactions menu */}
          {showReactions && !isOwnStory && (
            <div className="absolute bottom-16 left-4 right-4 bg-gray-900 rounded-full flex gap-2 p-2 justify-center">
              {REACTIONS.map((reaction) => (
                <button
                  key={reaction}
                  className="text-2xl hover:scale-125 transition-transform"
                  onClick={() => handleReaction(reaction)}
                >
                  {reaction}
                </button>
              ))}
            </div>
          )}

          {/* Reply input box - like Instagram */}
          {!isOwnStory && (
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={(user as any)?.avatar_url || ""} />
                <AvatarFallback>{(user as any)?.display_name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <Input
                placeholder="Reply to this story..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-white/20 border-0 text-white placeholder:text-white/60 rounded-full"
                onFocus={() => setIsPaused(true)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleReply();
                  }
                }}
              />
              {replyText.trim() && (
                <Button
                  size="sm"
                  className="rounded-full bg-white/80 hover:bg-white text-black"
                  onClick={handleReply}
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default StoryViewer;
