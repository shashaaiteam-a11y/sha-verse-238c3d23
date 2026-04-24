import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, Crown } from 'lucide-react';

interface LimitReachedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  used: number;
  limit: number;
  onUpgrade: () => void;
}

const getResetCountdown = (): string => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0); // next UTC midnight
  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const LimitReachedModal = ({ open, onOpenChange, used, limit, onUpgrade }: LimitReachedModalProps) => {
  const [countdown, setCountdown] = useState(getResetCountdown());

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setCountdown(getResetCountdown()), 60_000);
    return () => clearInterval(interval);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary-foreground" />
          </div>
          <DialogTitle className="text-xl sm:text-2xl text-center">
            Daily limit reached
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Aapne aaj ki <span className="font-semibold text-foreground">{used} / {limit}</span> free messages use kar li hain.
            Pro plan se unlimited chat ka maza lijiye.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-center justify-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Resets in</span>
          <span className="font-semibold text-foreground tabular-nums">{countdown}</span>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <Button
            onClick={() => {
              onOpenChange(false);
              onUpgrade();
            }}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 gap-2"
          >
            <Crown className="w-4 h-4" />
            Upgrade to Pro
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LimitReachedModal;
