/**
 * useWebRTCCall — Production-grade 1-on-1 voice/video calling hook.
 *
 * Architecture:
 *  - Signaling: Supabase Realtime broadcast channel keyed `call:<callId>`
 *    Both participants subscribe; offer/answer/ICE candidates flow over broadcast.
 *  - Call lifecycle metadata persisted in `calls` table (row-level realtime
 *    updates separately notify the receiver of incoming calls).
 *  - Media: getUserMedia (audio + optional video) via WebRTC.
 *
 * Strict isolation: lives entirely under src/modules/chats. Does NOT touch
 * any other module's code.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RTC_CONFIG } from '../lib/iceServers';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type CallType = 'voice' | 'video';
export type CallDirection = 'outgoing' | 'incoming';
export type CallPhase =
  | 'idle'
  | 'requesting-media'
  | 'ringing'      // outgoing: waiting for callee; incoming: ringing UI shown
  | 'connecting'  // SDP exchange in flight
  | 'connected'
  | 'ended'
  | 'failed';

export interface ActiveCall {
  callId: string;
  peerId: string;
  type: CallType;
  direction: CallDirection;
  /** SDP offer payload — only set for incoming calls before accept */
  pendingOffer?: RTCSessionDescriptionInit;
}

interface SignalEnvelope {
  kind: 'offer' | 'answer' | 'ice' | 'hangup' | 'cancel' | 'decline';
  payload?: any;
  from: string;
}

const channelName = (callId: string) => `call:${callId}`;

