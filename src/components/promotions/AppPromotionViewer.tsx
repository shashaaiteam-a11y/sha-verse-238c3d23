import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, ChevronLeft, ChevronRight, ExternalLink, Pause, Play, Trash2, Loader2 } from 'lucide-react';
import {
  type AppPromotion,
  useRecordPromotionView,
  usePromotionLiveViews,
  useDeletePromotion,
  useIsAppOwner,
} from '@/hooks/useAppPromotions';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  promotions: AppPromotion[];
  startIndex?: number;
  onClose: () => void;
}

/**
 * Full-screen promotion viewer styled to match the existing Sha-Verse story viewer
 * (black backdrop, top progress bars, swipe-down-to-close, sequential auto-advance).
 *
 * Built as a thin sibling — not a fork — of FacebookStoryViewer to keep the
 * stories module fully isolated (no shape mismatch on StoryGroup or story_views).
 */
const AppPromotionViewer = ({ promotions, startIndex = 0, onClose }: Props) => {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(5000);
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = promotions[index];
  const recordView = useRecordPromotionView();
  const liveViews = usePromotionLiveViews(current?.id ?? null, current?.views_count ?? 0);
  const { data: isOwner = false } = useIsAppOwner();
  const deletePromo = useDeletePromotion();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Keep video element in sync with paused state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) v.pause();
    else v.play().catch(() => undefined);
  }, [paused, current?.id]);

  const handleDelete = async () => {
    if (!current) return;
    try {
      await deletePromo.mutateAsync(current.id);
      toast({ title: 'Promotion deleted' });
      setConfirmDelete(false);
      // If this was the last one, close; otherwise stay on same index (next slides in)
      if (promotions.length <= 1) onClose();
      else if (index >= promotions.length - 1) setIndex(Math.max(0, index - 1));
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err?.message, variant: 'destructive' });
    }
  };

  const goNext = useCallback(() => {
    if (index < promotions.length - 1) setIndex(index + 1);
    else onClose();
  }, [index, promotions.length, onClose]);

  const goPrev = useCallback(() => {
    if (index > 0) setIndex(index - 1);
  }, [index]);

  // Lock body scroll
  useEffect(() => {
    const y = window.scrollY;
    const prev = document.body.style.cssText;
    document.body.style.cssText = `position:fixed;top:-${y}px;left:0;right:0;width:100%;overflow:hidden;`;
    return () => {
      document.body.style.cssText = prev;
      window.scrollTo(0, y);
    };
  }, []);

  // Reset on slide change + record view
  useEffect(() => {
    setProgress(0);
    setLoaded(false);
    setDuration(current?.media_type === 'video' ? 15000 : 5000);
    if (current?.id) recordView.mutate(current.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Progress timer
  useEffect(() => {
    if (!loaded || paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);
      if (p >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        goNext();
      }
    }, 50);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loaded, paused, duration, goNext]);

  // Swipe down to close + long-press to pause
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    dragStart.current = { x: t.clientX, y: t.clientY };
    dragging.current = false;
    clearHold();
    holdTimer.current = setTimeout(() => setPaused(true), 200);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragStart.current) return;
    const t = e.touches[0];
    const dy = t.clientY - dragStart.current.y;
    const dx = Math.abs(t.clientX - dragStart.current.x);
    if (Math.abs(dy) > 6 || dx > 6) clearHold();
    if (!dragging.current) {
      if (dy > 10 && dy > dx) dragging.current = true;
      else return;
    }
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    clearHold();
    setPaused(false);
    if (dragY > 80) {
      setDragY(window.innerHeight);
      setTimeout(onClose, 180);
    } else {
      setDragY(0);
    }
    dragStart.current = null;
    dragging.current = false;
  };

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goPrev, goNext]);

  if (!current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center select-none"
      style={{
        transform: `translateY(${dragY}px)`,
        transition: dragging.current ? 'none' : 'transform 180ms ease-out',
        opacity: dragY > 0 ? Math.max(1 - dragY / 400, 0.3) : 1,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Top progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 p-2 flex gap-1">
        {promotions.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-[width] ease-linear"
              style={{
                width: `${i < index ? 100 : i === index ? progress : 0}%`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-3 z-30 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Promo badge */}
      <div className="absolute top-4 left-3 z-20 px-2 py-1 rounded-full bg-white/15 text-white text-[10px] font-semibold tracking-wide backdrop-blur">
        SPONSORED
      </div>

      {/* Media */}
      <div
        className="relative w-full h-full max-w-2xl max-h-screen flex items-center justify-center"
        onClick={(e) => {
          // tap left/right halves to nav
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x < rect.width / 3) goPrev();
          else if (x > (rect.width * 2) / 3) goNext();
        }}
      >
        {current.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={current.media_url}
            className="max-w-full max-h-full object-contain"
            autoPlay
            playsInline
            controls={false}
            onLoadedMetadata={() => {
              const d = videoRef.current?.duration;
              if (d && isFinite(d)) setDuration(Math.min(d * 1000, 30000));
              setLoaded(true);
            }}
            onEnded={goNext}
          />
        ) : (
          <img
            src={current.media_url}
            alt={current.caption || 'Promotion'}
            className="max-w-full max-h-full object-contain"
            onLoad={() => setLoaded(true)}
            draggable={false}
          />
        )}

        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Side nav (desktop) */}
      <button
        onClick={goPrev}
        disabled={index === 0}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 text-white items-center justify-center disabled:opacity-30"
        aria-label="Previous"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={goNext}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 text-white items-center justify-center"
        aria-label="Next"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Bottom-left realtime view count */}
      <div className="absolute bottom-4 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 text-white text-xs backdrop-blur">
        <Eye className="w-3.5 h-3.5" />
        <span className="tabular-nums font-medium">{liveViews}</span>
      </div>

      {/* Caption + link */}
      {(current.caption || current.link_url) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 max-w-[80%] flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 text-white text-sm backdrop-blur">
          {current.caption && <span className="truncate">{current.caption}</span>}
          {current.link_url && (
            <a
              href={current.link_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={cn('inline-flex items-center gap-1 text-[#7dd3fc] underline')}
            >
              Visit <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>,
    document.body
  );
};

export default AppPromotionViewer;
