import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { Settings, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

import { PlaybackSample } from '@/lib/movion/watchSession';
import { useModuleVisible } from '@/lib/navigation/moduleVisibility';

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
  onPlaybackSample?: (media: PlaybackSample) => void;
  onPlaybackPause?: () => void;
  paused?: boolean;
}

export const HLSVideoPlayer = ({
  videoUrl,
  hlsUrl,
  qualities = [],
  poster,
  autoPlay = false,
  onTimeUpdate, onPlaybackSample, onPlaybackPause, paused = false,
}: HLSVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [currentQuality, setCurrentQuality] = useState<string>("auto");
  const [availableLevels, setAvailableLevels] = useState<{ height: number; index: number }[]>([]);

  const visible = useModuleVisible();
  const blocked = paused || !visible;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const autoPlayRef = useRef(autoPlay);
  autoPlayRef.current = autoPlay;
  const readyQualities = useMemo(() => qualities.filter(q => q.status === 'ready')
    .sort((a,b) => (b.height || 0) - (a.height || 0)), [qualities]);
  const directSource = currentQuality === 'auto' ? videoUrl : readyQualities.find(q => q.resolution === currentQuality)?.video_url || videoUrl;
  const source = hlsUrl || directSource;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;
    const position = video.currentTime;
    const resume = !video.paused || autoPlayRef.current;
    const restore = () => {
      if (position > 0 && Number.isFinite(video.duration)) video.currentTime = Math.min(position,video.duration);
      if (resume && !blockedRef.current) void video.play().catch(() => {});
    };
    video.addEventListener('loadedmetadata', restore, { once: true });
    let hls: Hls | undefined;
    if (source.includes('.m3u8') && !video.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, backBufferLength: 90 });
      hlsRef.current = hls;
      hls.loadSource(source); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setAvailableLevels(data.levels.map((level,index) => ({ height: level.height,index })));
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal && videoUrl && videoUrl !== source) {
          hls?.destroy(); hlsRef.current = null; setAvailableLevels([]);
          video.src = videoUrl;
        }
      });
    } else { video.src = source; }
    return () => { video.removeEventListener('loadedmetadata', restore); hls?.destroy(); hlsRef.current = null; };
  }, [source, videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (blocked) video.pause();
    else if (autoPlay) void video.play().catch(() => {});
  }, [blocked, autoPlay]);

  useEffect(() => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = currentQuality === 'auto' ? -1 :
      (availableLevels.find(level => `${level.height}p` === currentQuality)?.index ?? -1);
  }, [currentQuality, availableLevels]);

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
        onTimeUpdate={e => { onPlaybackSample?.(e.currentTarget); onTimeUpdate?.(e.currentTarget.currentTime, e.currentTarget.duration); }}
        onPause={onPlaybackPause}
        onSeeking={onPlaybackPause}
        onEnded={onPlaybackPause}
        onPlay={e => { if (blocked) e.currentTarget.pause(); }}
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