export function useWebRTCCall(currentUserId: string | undefined) {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [endReason, setEndReason] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioElRef = useRef<HTMLAudioElement | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --------- helpers ---------
  const attachStreamsToElements = useCallback(() => {
    if (localVideoElRef.current && localStreamRef.current) {
      localVideoElRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoElRef.current && remoteStreamRef.current) {
      remoteVideoElRef.current.srcObject = remoteStreamRef.current;
    }
    if (remoteAudioElRef.current && remoteStreamRef.current) {
      remoteAudioElRef.current.srcObject = remoteStreamRef.current;
    }
  }, []);

  const setRemoteVideoEl = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoElRef.current = el;
    attachStreamsToElements();
  }, [attachStreamsToElements]);

  const setLocalVideoEl = useCallback((el: HTMLVideoElement | null) => {
    localVideoElRef.current = el;
    attachStreamsToElements();
  }, [attachStreamsToElements]);

  const setRemoteAudioEl = useCallback((el: HTMLAudioElement | null) => {
    remoteAudioElRef.current = el;
    attachStreamsToElements();
  }, [attachStreamsToElements]);

  const startDurationTimer = () => {
    startedAtRef.current = Date.now();
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    durationTimerRef.current = setInterval(() => {
      if (startedAtRef.current) {
        setCallDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  const sendSignal = useCallback(async (msg: SignalEnvelope) => {
    if (!channelRef.current) return;
    await channelRef.current.send({ type: 'broadcast', event: 'signal', payload: msg });
  }, []);

  const teardown = useCallback(() => {
    stopDurationTimer();
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    pendingIceRef.current = [];
    if (remoteVideoElRef.current) remoteVideoElRef.current.srcObject = null;
    if (localVideoElRef.current) localVideoElRef.current.srcObject = null;
    if (remoteAudioElRef.current) remoteAudioElRef.current.srcObject = null;
  }, []);

  const persistEnd = useCallback(async (callId: string, reason: string, status: 'ended' | 'missed' | 'declined' | 'failed') => {
    const duration = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : 0;
    await supabase
      .from('calls')
      .update({
        status,
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
        end_reason: reason,
      })
      .eq('id', callId);
  }, []);

  // --------- core: peer connection setup ---------
  const createPeerConnection = useCallback((callId: string, peerId: string) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
      attachStreamsToElements();
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && currentUserId) {
        sendSignal({ kind: 'ice', payload: event.candidate.toJSON(), from: currentUserId });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setPhase('connected');
        startDurationTimer();
      } else if (state === 'failed') {
        setPhase('failed');
        setEndReason('connection_failed');
        persistEnd(callId, 'connection_failed', 'failed');
        teardown();
      } else if (state === 'disconnected') {
        // Allow ICE restart attempts; if it doesn't recover, oniceconnectionstatechange will handle
      }
    };

    return pc;
  }, [currentUserId, sendSignal, attachStreamsToElements, persistEnd, teardown]);

  // --------- signaling channel setup ---------
  const setupChannel = useCallback((callId: string, peerId: string, onIncomingOffer?: (offer: RTCSessionDescriptionInit) => void) => {
    const ch = supabase.channel(channelName(callId), {
      config: { broadcast: { ack: false, self: false } },
    });

    ch.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      const msg = payload as SignalEnvelope;
      if (!msg || msg.from === currentUserId) return;
      const pc = pcRef.current;

      try {
        if (msg.kind === 'offer') {
          if (onIncomingOffer) onIncomingOffer(msg.payload);
        } else if (msg.kind === 'answer' && pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
          // flush queued ICE
          for (const cand of pendingIceRef.current) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) { console.warn('ICE add failed', e); }
          }
          pendingIceRef.current = [];
          setPhase('connecting');
        } else if (msg.kind === 'ice' && pc) {
          if (pc.remoteDescription) {
            try { await pc.addIceCandidate(new RTCIceCandidate(msg.payload)); } catch (e) { console.warn('ICE add failed', e); }
          } else {
            pendingIceRef.current.push(msg.payload);
          }
        } else if (msg.kind === 'hangup' || msg.kind === 'cancel') {
          setPhase('ended');
          setEndReason(msg.kind === 'cancel' ? 'cancelled' : 'remote_hangup');
          await persistEnd(callId, msg.kind === 'cancel' ? 'cancelled_by_caller' : 'remote_hangup', 'ended');
          teardown();
        } else if (msg.kind === 'decline') {
          setPhase('ended');
          setEndReason('declined');
          await persistEnd(callId, 'declined_by_callee', 'declined');
          teardown();
        }
      } catch (err) {
        console.error('[WebRTC signal handler error]', err);
      }
    });

    ch.subscribe();
    channelRef.current = ch;
    return ch;
  }, [currentUserId, persistEnd, teardown]);

  // --------- public API: start outgoing call ---------
  const startCall = useCallback(async (peerId: string, type: CallType) => {
    if (!currentUserId) throw new Error('Not authenticated');
    if (active) throw new Error('Already in a call');

    setEndReason(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoEnabled(type === 'video');
    setPhase('requesting-media');

    try {
      // 1. Insert call row
      const { data: callRow, error: insErr } = await supabase
        .from('calls')
        .insert({
          caller_id: currentUserId,
          receiver_id: peerId,
          call_type: type,
          status: 'ringing',
        })
        .select()
        .single();
      if (insErr || !callRow) throw insErr || new Error('Failed to create call');

      const callId = callRow.id;
      setActive({ callId, peerId, type, direction: 'outgoing' });

      // 2. Get media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false,
      });
      localStreamRef.current = stream;
      attachStreamsToElements();

      // 3. Setup signaling + peer connection
      setupChannel(callId, peerId);
      const pc = createPeerConnection(callId, peerId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      // 4. Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video',
      });
      await pc.setLocalDescription(offer);

      // 5. Wait briefly for channel to subscribe before sending offer
      await new Promise(r => setTimeout(r, 300));
      await sendSignal({ kind: 'offer', payload: offer, from: currentUserId });

      setPhase('ringing');
      return callId;
    } catch (err: any) {
      console.error('[startCall failed]', err);
      setPhase('failed');
      setEndReason(err?.name === 'NotAllowedError' ? 'permission_denied' : 'media_error');
      teardown();
      setActive(null);
      throw err;
    }
  }, [currentUserId, active, attachStreamsToElements, setupChannel, createPeerConnection, sendSignal, teardown]);

  // --------- public API: handle incoming call (from realtime row insert) ---------
  const handleIncomingCall = useCallback((callId: string, callerId: string, type: CallType) => {
    if (active) return; // already on a call — auto-decline path handled by caller's timeout
    setEndReason(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoEnabled(type === 'video');
    setActive({ callId, peerId: callerId, type, direction: 'incoming' });
    setPhase('ringing');

    // Subscribe to signaling channel and capture the offer when it arrives
    setupChannel(callId, callerId, (offer) => {
      setActive(prev => prev ? { ...prev, pendingOffer: offer } : prev);
    });
  }, [active, setupChannel]);

  // --------- public API: accept incoming ---------
  const acceptCall = useCallback(async () => {
    if (!active || active.direction !== 'incoming' || !currentUserId) return;
    const { callId, peerId, type, pendingOffer } = active;
    setPhase('requesting-media');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false,
      });
      localStreamRef.current = stream;
      attachStreamsToElements();

      const pc = createPeerConnection(callId, peerId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      // If offer arrived early, set it now; else wait via channel handler
      const applyOffer = async (offer: RTCSessionDescriptionInit) => {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        for (const cand of pendingIceRef.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
        }
        pendingIceRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal({ kind: 'answer', payload: answer, from: currentUserId });
      };

      if (pendingOffer) {
        await applyOffer(pendingOffer);
      } else {
        // Replace channel handler to applyOffer when it lands
        // Re-attach listener by re-subscribing
        if (channelRef.current) {
          channelRef.current.on('broadcast', { event: 'signal' }, async ({ payload }) => {
            const msg = payload as SignalEnvelope;
            if (msg?.kind === 'offer' && msg.from !== currentUserId) {
              await applyOffer(msg.payload);
            }
          });
        }
      }

      // Mark answered in DB
      await supabase
        .from('calls')
        .update({ status: 'active', answered_at: new Date().toISOString() })
        .eq('id', callId);

      setPhase('connecting');
    } catch (err: any) {
      console.error('[acceptCall failed]', err);
      setPhase('failed');
      setEndReason(err?.name === 'NotAllowedError' ? 'permission_denied' : 'media_error');
      await persistEnd(callId, 'media_error', 'failed');
      teardown();
      setActive(null);
    }
  }, [active, currentUserId, attachStreamsToElements, createPeerConnection, sendSignal, persistEnd, teardown]);

  // --------- public API: decline incoming ---------
  const declineCall = useCallback(async () => {
    if (!active || active.direction !== 'incoming' || !currentUserId) return;
    const { callId } = active;
    await sendSignal({ kind: 'decline', from: currentUserId });
    await persistEnd(callId, 'declined_by_callee', 'declined');
    setPhase('ended');
    setEndReason('declined_local');
    teardown();
    setActive(null);
  }, [active, currentUserId, sendSignal, persistEnd, teardown]);

  // --------- public API: end ongoing/cancel outgoing ---------
  const endCall = useCallback(async () => {
    if (!active || !currentUserId) return;
    const { callId, direction } = active;
    const wasConnected = phase === 'connected' || phase === 'connecting';
    const kind: SignalEnvelope['kind'] = direction === 'outgoing' && phase === 'ringing' ? 'cancel' : 'hangup';
    await sendSignal({ kind, from: currentUserId });
    const status = wasConnected ? 'ended' : (direction === 'outgoing' ? 'missed' : 'ended');
    await persistEnd(callId, kind, status as any);
    setPhase('ended');
    setEndReason('local_hangup');
    teardown();
    setActive(null);
  }, [active, currentUserId, phase, sendSignal, persistEnd, teardown]);

  // --------- mute / video toggle ---------
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMuted;
    stream.getAudioTracks().forEach(t => (t.enabled = !next));
    setIsMuted(next);
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isVideoEnabled;
    stream.getVideoTracks().forEach(t => (t.enabled = next));
    setIsVideoEnabled(next);
  }, [isVideoEnabled]);

  const reset = useCallback(() => {
    teardown();
    setActive(null);
    setPhase('idle');
    setCallDuration(0);
    setEndReason(null);
  }, [teardown]);

  // cleanup on unmount
  useEffect(() => () => teardown(), [teardown]);

  return {
    phase,
    active,
    isMuted,
    isVideoEnabled,
    callDuration,
    endReason,
    startCall,
    handleIncomingCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    reset,
    setRemoteVideoEl,
    setLocalVideoEl,
    setRemoteAudioEl,
  };
}
