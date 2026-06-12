/**
 * CallDialog — In-call UI for both outgoing (ringing) and active calls.
 * Pure presentation; talks to a useWebRTCCall instance via props.
 */

import { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import type { CallPhase, CallType } from '../hooks/useWebRTCCall';

interface PeerProfile {
  id: string;
  display_name: string;
  avatar_url?: string;
}

interface CallDialogProps {
  open: boolean;
  peer: PeerProfile | null;
  callType: CallType;
  phase: CallPhase;
  callDuration: number;
  isMuted: boolean;
  isVideoEnabled: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  setRemoteVideoEl: (el: HTMLVideoElement | null) => void;
  setLocalVideoEl: (el: HTMLVideoElement | null) => void;
  setRemoteAudioEl: (el: HTMLAudioElement | null) => void;
}

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

const phaseLabel = (phase: CallPhase, direction: 'outgoing'): string => {
  if (phase === 'requesting-media') return 'Preparing…';
  if (phase === 'ringing') return 'Ringing…';
  if (phase === 'connecting') return 'Connecting…';
  if (phase === 'connected') return 'Connected';
  if (phase === 'ended') return 'Call ended';
  if (phase === 'failed') return 'Call failed';
  return '';
};

export const CallDialog = ({
  open,
  peer,
  callType,
  phase,
  callDuration,
  isMuted,
  isVideoEnabled,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  setRemoteVideoEl,
  setLocalVideoEl,
  setRemoteAudioEl,
}: CallDialogProps) => {
  // Auto-close shortly after end
  useEffect(() => {
    if (phase === 'ended' || phase === 'failed') {
      const t = setTimeout(() => onEndCall(), 1500);
      return () => clearTimeout(t);
    }
  }, [phase, onEndCall]);

  if (!peer) return null;
  const isVideo = callType === 'video';
  const showVideoArea = isVideo && isVideoEnabled;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onEndCall(); }}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden bg-background border-border [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="relative flex flex-col h-[600px]">
          {/* Remote video / avatar background */}
          <div className="relative flex-1 bg-gradient-to-b from-muted to-background flex items-center justify-center overflow-hidden">
            {showVideoArea ? (
              <video
                ref={setRemoteVideoEl}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-center px-6">
                <Avatar className="h-32 w-32 ring-4 ring-primary/30">
                  {peer.avatar_url && <AvatarImage src={peer.avatar_url} />}
                  <AvatarFallback className="text-3xl bg-gradient-primary text-white">
                    {peer.display_name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">{peer.display_name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {phase === 'connected' ? formatDuration(callDuration) : phaseLabel(phase, 'outgoing')}
                  </p>
                </div>
              </div>
            )}

            {/* Always-mounted remote audio sink (hidden) */}
            <audio ref={setRemoteAudioEl} autoPlay />

            {/* Local PiP */}
            {isVideo && (
              <div className="absolute top-4 right-4 w-24 h-32 rounded-lg overflow-hidden border-2 border-background shadow-lg bg-muted">
                {isVideoEnabled ? (
                  <video
                    ref={setLocalVideoEl}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <VideoOff className="h-6 w-6" />
                  </div>
                )}
              </div>
            )}

            {/* Top bar with name + duration when video active */}
            {showVideoArea && (
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
                <h3 className="text-white font-semibold">{peer.display_name}</h3>
                <p className="text-white/80 text-xs">
                  {phase === 'connected' ? formatDuration(callDuration) : phaseLabel(phase, 'outgoing')}
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-card border-t border-border p-4 flex items-center justify-center gap-4">
            <Button
              variant={isMuted ? 'default' : 'secondary'}
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            {isVideo && (
              <Button
                variant={!isVideoEnabled ? 'default' : 'secondary'}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={onToggleVideo}
                aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
            )}

            <Button
              variant="destructive"
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={onEndCall}
              aria-label="End call"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
