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

const MovionShorts: React.FC = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { shorts, isLoading } = useShorts();
  
  // Enable realtime updates
  useGlobalVideoRealtime();

  // Hidden videos (Not Interested)
  const { hiddenVideos, hideVideo } = useHiddenVideos();

  // Apply pulse algorithm for smart ordering (with hidden filter)
  const shortsVideos = usePrioritizedPulse(shorts, hiddenVideos);

  const [activeId, setActiveId] = useState<string>(videoId || '');
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const activeStartTimeRef = useRef<number>(Date.now());

  // Set initial active ID when shorts load
  useEffect(() => {
    if (!activeId && shortsVideos.length > 0) {
      setActiveId(videoId || shortsVideos[0]?.id || '');
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
  }, [activeIndex, shortsVideos, scrollToId]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('data-id');
          if (id && id !== activeId) setActiveId(id);
        }
      });
    }, { root: containerRef.current, threshold: 0.7 });

    const elements = containerRef.current?.querySelectorAll('[data-short-item]');
    elements?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeId]);

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
      {shortsVideos.map((video, idx) => {
        // Pre-fetch: next 3 + previous 1 for smooth swiping
        const diff = idx - activeIndex;
        const shouldLoadMedia = diff >= -1 && diff <= 3;
        
        return (
          <ShortsPlayer 
            key={video.id} 
            video={video} 
            isActive={video.id === activeId} 
            isMuted={isGlobalMuted}
            onMuteToggle={() => setIsGlobalMuted(!isGlobalMuted)}
            shouldPreload={shouldLoadMedia}
            onNotInterested={() => hideVideo(video.id)}
          />
        );
      })}
    </div>
  );
};

export default MovionShorts;
