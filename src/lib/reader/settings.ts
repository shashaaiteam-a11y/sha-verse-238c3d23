/**
 * Reader typography + theme settings (Reader Mode only).
 * Persisted locally so the reading experience is identical across sessions.
 */
import { useCallback, useEffect, useState } from "react";

export type ReaderTheme = "light" | "sepia" | "dark" | "black";
export type ReaderFont = "serif" | "sans" | "dyslexic";
/** "paged" = horizontal, one screen per page. "scroll" = continuous vertical. */
export type ReadingMode = "paged" | "scroll";

export interface ReaderSettings {
  theme: ReaderTheme;
  font: ReaderFont;
  fontSize: number;
  lineHeight: number;
  /** 0 = narrow, 3 = wide side margins. */
  margin: number;
  paragraphSpacing: number;
  justify: boolean;
  /** Extra letter/word spacing for accessibility. */
  looseSpacing: boolean;
  /** Horizontal paged reading vs continuous scrolling. */
  readingMode: ReadingMode;
  /** Animate the horizontal page turn (paged mode only). */
  pageAnimation: boolean;
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  theme: "light",
  font: "serif",
  fontSize: 19,
  lineHeight: 1.65,
  margin: 1,
  paragraphSpacing: 0.9,
  justify: false,
  looseSpacing: false,
  readingMode: "paged",
  pageAnimation: true,
};


const STORAGE_KEY = "shaverse:reader-settings:v1";

export const READER_THEMES: Record<
  ReaderTheme,
  { bg: string; text: string; muted: string; accent: string; label: string }
> = {
  light: { bg: "#ffffff", text: "#16181d", muted: "#6b7280", accent: "#1d4ed8", label: "Light" },
  sepia: { bg: "#f4ecd8", text: "#3b2f1e", muted: "#7a6a51", accent: "#8a5a2b", label: "Sepia" },
  dark: { bg: "#1c1f24", text: "#e6e6e6", muted: "#9aa0a6", accent: "#8ab4f8", label: "Dark" },
  black: { bg: "#000000", text: "#d8d8d8", muted: "#8a8a8a", accent: "#7cc0ff", label: "Black" },
};

export const READER_FONT_STACKS: Record<ReaderFont, string> = {
  serif:
    'Georgia, "Iowan Old Style", "Times New Roman", "Noto Serif", "Noto Serif Devanagari", "Noto Naskh Arabic", "Noto Nastaliq Urdu", "Noto Sans CJK SC", serif',
  sans:
    '"Helvetica Neue", Helvetica, Arial, "Noto Sans", "Noto Sans Devanagari", "Noto Sans Arabic", "Noto Nastaliq Urdu", "Noto Sans CJK SC", system-ui, sans-serif',
  dyslexic:
    '"Comic Sans MS", "Trebuchet MS", Verdana, "Noto Sans Devanagari", "Noto Sans Arabic", sans-serif',
};

function readStored(): ReaderSettings {
  if (typeof window === "undefined") return DEFAULT_READER_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_READER_SETTINGS;
    return { ...DEFAULT_READER_SETTINGS, ...(JSON.parse(raw) as Partial<ReaderSettings>) };
  } catch {
    return DEFAULT_READER_SETTINGS;
  }
}

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(readStored);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const update = useCallback(<K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_READER_SETTINGS), []);

  return { settings, update, reset, setSettings };
}
