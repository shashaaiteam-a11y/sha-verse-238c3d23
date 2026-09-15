// Movion Shorts Page (Pulse - Vertical Video Feed) - Live with Supabase + Smart Algorithm
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShorts } from '@/hooks/useShorts';
import { useGlobalVideoRealtime } from '@/hooks/useMovionRealtime';
import { usePrioritizedPulse } from '@/hooks/useMovionAlgorithms';
import { useHiddenVideos } from '@/hooks/useHiddenVideos';
import { recordSwipeAway } from '@/hooks/useMovionAlgorithms';
import { ShortsPlayer } from '../components';
import { Loader2 } from 'lucide-react';
import { ShortsScrollAd } from '@/components/ads';
import { useModuleVisible } from '@/lib/navigation/moduleVisibility';

const MovionShorts: React.FC = () => {
  const { videoId } = useParams();
  const visible = useModuleVisible();
  const [activeAdId, setActiveAdId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { shorts, isLoading } = useShorts();
  
  // Enable realtime updates
  useGlobalVideoRealtime();

  // Hidden videos (Not Interested)
  const { hiddenVideos, hideVideo } = useHiddenVideos();

  // Apply pulse algorithm for smart ordering (with hidden filter)
  const rankedVideos = usePrioritizedPulse(shorts, hiddenVideos);
  const orderRef = useRef<string[]>([]);
  // Keep the playing item in place while realtime updates refresh its counters.
  const shortsVideos = useMemo(() => {
    const byId = new Map(rankedVideos.map(video => [video.id, video]));
    const known = orderRef.current.filter(id => byId.has(id));
    const seen = new Set(known);
    orderRef.current = [...known, ...rankedVideos.filter(video => !seen.has(video.id)).map(video => video.id)];
    return orderRef.current.map(id => byId.get(id)!);
  }, [rankedVideos]);

  const [activeId, setActiveId] = useState<string>(videoId || '');
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const activeStartTimeRef = useRef<number>(Date.now());

  // Set initial active ID when shorts load
  useEffect(() => {
    if ((!activeId || !shortsVideos.some(video => video.id === activeId)) && shortsVideos.length > 0) {
      setActiveId(shortsVideos.some(video => video.id === videoId) ? videoId! : shortsVideos[0]?.id || '');
    }
  }, [shortsVideos, videoId, activeId]);

  const activeIndex = useMemo(() => shortsVideos.findIndex(v => v.id === activeId), [shortsVideos, activeId]);

  // Track swipe-away: when active video changes, record how long user watched
  useEffect(() => {
    activeStartTimeRef.current = Date.now();
    return () => {
      if (activeId) {
        const watchMs = Date.now() - activeStartTimeRef.current;
        if (watchMs < 2000 && watchMs > 200) {
          recordSwipeAway(activeId);
        }
      }
    };
  }, [activeId]);

  const scrollToId = useCallback((id: string) => {
    if (!containerRef.current || isScrollingRef.current) return;
    const target = containerRef.current.querySelector(`[data-id="${id}"]`);
    if (target) {
      isScrollingRef.current = true;
      target.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => { isScrollingRef.current = false; }, 500);
      navigate(`/movion/shorts/${id}`, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' && activeIndex < shortsVideos.length - 1) scrollToId(shortsVideos[activeIndex + 1].id);
      else if (e.key === 'ArrowUp' && activeIndex > 0) scrollToId(shortsVideos[activeIndex - 1].id);
    };

    const handleWheel = (e: WheelEvent) => {
      if (isScrollingRef.current) return;
      if (e.deltaY > 50 && activeIndex < shortsVideos.length - 1) scrollToId(shortsVideos[activeIndex + 1].id);
      else if (e.deltaY < -50 && activeIndex > 0) scrollToId(shortsVideos[activeIndex - 1].id);
    };

    window.addEventListener('keydown', handleKeyDown);
    containerRef.current?.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      containerRef.current?.removeEventListener('wheel', handleWheel);
    };
  }, [activeIndex, shortsVideos, scrollToId, visible]);

  useEffect(() => {
    if (!visible || isLoading || !videoId || isScrollingRef.current) return;
    const target = Array.from(containerRef.current?.querySelectorAll('[data-id]') || []).find(el => el.getAttribute('data-id') === videoId);
    target?.scrollIntoView({ behavior: 'auto' });
  }, [videoId, isLoading, shortsVideos.length, visible]);

  useEffect(() => {
    if (!visible) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('data-id');
          if (id?.startsWith('ad:')) setActiveAdId(id);
          else if (id) { setActiveAdId(null); if (id !== activeId) setActiveId(id); }
        }
      });
    }, { root: containerRef.current, threshold: 0.7 });

    const elements = containerRef.current?.querySelectorAll('[data-short-item]');
    elements?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeId, shortsVideos.length, isLoading, visible]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (shortsVideos.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black text-white gap-4">
        <p className="text-xl">No shorts available</p>
        <p className="text-muted-foreground">Be the first to upload a Pulse video!</p>
      </div>
    );
  }

  return (
    <div 
      className="fixed top-14 bottom-16 left-0 right-0 lg:static lg:h-[calc(100vh-56px)] overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black z-40" 
      ref={containerRef}
    >
      {shortsVideos.flatMap((video, idx) => {
        // Pre-fetch: next 3 + previous 1 for smooth swiping
        const diff = idx - activeIndex;
        const shouldLoadMedia = diff >= -1 && diff <= 3;

        const player = (
          <ShortsPlayer 
            key={video.id} 
            video={video} 
            isActive={!activeAdId && video.id === activeId}
            isMuted={isGlobalMuted}
            onMuteToggle={() => setIsGlobalMuted(!isGlobalMuted)}
            shouldPreload={shouldLoadMedia}
            onNotInterested={() => hideVideo(video.id)}
          />
        );

        // Inject scroll ad every 6 shorts
        if ((idx + 1) % 6 === 0) {
          return [
            player,
            <div
              key={`ad-${video.id}`}
              data-short-item
              data-id={`ad:${video.id}`}
              className="h-full w-full snap-start"
            >
              <ShortsScrollAd isActive={visible && activeAdId === `ad:${video.id}`} />
            </div>,
          ];
        }
        return [player];
      })}
    </div>
  );
};

export default MovionShorts;
