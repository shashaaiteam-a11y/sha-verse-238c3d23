import { useState, useEffect, useRef, useCallback, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Pause, Play, Trash2, Eye, Heart, Send, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StoryGroup, StoryView, StoryReaction } from "@/hooks/useStories";
import { useStories } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface FacebookStoryViewerProps {
  storyGroup: StoryGroup;
  allGroups: StoryGroup[];
  onClose: () => void;
  onGroupChange: (group: StoryGroup) => void;
}

const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "🔥"];

const FacebookStoryViewer = ({
  storyGroup,
  allGroups,
  onClose,
  onGroupChange
}: FacebookStoryViewerProps) => {
  const { user } = useAuth();
  const { viewStory, deleteStory, reactToStory, replyToStory, getStoryViewers, getStoryReactions } = useStories();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaDuration, setMediaDuration] = useState<number>(5000);
  const [mediaError, setMediaError] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const [viewers, setViewers] = useState<StoryView[]>([]);
  const [reactions, setReactions] = useState<StoryReaction[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentStory = storyGroup.stories[currentIndex];
  const isOwnStory = storyGroup.user.id === user?.id;
  const currentGroupIndex = allGroups.findIndex(g => g.user.id === storyGroup.user.id);

  // Lock body scroll when story viewer is open (like Facebook)
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Load viewers and reactions for own stories
  useEffect(() => {
    if (isOwnStory && currentStory) {
      getStoryViewers(currentStory.id).then(setViewers).catch(console.error);
      getStoryReactions(currentStory.id).then(setReactions).catch(console.error);
    }
  }, [currentStory?.id, isOwnStory]);

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

  // Start progress and timer
  const startTimer = useCallback(() => {
    clearTimers();

    const duration = mediaDuration;
    const startTime = Date.now();

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / duration) * 100;
      setProgress(Math.min(newProgress, 100));
    }, 50);

    // Only set auto-advance timer for non-video content
    // Videos will advance on "ended" event to prevent premature skipping
    if (currentStory?.media_type !== 'video') {
      timerRef.current = setTimeout(() => {
        goToNext();
      }, duration);
    }
  }, [mediaDuration, clearTimers, currentStory?.media_type]);

  // Handle story change
  useEffect(() => {
    setProgress(0);
    setMediaLoaded(false);
    setMediaError(false);
    setMediaDuration(currentStory?.story_type === 'text' ? 5000 : 5000);
    clearTimers();

    // Mark story as viewed
    if (currentStory && !isOwnStory) {
      viewStory.mutate(currentStory.id);
    }
  }, [currentIndex, currentStory?.id]);

  // Handle pause/resume
  useEffect(() => {
    if (!mediaLoaded || isPaused) {
      clearTimers();
      if (videoRef.current && isPaused) {
        videoRef.current.pause();
      }
    } else {
      if (videoRef.current && currentStory?.media_type === 'video') {
        videoRef.current.play().catch(console.error);
      }
      startTimer();
    }

    return clearTimers;
  }, [mediaLoaded, isPaused, startTimer, clearTimers, currentStory?.media_type]);

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      if (duration && isFinite(duration) && duration > 0) {
        // Support videos up to 5 hours - use actual duration for playback
        // Max duration is 5 hours (18000 seconds)
        const maxDuration = 5 * 60 * 60 * 1000; // 5 hours in ms
        setMediaDuration(Math.min(duration * 1000, maxDuration));
      }
    }
    setMediaLoaded(true);
  };

  const handleVideoCanPlay = () => {
    if (!mediaLoaded && videoRef.current) {
      const duration = videoRef.current.duration;
      if (duration && isFinite(duration) && duration > 0) {
        // Support long videos up to 5 hours
        const maxDuration = 5 * 60 * 60 * 1000; // 5 hours in ms
        setMediaDuration(Math.min(duration * 1000, maxDuration));
      }
      setMediaLoaded(true);
    }
  };

  const handleImageLoaded = () => {
    setMediaDuration(5000);
    setMediaLoaded(true);
  };

  const handleTextStoryLoaded = useCallback(() => {
    setMediaDuration(5000);
    setMediaLoaded(true);
  }, []);

  // Auto-load for text stories - check both story_type and media_type for robustness
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
      setMediaDuration(5000);
      setMediaLoaded(true);
    }
  }, [currentStory?.story_type, currentStory?.media_type, currentStory?.media_url, mediaLoaded]);

  const handleMediaError = () => {
    console.error("Media load error");
    setMediaError(true);
    setMediaLoaded(true);
    // Keep showing error for 10 seconds so user can see the message
    setMediaDuration(10000);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else if (currentGroupIndex > 0) {
      // Go to previous user's stories
      onGroupChange(allGroups[currentGroupIndex - 1]);
    }
  };

  const goToNext = () => {
    if (currentIndex < storyGroup.stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (currentGroupIndex < allGroups.length - 1) {
      // Go to next user's stories
      onGroupChange(allGroups[currentGroupIndex + 1]);
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

  const handleReaction = async (reaction: string) => {
    await reactToStory.mutateAsync({
      storyId: currentStory.id,
      reactionType: reaction,
    });
    setShowReactions(false);
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;

    await replyToStory.mutateAsync({
      storyId: currentStory.id,
      recipientId: storyGroup.user.id,
      message: replyText.trim(),
    });
    setReplyText("");
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  };

  // Refresh viewers + reactions on demand (called when opening viewers sheet)
  const refreshViewersAndReactions = useCallback(async () => {
    if (!isOwnStory || !currentStory) return;

    try {
      const [latestViewers, latestReactions] = await Promise.all([
        getStoryViewers(currentStory.id),
        getStoryReactions(currentStory.id),
      ]);
      setViewers(latestViewers);
      setReactions(latestReactions);
    } catch (error) {
      console.error(error);
    }
  }, [isOwnStory, currentStory?.id, getStoryViewers, getStoryReactions]);

  // Auto-refresh viewers list every 5s while own story is open (lightweight realtime feel)
  useEffect(() => {
    if (!isOwnStory || !currentStory) return;
    const interval = setInterval(() => {
      refreshViewersAndReactions();
    }, 5000);
    return () => clearInterval(interval);
  }, [isOwnStory, currentStory?.id, refreshViewersAndReactions]);

  // Open viewers without touching story playback state.
  const handleOpenViewers = useCallback((event?: MouseEvent<HTMLElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    setShowViewers(true);
    void refreshViewersAndReactions();
  }, [refreshViewersAndReactions]);

  // True realtime updates while the viewers sheet/story is open; polling above remains a fallback.
  useEffect(() => {
    if (!isOwnStory || !currentStory) return;

    const channel = supabase
      .channel(`story-viewers-${currentStory.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'story_views',
        filter: `story_id=eq.${currentStory.id}`,
      }, () => {
        void refreshViewersAndReactions();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'story_reactions',
        filter: `story_id=eq.${currentStory.id}`,
      }, () => {
        void refreshViewersAndReactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOwnStory, currentStory?.id, refreshViewersAndReactions]);

  if (!currentStory) {
    return null;
  }

  const viewer = (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center overflow-hidden">
      {/* Previous user indicator */}
      {currentGroupIndex > 0 && (
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer z-40 hidden md:block"
          onClick={() => onGroupChange(allGroups[currentGroupIndex - 1])}
        >
          <Avatar className="w-12 h-12 border-2 border-white/50 opacity-60 hover:opacity-100 transition-opacity">
            <AvatarImage src={allGroups[currentGroupIndex - 1].user.avatar_url || ""} />
            <AvatarFallback>
              {allGroups[currentGroupIndex - 1].user.display_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Next user indicator */}
      {currentGroupIndex < allGroups.length - 1 && (
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer z-40 hidden md:block"
          onClick={() => onGroupChange(allGroups[currentGroupIndex + 1])}
        >
          <Avatar className="w-12 h-12 border-2 border-white/50 opacity-60 hover:opacity-100 transition-opacity">
            <AvatarImage src={allGroups[currentGroupIndex + 1].user.avatar_url || ""} />
            <AvatarFallback>
              {allGroups[currentGroupIndex + 1].user.display_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Story container - Fullscreen on mobile, 9:16 on desktop/tablet to match Facebook style */}
      <div className="relative w-full h-[100dvh] md:w-auto md:h-[95vh] md:aspect-[9/16] mx-auto flex flex-col bg-black overflow-hidden rounded-none md:rounded-xl shadow-2xl">
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

        {/* Close button - isolated, separated from action icons to avoid mis-taps */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 text-white hover:bg-white/20 z-50 h-10 w-10 rounded-full bg-black/40"
          onClick={onClose}
          aria-label="Close story"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* User info - leaves right padding so it never overlaps the close button */}
        <div className="absolute top-8 left-4 right-14 z-40 flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src={storyGroup.user.avatar_url || ""} />
            <AvatarFallback>
              {storyGroup.user.display_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">
              {storyGroup.user.display_name}
            </p>
            <p className="text-white/70 text-xs">
              {formatDistanceToNow(new Date(currentStory.created_at), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>

        {/* Action icons row - placed BELOW user info with clear separation from close button */}
        <div className="absolute top-20 right-2 z-40 flex items-center gap-1 bg-black/30 rounded-full px-1 py-1 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-9 w-9 rounded-full"
            onClick={togglePause}
            aria-label={isPaused ? "Play" : "Pause"}
          >
            {isPaused ? (
              <Play className="w-4 h-4" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </Button>
          {isOwnStory && (
            <>
              <Sheet open={showViewers} onOpenChange={(open) => { setShowViewers(open); if (open) handleOpenViewers(); }}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-9 w-9 rounded-full"
                    aria-label="View story viewers"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[60vh]">
                  <SheetHeader>
                    <SheetTitle>Story Viewers ({viewers.length})</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-3 overflow-y-auto">
                    {viewers.map((view) => (
                      <div key={view.id} className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={view.viewer?.avatar_url || ""} />
                          <AvatarFallback>
                            {view.viewer?.display_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{view.viewer?.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(view.viewed_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {viewers.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        No one has viewed this story yet
                      </p>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-9 w-9 rounded-full"
                onClick={handleDeleteStory}
                aria-label="Delete story"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Loading indicator */}
        {!mediaLoaded && !mediaError && currentStory.story_type !== 'text' && currentStory.media_type !== 'text' && (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Story content - fullscreen 9:16 display */}
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          {mediaError ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-white text-center p-8 bg-gradient-to-b from-gray-800 to-gray-900">
              <p className="text-lg mb-2">Unable to load media</p>
              <p className="text-sm text-white/70 mb-4">The story content could not be displayed</p>
              <p className="text-xs text-white/50">Tap right to go to next story</p>
            </div>
          ) : (currentStory.story_type === "text" || currentStory.media_type === "text") ? (
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
              className="w-full h-full object-contain bg-black"
              autoPlay
              playsInline
              muted={true} // Start muted to ensure autoplay works on all browsers
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
              className="w-full h-full object-contain bg-black"
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
        {currentStory.caption && currentStory.story_type !== "text" && (
          <div className="absolute bottom-20 left-4 right-4 z-40">
            <p className="text-white text-center bg-black/50 rounded-lg px-4 py-2">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Muted Hint for Video */}
        {currentStory.media_type === "video" && !isPaused && (
          <div
            className="absolute top-20 right-4 z-40 bg-black/50 rounded-full p-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
          >
            {/* Simple speaker icon could go here or just rely on user tapping */}
            <span className="text-xs text-white font-medium px-2">Tap to unmute</span>
          </div>
        )}

        {/* Navigation areas */}
        <div
          className="absolute left-0 top-0 bottom-20 w-1/3 z-30 cursor-pointer"
          onClick={goToPrevious}
        />
        <div
          className="absolute right-0 top-0 bottom-20 w-1/3 z-30 cursor-pointer"
          onClick={goToNext}
        />

        {/* Reply/React section for others' stories */}
        {!isOwnStory && (
          <div className="absolute bottom-4 left-4 right-4 z-40 flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to story..."
                className="bg-white/20 border-none text-white placeholder:text-white/70 pr-10"
                onKeyDown={(e) => e.key === "Enter" && handleReply()}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 text-white h-8 w-8"
                onClick={handleReply}
                disabled={!replyText.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Reactions */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setShowReactions(!showReactions)}
              >
                <Heart className="w-5 h-5" />
              </Button>

              {showReactions && (
                <div className="absolute bottom-full right-0 mb-2 bg-background rounded-full px-2 py-1 flex gap-1 shadow-lg">
                  {REACTIONS.map((reaction) => (
                    <button
                      key={reaction}
                      className="text-xl hover:scale-125 transition-transform p-1"
                      onClick={() => handleReaction(reaction)}
                    >
                      {reaction}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* View count for own stories - clickable to open viewers sheet */}
        {isOwnStory && (
          <button
            type="button"
            onClick={handleOpenViewers}
            className="absolute bottom-4 left-4 z-40 flex items-center gap-2 text-white bg-black/40 hover:bg-black/60 active:bg-black/70 rounded-full px-3 py-1.5 transition-colors"
            aria-label="View story viewers"
          >
            <Eye className="w-5 h-5" />
            <span className="text-sm font-medium">{viewers.length || currentStory.views_count || 0} views</span>
          </button>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(viewer, document.body) : viewer;
};

export default FacebookStoryViewer;
