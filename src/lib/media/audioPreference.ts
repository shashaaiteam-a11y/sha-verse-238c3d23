// Global "sound-on" preference for inline feed videos.
// Facebook/Instagram-style: default muted until the user unmutes once,
// then every future video plays with sound. Persists across app restarts.

const STORAGE_KEY = "sha_video_sound_on";

type Listener = (soundOn: boolean) => void;

const listeners = new Set<Listener>();

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

let currentPref = readStored();

export function getAudioPreference(): boolean {
  return currentPref;
}

export function setAudioPreference(soundOn: boolean): void {
  currentPref = soundOn;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, soundOn ? "1" : "0");
    }
  } catch {
    /* noop */
  }
  listeners.forEach((l) => {
    try { l(soundOn); } catch { /* noop */ }
  });
}

export function subscribeAudioPreference(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Fade a video's volume from `from` to `to` over `duration` ms.
 * Uses rAF; auto-cancels the previous fade attached to the same element.
 */
const fadeTokens = new WeakMap<HTMLVideoElement, number>();

export function fadeVolume(
  video: HTMLVideoElement,
  from: number,
  to: number,
  duration = 250,
  onDone?: () => void
): void {
  try {
    video.volume = Math.max(0, Math.min(1, from));
  } catch { /* noop */ }
  const prev = fadeTokens.get(video);
  if (prev) cancelAnimationFrame(prev);
  const start = performance.now();
  const delta = to - from;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    try {
      video.volume = Math.max(0, Math.min(1, from + delta * t));
    } catch { /* noop */ }
    if (t < 1) {
      fadeTokens.set(video, requestAnimationFrame(step));
    } else {
      fadeTokens.delete(video);
      onDone?.();
    }
  };
  fadeTokens.set(video, requestAnimationFrame(step));
}
