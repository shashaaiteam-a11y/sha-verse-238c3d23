import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Clock, CalendarDays, CalendarRange, Trash2, UserX, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Bottom-anchored professional choice sheets for chat actions.
 * Used in place of native window.prompt / window.confirm.
 *
 * They render above the mobile footer navigation area via safe-area
 * inset padding and a small extra offset, so they never collide with
 * the bottom nav on devices.
 */

const sheetBottomClass = cn(
  'p-0 rounded-t-2xl border-t',
  // ensure it sits above mobile footer nav
  '[&]:max-h-[85vh]',
);

const safeBottomStyle: React.CSSProperties = {
  paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
};

interface PinDurationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (days: 1 | 7 | 30) => void;
}

export const PinDurationSheet = ({ open, onOpenChange, onChoose }: PinDurationSheetProps) => {
  const pick = (d: 1 | 7 | 30) => {
    onChoose(d);
    onOpenChange(false);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={sheetBottomClass}>
        <div style={safeBottomStyle}>
          <SheetHeader className="px-5 pt-5 pb-2 text-left">
            <SheetTitle className="text-base">Pin message</SheetTitle>
            <SheetDescription className="text-xs">
              Choose how long this message stays pinned.
            </SheetDescription>
          </SheetHeader>
          <div className="px-2 pb-2">
            <button
              type="button"
              onClick={() => pick(1)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent transition-colors text-left"
            >
              <Clock className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <div className="text-sm font-medium">24 hours</div>
                <div className="text-xs text-muted-foreground">Pinned for one day</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => pick(7)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent transition-colors text-left"
            >
              <CalendarDays className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <div className="text-sm font-medium">7 days</div>
                <div className="text-xs text-muted-foreground">Pinned for one week</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => pick(30)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent transition-colors text-left"
            >
              <CalendarRange className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <div className="text-sm font-medium">30 days</div>
                <div className="text-xs text-muted-foreground">Pinned for one month</div>
              </div>
            </button>
          </div>
          <div className="px-5 pt-1 pb-3">
            <Button
              variant="ghost"
              className="w-full rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

interface DeleteMessageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count?: number;
  canDeleteForEveryone: boolean;
  onChoose: (mode: 'me' | 'everyone') => void;
}

export const DeleteMessageSheet = ({
  open,
  onOpenChange,
  count = 1,
  canDeleteForEveryone,
  onChoose,
}: DeleteMessageSheetProps) => {
  const pick = (mode: 'me' | 'everyone') => {
    onChoose(mode);
    onOpenChange(false);
  };
  const label = count > 1 ? `${count} messages` : 'this message';
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={sheetBottomClass}>
        <div style={safeBottomStyle}>
          <SheetHeader className="px-5 pt-5 pb-2 text-left">
            <SheetTitle className="text-base">Delete {label}?</SheetTitle>
            <SheetDescription className="text-xs">
              This action cannot be undone.
            </SheetDescription>
          </SheetHeader>
          <div className="px-2 pb-2">
            <button
              type="button"
              onClick={() => pick('me')}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent transition-colors text-left"
            >
              <UserX className="w-5 h-5 text-foreground" />
              <div className="flex-1">
                <div className="text-sm font-medium">Delete for me</div>
                <div className="text-xs text-muted-foreground">
                  Removes only from your device
                </div>
              </div>
            </button>
            {canDeleteForEveryone && (
              <button
                type="button"
                onClick={() => pick('everyone')}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 transition-colors text-left"
              >
                <Trash2 className="w-5 h-5 text-destructive" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-destructive">
                    Delete for everyone
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Removes for all participants in this chat
                  </div>
                </div>
              </button>
            )}
          </div>
          <div className="px-5 pt-1 pb-3">
            <Button
              variant="ghost"
              className="w-full rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
