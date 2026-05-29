import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useActiveAppPromotions,
  useIsAppOwner,
  type AppPromotion,
} from '@/hooks/useAppPromotions';
import AppPromotionViewer from './AppPromotionViewer';
import CreatePromotionDialog from './CreatePromotionDialog';
import PromotionDurationSheet from './PromotionDurationSheet';

interface Props {
  /** Path to the logo image (e.g. /sha-verse-logo.jpeg) */
  src: string;
  alt?: string;
  className?: string;
}

/**
 * Renders the app logo with:
 * - WhatsApp-style multicolor segmented ring when ≥1 active owner promotion exists.
 * - "+" badge ONLY for app owners (admin role) to open the promotion uploader.
 * - Click on ring opens the promotion viewer.
 *
 * Additive: this component does not modify any other UI. All ring/plus state is
 * derived purely from data; when no active promotion exists and the user is not
 * an admin, this renders an unstyled <img> visually identical to the original.
 */
const AppLogoStatusRing = ({ src, alt = 'App Logo', className }: Props) => {
  const navigate = useNavigate();
  const { data: promotions = [] } = useActiveAppPromotions();
  const { data: isOwner = false } = useIsAppOwner();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingExpiry, setPendingExpiry] = useState<{ expiresAt: string; label: string } | null>(null);

  const hasActive = promotions.length > 0;

  // Build a segmented conic gradient: WhatsApp-style multicolor split by count.
  const ringBackground = useMemo(() => {
    if (!hasActive) return undefined;
    const colors = ['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888', '#7d3cff'];
    const n = promotions.length;
    const gapDeg = n > 1 ? 4 : 0;
    const segDeg = (360 - gapDeg * n) / n;
    const stops: string[] = [];
    let cur = 0;
    for (let i = 0; i < n; i++) {
      const c = colors[i % colors.length];
      stops.push(`${c} ${cur}deg ${cur + segDeg}deg`);
      cur += segDeg;
      if (n > 1) {
        stops.push(`transparent ${cur}deg ${cur + gapDeg}deg`);
        cur += gapDeg;
      }
    }
    return `conic-gradient(${stops.join(', ')})`;
  }, [hasActive, promotions.length]);

  const handleLogoClick = () => {
    if (hasActive) setViewerOpen(true);
  };

  return (
    <>
      <div className={cn('relative inline-flex items-center justify-center', className)}>
        {/* Outer ring (only when active). Subtle rotation on a single ring; static when segmented. */}
        {hasActive && (
          <div
            className={cn(
              'absolute inset-0 rounded-full p-[3px]',
              promotions.length === 1 && 'animate-[spin_2s_linear_infinite]'
            )}
            style={{ background: ringBackground }}
            aria-hidden
          >
            <div className="w-full h-full rounded-full bg-background" />
          </div>
        )}

        <button
          type="button"
          onClick={handleLogoClick}
          className={cn(
            'relative rounded-full overflow-hidden block',
            'w-8 h-8 sm:w-9 sm:h-9',
            hasActive ? 'cursor-pointer' : 'cursor-default',
            // Inset the logo slightly when ring is showing so the ring is visible
            hasActive && 'm-[3px]'
          )}
          aria-label={hasActive ? 'View app promotions' : alt}
          tabIndex={hasActive ? 0 : -1}
        >
          <img src={src} alt={alt} className="w-full h-full object-cover" draggable={false} />
        </button>

        {/* "+" badge — visible to all logged-in users.
            Owner -> upload flow. Non-owner -> promotion info/pricing page. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isOwner) setDurationOpen(true);
            else navigate('/promote/info');
          }}
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full',
            'bg-primary text-primary-foreground border-2 border-background',
            'flex items-center justify-center shadow-sm',
            'hover:scale-110 transition-transform z-10'
          )}
          aria-label={isOwner ? 'Create app promotion' : 'Promote on Sha-Verse'}
        >
          <Plus className="w-3 h-3" strokeWidth={3} />
        </button>
      </div>

      {viewerOpen && hasActive && (
        <AppPromotionViewer
          promotions={promotions}
          startIndex={0}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {durationOpen && (
        <PromotionDurationSheet
          open={durationOpen}
          onOpenChange={setDurationOpen}
          onContinue={({ expiresAt, value, unit }) => {
            setPendingExpiry({
              expiresAt,
              label: `${value} ${unit === 'hours' ? (value === 1 ? 'hour' : 'hours') : value === 1 ? 'day' : 'days'}`,
            });
            setDurationOpen(false);
            setUploadOpen(true);
          }}
        />
      )}

      {uploadOpen && (
        <CreatePromotionDialog
          open={uploadOpen}
          onOpenChange={(v) => {
            setUploadOpen(v);
            if (!v) setPendingExpiry(null);
          }}
          expiresAt={pendingExpiry?.expiresAt}
          durationLabel={pendingExpiry?.label}
        />
      )}
    </>
  );
};

export default AppLogoStatusRing;
