/**
 * Local (offline-first) highlights & notes for Reader Mode.
 */
import { useCallback, useEffect, useState } from "react";
import { loadHighlights, saveHighlights } from "@/lib/reader/cache";
import type { Highlight } from "@/lib/reader/types";

export const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "rgba(255, 224, 102, 0.55)" },
  { name: "Green", value: "rgba(134, 239, 172, 0.55)" },
  { name: "Blue", value: "rgba(147, 197, 253, 0.55)" },
  { name: "Pink", value: "rgba(249, 168, 212, 0.55)" },
];

export function useReaderHighlights(bookId?: string) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    let active = true;
    if (!bookId) {
      setHighlights([]);
      return;
    }
    void loadHighlights(bookId).then((stored) => {
      if (active) setHighlights(stored);
    });
    return () => {
      active = false;
    };
  }, [bookId]);

  const persist = useCallback(
    (next: Highlight[]) => {
      setHighlights(next);
      if (bookId) void saveHighlights(bookId, next);
    },
    [bookId]
  );

  const addHighlight = useCallback(
    (payload: Omit<Highlight, "id" | "bookId" | "createdAt"> & { color?: string }) => {
      if (!bookId) return null;
      const highlight: Highlight = {
        id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        bookId,
        createdAt: Date.now(),
        color: payload.color ?? HIGHLIGHT_COLORS[0].value,
        ...payload,
      };
      persist([...highlights, highlight]);
      return highlight;
    },
    [bookId, highlights, persist]
  );

  const updateHighlight = useCallback(
    (id: string, patch: Partial<Highlight>) => {
      persist(highlights.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    },
    [highlights, persist]
  );

  const removeHighlight = useCallback(
    (id: string) => persist(highlights.filter((h) => h.id !== id)),
    [highlights, persist]
  );

  return { highlights, addHighlight, updateHighlight, removeHighlight };
}
