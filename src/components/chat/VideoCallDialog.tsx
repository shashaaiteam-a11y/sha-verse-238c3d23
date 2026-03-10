import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Mic, MicOff, Video, VideoOff, Phone, PhoneOff,
  RotateCcw, Volume2, VolumeX, Maximize, Minimize
} from 'lucide-react';
import { toast } from 'sonner';

interface VideoCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  otherUser: {
    id: string;
    display_name: string;
    avatar_url?: string;
  } | null;
  isVideoCall: boolean;
}

export const VideoCallDialog = ({ isOpen, onClose, otherUser, isVideoCall }: VideoCallDialogProps) => {
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideoCall);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isOpen && callStatus === 'calling') {
      // Simulate call connection after 3 seconds (in real app, use WebRTC)
      const timer = setTimeout(() => {
        setCallStatus('connected');
        toast.success('Call connected');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, callStatus]);

  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  useEffect(() => {
    if (isOpen && isVideoEnabled) {
      // Get local video stream
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error('Error accessing camera:', err);
          toast.error('Could not access camera/microphone');
        });
    }

    return () => {
      // Cleanup video streams
      if (localVideoRef.current?.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, isVideoEnabled]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Cleanup video streams
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    setTimeout(() => {
      onClose();
      setCallStatus('calling');
      setCallDuration(0);
    }, 1000);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.info(isMuted ? 'Unmuted' : 'Muted');
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    toast.info(isSpeakerOn ? 'Speaker off' : 'Speaker on');
  };

  if (!otherUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 border-0">
        <div className="relative h-[500px] flex flex-col">
          {/* Video Area */}
          {isVideoCall && isVideoEnabled ? (
            <div className="relative flex-1 bg-black">
              {/* Remote Video (Full Screen) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Local Video (Small Overlay) */}
              <div className="absolute top-4 right-4 w-24 h-32 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : (
            /* Audio Call UI */
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="relative">
                <Avatar className="h-32 w-32 ring-4 ring-white/20">
                  {otherUser.avatar_url && <AvatarImage src={otherUser.avatar_url} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-4xl text-white">
                    {otherUser.display_name[0]}
                  </AvatarFallback>
                </Avatar>
                {callStatus === 'calling' && (
                  <div className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
                )}
              </div>
              
              <h3 className="text-white text-xl font-semibold mt-6">
                {otherUser.display_name}
              </h3>
              
              <p className="text-white/70 mt-2">
                {callStatus === 'calling' && 'Calling...'}
                {callStatus === 'connected' && formatDuration(callDuration)}
                {callStatus === 'ended' && 'Call ended'}
              </p>
            </div>
          )}

          {/* Call Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-4">
              {/* Speaker Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full h-12 w-12 ${isSpeakerOn ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'}`}
                onClick={toggleSpeaker}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>

              {/* Video Toggle (only for video calls) */}
              {isVideoCall && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-full h-12 w-12 ${isVideoEnabled ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'}`}
                  onClick={toggleVideo}
                >
                  {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>
              )}

              {/* Mute Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full h-12 w-12 ${!isMuted ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'}`}
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              {/* End Call */}
              <Button
                size="icon"
                className="rounded-full h-14 w-14 bg-red-500 hover:bg-red-600 text-white"
                onClick={handleEndCall}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
