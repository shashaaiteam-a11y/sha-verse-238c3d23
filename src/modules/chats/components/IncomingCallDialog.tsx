/**
 * IncomingCallDialog — Ringing UI for the receiver. Plays a soft ring tone
 * via Web Audio (no asset needed).
 */

import { useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';

interface IncomingCallDialogProps {
  open: boolean;
  callerName: string;
  callerAvatar?: string;
  callType: 'voice' | 'video';
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallDialog = ({
  open,
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onDecline,
}: IncomingCallDialogProps) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<{ stop: () => void } | null>(null);

  // Soft beep ring tone
  useEffect(() => {
    if (!open) return;
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (!Ctx) return;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      let stopped = false;

      const playBeep = () => {
        if (stopped) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 480;
        osc.type = 'sine';
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        gain.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.7);
      };
      const interval = setInterval(playBeep, 1500);
      playBeep();

      oscRef.current = {
        stop: () => {
          stopped = true;
          clearInterval(interval);
          ctx.close().catch(() => {});
        },
      };
    } catch (e) {
      console.warn('Ringtone unavailable', e);
    }
    return () => {
      oscRef.current?.stop();
      oscRef.current = null;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onDecline(); }}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden bg-background border-border [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="p-6 flex flex-col items-center gap-5 bg-gradient-to-b from-primary/5 to-background">
          <p className="text-sm text-muted-foreground">
            Incoming {callType} call
          </p>
          <Avatar className="h-24 w-24 ring-4 ring-primary/30 animate-pulse">
            {callerAvatar && <AvatarImage src={callerAvatar} />}
            <AvatarFallback className="text-2xl bg-gradient-primary text-white">
              {callerName?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-semibold text-foreground">{callerName}</h2>
          <p className="text-xs text-muted-foreground">Tap to answer</p>

          <div className="flex items-center justify-around w-full mt-2">
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="destructive"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={onDecline}
                aria-label="Decline"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
              <span className="text-xs text-muted-foreground">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 text-white"
                onClick={onAccept}
                aria-label="Accept"
              >
                {callType === 'video' ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
              </Button>
              <span className="text-xs text-muted-foreground">Accept</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
