import { useRef, useState, useEffect } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVideoAutoPlay } from "@/hooks/useVideoAutoPlay";

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
 * Facebook/Instagram-style video preview:
 * - Shows a poster (provided or auto-captured frame @ ~1s) with centered play button
 * - No timeline/controls until the user taps play
 * - On tap: shows native controls and plays
 * Does NOT change upload/storage/playback logic.
 */
export const VideoThumb = ({ src, poster, className, aspect = "cover", previewOnly = false, autoPlay = true }: VideoThumbProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [generatedPoster] = useState<string | undefined>(poster);

  // Scroll auto-play (muted). Disabled for preview-only thumbnails (navigation tiles).
  const autoPlayEnabled = autoPlay && !previewOnly;
  useVideoAutoPlay(videoRef, { autoPlay: autoPlayEnabled });

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
  }, [poster, started, src]);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStarted(true);
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        v.play().catch(() => {});
      }
    });
  };

  const showOverlay = !started;
  const isPointerThrough = previewOnly;

  return (
    <div className={cn("relative bg-black w-full h-full", className)}>
      <video
        ref={videoRef}
        src={src}
        poster={generatedPoster}
        controls={started && !previewOnly}
        playsInline
        preload="metadata"
        muted={!started}
        className={cn(
          "w-full h-full",
          aspect === "contain" ? "object-contain" : "object-cover"
        )}
      />
      {showOverlay && (
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
    </div>
  );
};

export default VideoThumb;
