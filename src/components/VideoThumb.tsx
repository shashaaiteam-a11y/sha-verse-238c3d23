import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Volume2, VolumeX, RotateCcw, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVideoAutoPlay } from "@/hooks/useVideoAutoPlay";
import {
  getAudioPreference,
  setAudioPreference,
  subscribeAudioPreference,
} from "@/lib/media/audioPreference";

interface VideoThumbProps {
  src: string;
  poster?: string;
  className?: string;
  aspect?: "contain" | "cover";
  /** If true, never plays inline — just shows a thumbnail with play icon (parent handles click) */
  previewOnly?: boolean;
  /** Scroll auto-play (muted). Defaults to true; ignored when previewOnly. */
  autoPlay?: boolean;
}

/**
 * Facebook/Instagram-style inline video:
 *  - Auto-plays muted when >= 60% visible (via useVideoAutoPlay).
 *  - Global sound preference: tap the speaker icon once → all future videos
 *    play with sound. Mute again → future videos stay muted. Persisted.
 *  - Volume fades in/out (~250ms) to avoid audio popping.
 *  - Single-tap toggles mute/unmute (updates the global preference).
 *  - Native controls appear only after explicit play tap (unchanged).
 *  - Friendly retry UI on load error.
 * Does NOT change upload/storage/playback logic.
 */
export const VideoThumb = ({ src, poster, className, aspect = "cover", previewOnly = false, autoPlay = true }: VideoThumbProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [generatedPoster] = useState<string | undefined>(poster);
  const [soundOn, setSoundOn] = useState<boolean>(() => getAudioPreference());
  const [isPlaying, setIsPlaying] = useState(false);
  const [errored, setErrored] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Scroll auto-play (muted). Disabled for preview-only thumbnails (navigation tiles).
  const autoPlayEnabled = autoPlay && !previewOnly;
  useVideoAutoPlay(videoRef, { autoPlay: autoPlayEnabled });

  // Reflect global audio preference locally so the speaker icon stays in sync.
  useEffect(() => {
    return subscribeAudioPreference(setSoundOn);
  }, []);

  // Track playing state for showing the speaker overlay only while playing.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => setErrored(true);
    const onLoad = () => setErrored(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("error", onError);
    v.addEventListener("loadeddata", onLoad);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("error", onError);
      v.removeEventListener("loadeddata", onLoad);
    };
  }, [reloadKey]);

  // If no poster provided, seek the video to ~1s so the first painted frame is a real frame, not black.
  // Skip when auto-play is enabled — the video will paint a real frame on play.
  useEffect(() => {
    if (poster || started || autoPlayEnabled) return;
    const v = videoRef.current;
    if (!v) return;

    const onLoaded = () => {
      try {
        if (v.duration && isFinite(v.duration)) {
          const t = Math.min(1, Math.max(0, v.duration / 2));
          v.currentTime = t;
        }
      } catch {}
    };

    v.addEventListener("loadedmetadata", onLoaded);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [poster, started, src, autoPlayEnabled]);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStarted(true);
    // Explicit play tap = user engagement, so treat as sound-on intent.
    setAudioPreference(true);
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (v) {
        v.dataset.engaged = "true";
        v.muted = false;
        v.currentTime = 0;
        v.play().catch(() => {});
      }
    });
  };

  const toggleSound = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = !getAudioPreference();
    setAudioPreference(next);
    const v = videoRef.current;
    if (v && !v.paused) {
      v.muted = !next;
    }
  }, []);

  const retry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setErrored(false);
    setReloadKey((k) => k + 1);
  }, []);

  // Fullscreen toggle — true fullscreen on the SAME video element.
  // Exiting fullscreen (system back/close) returns to the exact same
  // screen/scroll position automatically; playback state is untouched.
  const toggleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const v = videoRef.current as (HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitRequestFullscreen?: () => void;
    }) | null;
    if (!v) return;
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      } else if (v.requestFullscreen) {
        v.requestFullscreen().catch(() => {
          // Fallbacks for older WebViews / iOS-style players
          if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
          else v.webkitRequestFullscreen?.();
        });
      } else if (v.webkitEnterFullscreen) {
        v.webkitEnterFullscreen();
      } else {
        v.webkitRequestFullscreen?.();
      }
    } catch {
      v.webkitEnterFullscreen?.();
    }
  }, []);

  const showPlayOverlay = !started && !autoPlayEnabled;
  const isPointerThrough = previewOnly;

  return (
    <div className={cn("relative bg-black w-full h-full", className)}>
      <video
        key={reloadKey}
        ref={videoRef}
        src={src}
        poster={generatedPoster}
        controls={started && !previewOnly}
        playsInline
        preload="metadata"
        muted={!started && !soundOn}
        className={cn(
          "w-full h-full",
          aspect === "contain" ? "object-contain" : "object-cover"
        )}
      />

      {/* Explicit play overlay (only when auto-play is disabled) */}
      {showPlayOverlay && (
        <div
          onClick={previewOnly ? undefined : handlePlay}
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/10 transition-colors",
            isPointerThrough ? "pointer-events-none" : "hover:bg-black/20 cursor-pointer"
          )}
          aria-label="Play video"
          role={previewOnly ? undefined : "button"}
        >
          <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white fill-white ml-1" />
          </span>
        </div>
      )}

      {/* Speaker toggle — shown for autoplay-enabled feed videos while playing */}
      {autoPlayEnabled && !previewOnly && !errored && (isPlaying || soundOn) && (
        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundOn ? "Mute video" : "Unmute video"}
          aria-pressed={soundOn}
          className={cn(
            "absolute bottom-3 right-3 z-10 w-10 h-10 rounded-full",
            "bg-black/60 backdrop-blur-sm text-white shadow-lg",
            "flex items-center justify-center",
            "hover:bg-black/75 active:scale-95 transition-all",
            !soundOn && "motion-safe:animate-pulse"
          )}
        >
          {soundOn ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>
      )}

      {/* Error / retry overlay */}
      {errored && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white text-sm gap-3 z-20">
          <p className="opacity-90">Video failed to load</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoThumb;
