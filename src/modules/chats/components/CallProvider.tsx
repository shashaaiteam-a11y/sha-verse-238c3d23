/**
 * CallProvider — Single global host for the active call session.
 *
 * Responsibilities:
 *  1. Subscribe to the `calls` postgres_changes stream filtered to
 *     receiver_id = currentUserId. When a new ringing row appears, show
 *     the IncomingCallDialog.
 *  2. Expose `startCall(peer, type)` via context for the chat header / friends
 *     list to trigger an outgoing call.
 *  3. Render the in-call CallDialog once a call is active.
 *
 * Mounted inside the Messages page (chats module) so it has zero impact on
 * routes that never load chat code.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useWebRTCCall, type CallType } from '../hooks/useWebRTCCall';
import { CallDialog } from './CallDialog';
import { IncomingCallDialog } from './IncomingCallDialog';

interface CallPeer {
  id: string;
  display_name: string;
  avatar_url?: string;
}

interface CallContextValue {
  startCall: (peer: CallPeer, type: CallType) => Promise<void>;
  isInCall: boolean;
}

const CallContext = createContext<CallContextValue | null>(null);

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) {
    // Safe no-op fallback so non-chat routes that import a button don't crash
    return {
      startCall: async () => { toast.error('Calling unavailable on this page'); },
      isInCall: false,
    } as CallContextValue;
  }
  return ctx;
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const call = useWebRTCCall(userId);
  const [outgoingPeer, setOutgoingPeer] = useState<CallPeer | null>(null);
  const [incomingPeer, setIncomingPeer] = useState<CallPeer | null>(null);
  const handledCallIdsRef = useRef<Set<string>>(new Set());

  // Listen for incoming calls (rows where receiver = me, status = ringing)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`incoming-calls:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as any;
          if (!row || row.status !== 'ringing') return;
          if (handledCallIdsRef.current.has(row.id)) return;
          handledCallIdsRef.current.add(row.id);

          // Don't accept a second call while one is active
          if (call.active) {
            // auto-decline by updating row status
            await supabase
              .from('calls')
              .update({ status: 'declined', ended_at: new Date().toISOString(), end_reason: 'busy' })
              .eq('id', row.id);
            return;
          }

          // Fetch caller profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', row.caller_id)
            .single();

          const peer: CallPeer = {
            id: row.caller_id,
            display_name: profile?.display_name || 'Unknown',
            avatar_url: profile?.avatar_url || undefined,
          };
          setIncomingPeer(peer);
          call.handleIncomingCall(row.id, row.caller_id, row.call_type as CallType);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Auto-clear local UI when call ends
  useEffect(() => {
    if (call.phase === 'ended' || call.phase === 'failed' || call.phase === 'idle') {
      const t = setTimeout(() => {
        setOutgoingPeer(null);
        setIncomingPeer(null);
        if (call.phase !== 'idle') call.reset();
      }, call.phase === 'idle' ? 0 : 1500);
      return () => clearTimeout(t);
    }
  }, [call.phase, call]);

  const startCall = useCallback(async (peer: CallPeer, type: CallType) => {
    if (!userId) {
      toast.error('Please sign in to make calls');
      return;
    }
    if (call.active) {
      toast.error('You are already on a call');
      return;
    }
    setOutgoingPeer(peer);
    try {
      await call.startCall(peer.id, type);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        toast.error('Microphone/Camera permission denied');
      } else {
        toast.error('Failed to start call');
      }
      setOutgoingPeer(null);
    }
  }, [userId, call]);

  const value = useMemo<CallContextValue>(
    () => ({ startCall, isInCall: !!call.active }),
    [startCall, call.active]
  );

  // Determine which peer to show in the active call dialog
  const activePeer =
    call.active?.direction === 'incoming' ? incomingPeer : outgoingPeer;
  const showCallDialog =
    !!call.active &&
    (call.phase === 'requesting-media' ||
      call.phase === 'ringing' ||
      call.phase === 'connecting' ||
      call.phase === 'connected' ||
      call.phase === 'ended' ||
      call.phase === 'failed') &&
    // For incoming, only show in-call dialog AFTER user accepts (phase moves past ringing-incoming)
    !(call.active.direction === 'incoming' && call.phase === 'ringing');

  const showIncomingDialog =
    !!call.active && call.active.direction === 'incoming' && call.phase === 'ringing' && !!incomingPeer;

  return (
    <CallContext.Provider value={value}>
      {children}
      {showIncomingDialog && incomingPeer && call.active && (
        <IncomingCallDialog
          open={true}
          callerName={incomingPeer.display_name}
          callerAvatar={incomingPeer.avatar_url}
          callType={call.active.type}
          onAccept={() => call.acceptCall()}
          onDecline={() => call.declineCall()}
        />
      )}
      {showCallDialog && activePeer && call.active && (
        <CallDialog
          open={true}
          peer={activePeer}
          callType={call.active.type}
          phase={call.phase}
          callDuration={call.callDuration}
          isMuted={call.isMuted}
          isVideoEnabled={call.isVideoEnabled}
          onToggleMute={call.toggleMute}
          onToggleVideo={call.toggleVideo}
          onEndCall={() => call.endCall()}
          setRemoteVideoEl={call.setRemoteVideoEl}
          setLocalVideoEl={call.setLocalVideoEl}
          setRemoteAudioEl={call.setRemoteAudioEl}
        />
      )}
    </CallContext.Provider>
  );
};
