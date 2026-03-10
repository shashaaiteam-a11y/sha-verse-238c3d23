import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Settings, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface VideoQuality {
  resolution: string;
  video_url: string;
  width?: number;
  height?: number;
  status: string;
}

interface HLSVideoPlayerProps {
  videoUrl: string;
  hlsUrl?: string | null;
  qualities?: VideoQuality[];
  poster?: string;
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export const HLSVideoPlayer = ({
  videoUrl,
  hlsUrl,
  qualities = [],
  poster,
  autoPlay = false,
  onTimeUpdate,
}: HLSVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [currentQuality, setCurrentQuality] = useState<string>("auto");
  const [availableLevels, setAvailableLevels] = useState<{ height: number; index: number }[]>([]);

  // Get ready qualities sorted by resolution
  const readyQualities = qualities
    .filter((q) => q.status === "ready")
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // If HLS URL is available and browser supports HLS.js
    if (hlsUrl && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const levels = data.levels.map((level, index) => ({
          height: level.height,
          index,
        }));
        setAvailableLevels(levels);
        
        if (autoPlay) {
          video.play().catch(console.error);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data);
          // Fallback to direct video URL
          video.src = videoUrl;
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } 
    // Native HLS support (Safari)
    else if (hlsUrl && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      if (autoPlay) {
        video.play().catch(console.error);
      }
    }
    // Fallback to direct video or quality selection
    else {
      const selectedQuality = readyQualities.find((q) => q.resolution === currentQuality);
      video.src = selectedQuality?.video_url || videoUrl;
      if (autoPlay) {
        video.play().catch(console.error);
      }
    }
  }, [hlsUrl, videoUrl, autoPlay]);

  // Handle quality change for non-HLS
  useEffect(() => {
    if (hlsRef.current && currentQuality !== "auto") {
      const level = availableLevels.find((l) => `${l.height}p` === currentQuality);
      if (level !== undefined) {
        hlsRef.current.currentLevel = level.index;
      }
    } else if (hlsRef.current && currentQuality === "auto") {
      hlsRef.current.currentLevel = -1; // Auto
    } else if (!hlsRef.current && videoRef.current) {
      // Direct quality switching for non-HLS
      const selectedQuality = readyQualities.find((q) => q.resolution === currentQuality);
      if (selectedQuality) {
        const currentTime = videoRef.current.currentTime;
        videoRef.current.src = selectedQuality.video_url;
        videoRef.current.currentTime = currentTime;
        videoRef.current.play().catch(console.error);
      }
    }
  }, [currentQuality, availableLevels, readyQualities]);

  // Time update handler
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onTimeUpdate) return;

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime, video.duration);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [onTimeUpdate]);

  const qualityOptions = hlsRef.current
    ? [
        { label: "Auto", value: "auto" },
        ...availableLevels.map((l) => ({
          label: `${l.height}p`,
          value: `${l.height}p`,
        })),
      ]
    : [
        ...readyQualities.map((q) => ({
          label: q.resolution,
          value: q.resolution,
        })),
      ];

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        poster={poster}
        playsInline
      />

      {/* Quality selector overlay */}
      {qualityOptions.length > 1 && (
        <div className="absolute bottom-16 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="bg-black/70 hover:bg-black/90 text-white"
              >
                <Settings className="w-4 h-4 mr-1" />
                {currentQuality === "auto" ? "Auto" : currentQuality}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[100px]">
              {qualityOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setCurrentQuality(option.value)}
                  className="flex items-center justify-between"
                >
                  {option.label}
                  {currentQuality === option.value && (
                    <Check className="w-4 h-4 ml-2" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};
