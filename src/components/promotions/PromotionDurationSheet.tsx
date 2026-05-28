import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the computed expiry ISO string + chosen value/unit when user confirms. */
  onContinue: (info: { expiresAt: string; value: number; unit: 'hours' | 'days' }) => void;
}

const HOURS = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24];
const DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

/**
 * WhatsApp-style story duration selector. Opens as a bottom sheet ABOVE the footer
 * (sheet itself sits above footer because it's a fixed overlay with high z-index;
 * we leave room with bottom padding so it never overlaps the footer nav).
 *
 * Pure UI: emits the chosen expires_at + duration; parent triggers existing upload flow.
 */
const PromotionDurationSheet = ({ open, onOpenChange, onContinue }: Props) => {
  const [unit, setUnit] = useState<'hours' | 'days'>('hours');
  const [value, setValue] = useState<number>(24);

  const handleContinue = () => {
    const ms = unit === 'hours' ? value * 3600_000 : value * 86_400_000;
    const expiresAt = new Date(Date.now() + ms).toISOString();
    onContinue({ expiresAt, value, unit });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl p-0 max-h-[55vh] pb-[calc(env(safe-area-inset-bottom)+72px)]"
      >
        <SheetHeader className="px-4 pt-4 pb-2 text-left">
          <SheetTitle className="text-base">Story Kitni Der Tak Chalegi?</SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <div className="px-4 flex gap-2 mb-3">
          {(['hours', 'days'] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => {
                setUnit(u);
                setValue(u === 'hours' ? 24 : 1);
              }}
              className={cn(
                'flex-1 py-2 text-sm rounded-lg font-medium transition-colors',
                unit === u
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {u === 'hours' ? 'Hours' : 'Days'}
            </button>
          ))}
        </div>

        {/* Chip grid */}
        <div className="px-4 overflow-y-auto max-h-[24vh]">
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 pb-2">
            {(unit === 'hours' ? HOURS : DAYS).map((n) => {
              const selected = value === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setValue(n)}
                  className={cn(
                    'h-10 rounded-lg text-sm font-medium border transition-all',
                    selected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 flex gap-2 border-t bg-background">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleContinue}>
            Continue · {value} {unit === 'hours' ? 'h' : 'd'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PromotionDurationSheet;
