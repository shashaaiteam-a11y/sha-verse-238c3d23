/**
 * Drives PDF → reflow extraction with an offline-first cache and progressive
 * (page-by-page) delivery so the reader can be used while parsing continues.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { extractReflowBook } from "@/lib/reader/extract";
import { clearCachedBook, loadCachedBook, saveCachedBook } from "@/lib/reader/cache";
import type { ReflowBook } from "@/lib/reader/types";

interface Options {
  bookId?: string;
  url?: string;
  title?: string;
  author?: string;
  enabled: boolean;
  ocr?: boolean;
  ocrLanguage?: string;
}

interface State {
  book: ReflowBook | null;
  status: "idle" | "cached" | "extracting" | "ready" | "error";
  progress: number;
  pagesDone: number;
  totalPages: number;
  error: string | null;
  fromCache: boolean;
}

const INITIAL: State = {
  book: null,
  status: "idle",
  progress: 0,
  pagesDone: 0,
  totalPages: 0,
  error: null,
  fromCache: false,
};

export function useReflowBook({ bookId, url, title, author, enabled, ocr, ocrLanguage }: Options) {
  const [state, setState] = useState<State>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  const run = useCallback(
    async (force: boolean) => {
      if (!enabled || !bookId || !url) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const runId = ++runIdRef.current;

      setState({ ...INITIAL, status: "extracting" });

      if (force) await clearCachedBook(bookId);
      else {
        const cached = await loadCachedBook(bookId);
        if (cached && runId === runIdRef.current) {
          setState({
            book: cached,
            status: "ready",
            progress: 100,
            pagesDone: cached.meta.totalPages,
            totalPages: cached.meta.totalPages,
            error: null,
            fromCache: true,
          });
          return;
        }
      }

      try {
        let lastPaint = 0;
        for await (const step of extractReflowBook(url, {
          bookId,
          title,
          author,
          ocr,
          ocrLanguage,
          signal: controller.signal,
        })) {
          if (controller.signal.aborted || runId !== runIdRef.current) return;

          const now = performance.now();
          const shouldPaint = step.done || step.page <= 3 || now - lastPaint > 180;
          if (!shouldPaint) continue;
          lastPaint = now;

          setState({
            // Shallow clone so React re-renders while blocks keep growing.
            book: { ...step.book, blocks: step.book.blocks.slice() },
            status: step.done ? "ready" : "extracting",
            progress: Math.round((step.page / Math.max(step.totalPages, 1)) * 100),
            pagesDone: step.page,
            totalPages: step.totalPages,
            error: null,
            fromCache: false,
          });

          if (step.done) void saveCachedBook(step.book);
        }
      } catch (err) {
        if (controller.signal.aborted || runId !== runIdRef.current) return;
        console.error("[ReflowReader] extraction failed:", err);
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "We couldn't prepare this book for Reader Mode.",
        }));
      }
    },
    [bookId, url, title, author, enabled, ocr, ocrLanguage]
  );

  useEffect(() => {
    void run(false);
    return () => abortRef.current?.abort();
  }, [run]);

  const reprocess = useCallback(() => void run(true), [run]);

  return { ...state, reprocess };
}
