// Web Speech API wrapper for NovaChat voice input.
// Uses browser's built-in SpeechRecognition (Chrome / Edge / Safari).
import { useEffect, useRef, useState, useCallback } from 'react';

type SpeechRecognitionType = any;

const getRecognition = (): SpeechRecognitionType | null => {
  if (typeof window === 'undefined') return null;
  const Ctor =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
};

interface UseVoiceInputOpts {
  onTranscript: (text: string) => void;
  onError?: (msg: string) => void;
  lang?: string;
}

export const useVoiceInput = ({ onTranscript, onError, lang = 'en-US' }: UseVoiceInputOpts) => {
  const recogRef = useRef<SpeechRecognitionType | null>(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const r = getRecognition();
    setSupported(!!r);
    if (!r) return;

    r.continuous = false;
    r.interimResults = false;
    r.lang = lang;

    r.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join(' ')
        .trim();
      if (transcript) onTranscript(transcript);
    };
    r.onerror = (e: any) => {
      setListening(false);
      onError?.(e?.error || 'Voice input failed');
    };
    r.onend = () => setListening(false);

    recogRef.current = r;
    return () => {
      try { r.stop(); } catch { /* ignore */ }
    };
  }, [lang, onTranscript, onError]);

  const start = useCallback(() => {
    if (!recogRef.current || listening) return;
    try {
      recogRef.current.start();
      setListening(true);
    } catch (e: any) {
      onError?.(e?.message || 'Could not start mic');
    }
  }, [listening, onError]);

  const stop = useCallback(() => {
    if (!recogRef.current) return;
    try { recogRef.current.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  return { listening, supported, start, stop };
};

// Speak text aloud via SpeechSynthesis
export const speakText = (text: string, lang = 'en-US') => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  // Strip markdown for cleaner speech
  const clean = text
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/[#*_`>~]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, ' image ')
    .slice(0, 1000);
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = lang;
  utter.rate = 1.05;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
};

export const stopSpeaking = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};
