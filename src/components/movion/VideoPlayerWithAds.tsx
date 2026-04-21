import { useState, useCallback, useRef, useEffect } from "react";
import { HLSVideoPlayer } from "./HLSVideoPlayer";
import { VideoPreRollAd } from "@/components/ads";
import { VideoMidRollAd } from "@/components/ads";

interface VideoQuality {
  resolution: string;
  video_url: string;
  width?: number;
  height?: number;
  status: string;
}

interface VideoPlayerWithAdsProps {
  videoUrl: string;
  hlsUrl?: string | null;
  qualities?: VideoQuality[];
  poster?: string;
  duration?: number; // in seconds
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

/**
 * Video Player with Pre-roll and Mid-roll Ad Support
 * - Pre-roll: 5-second skippable ad before video starts
 * - Mid-roll: 5-second skippable ad at 50% for videos > 3 minutes
 */
export const VideoPlayerWithAds = ({
  videoUrl,
  hlsUrl,
  qualities = [],
  poster,
  duration = 0,
  onTimeUpdate,
}: VideoPlayerWithAdsProps) => {
  const [showPreRoll, setShowPreRoll] = useState(true);
  const [showMidRoll, setShowMidRoll] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [midRollTriggered, setMidRollTriggered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if video is long enough for mid-roll (> 3 minutes = 180 seconds)
  const shouldShowMidRoll = duration >= 180;
  const midRollTime = duration / 2; // 50% mark

  const handlePreRollComplete = useCallback(() => {
    setShowPreRoll(false);
    setVideoStarted(true);
  }, []);

  const handleMidRollComplete = useCallback(() => {
    setShowMidRoll(false);
  }, []);

  const handleTimeUpdate = useCallback(
    (currentTime: number, videoDuration: number) => {
      // Track for mid-roll trigger
      if (
        shouldShowMidRoll &&
        !midRollTriggered &&
        currentTime >= midRollTime &&
        currentTime < midRollTime + 5 // Small window to trigger once
      ) {
        setShowMidRoll(true);
        setMidRollTriggered(true);
      }

      // Pass through to parent
      onTimeUpdate?.(currentTime, videoDuration);
    },
    [shouldShowMidRoll, midRollTriggered, midRollTime, onTimeUpdate]
  );

  return (
    <div ref={containerRef} className="relative aspect-video bg-black rounded-lg overflow-hidden">
      {/* Pre-roll Ad Overlay */}
      {showPreRoll && (
        <VideoPreRollAd
          onComplete={handlePreRollComplete}
          className="absolute inset-0 z-50"
        />
      )}

      {/* Mid-roll Ad Overlay */}
      {showMidRoll && !showPreRoll && (
        <VideoMidRollAd
          onComplete={handleMidRollComplete}
          className="absolute inset-0 z-50"
        />
      )}

      {/* Main Video Player */}
      {!showPreRoll && !showMidRoll && (
        <HLSVideoPlayer
          videoUrl={videoUrl}
          hlsUrl={hlsUrl}
          qualities={qualities}
          poster={poster}
          autoPlay={videoStarted}
          onTimeUpdate={handleTimeUpdate}
        />
      )}
    </div>
  );
};

export default VideoPlayerWithAds;
