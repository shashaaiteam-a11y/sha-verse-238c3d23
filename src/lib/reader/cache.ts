/**
 * Offline cache for the extracted reflowable model + reader annotations.
 * Uses IndexedDB (structured clone) so image Blobs survive without base64.
 */
import { get, set, del, keys } from "idb-keyval";
import type { Highlight, ReadingAnchor, ReflowBook } from "./types";
import { REFLOW_MODEL_VERSION } from "./types";

const BOOK_PREFIX = "shaverse:reflow:";
const ANCHOR_PREFIX = "shaverse:reflow-anchor:";
const HIGHLIGHT_PREFIX = "shaverse:reflow-highlights:";
const MAX_CACHED_BOOKS = 8;

const bookKey = (bookId: string) => `${BOOK_PREFIX}${REFLOW_MODEL_VERSION}:${bookId}`;

interface CachedEntry {
  book: ReflowBook;
  savedAt: number;
}

export async function loadCachedBook(bookId: string): Promise<ReflowBook | null> {
  try {
    const entry = await get<CachedEntry>(bookKey(bookId));
    if (!entry?.book || entry.book.version !== REFLOW_MODEL_VERSION) return null;
    return entry.book;
  } catch {
    return null;
  }
}

export async function saveCachedBook(book: ReflowBook): Promise<void> {
  try {
    await set(bookKey(book.bookId), { book, savedAt: Date.now() } satisfies CachedEntry);
    await trimCache();
  } catch {
    /* storage full / private mode — cache is a nice-to-have */
  }
}

export async function clearCachedBook(bookId: string): Promise<void> {
  try {
    await del(bookKey(bookId));
  } catch {
    /* ignore */
  }
}

async function trimCache() {
  try {
    const allKeys = (await keys()) as string[];
    const bookKeys = allKeys.filter((k) => typeof k === "string" && k.startsWith(BOOK_PREFIX));
    if (bookKeys.length <= MAX_CACHED_BOOKS) return;

    const entries = await Promise.all(
      bookKeys.map(async (k) => ({ key: k, savedAt: (await get<CachedEntry>(k))?.savedAt ?? 0 }))
    );
    entries
      .sort((a, b) => a.savedAt - b.savedAt)
      .slice(0, entries.length - MAX_CACHED_BOOKS)
      .forEach((entry) => void del(entry.key));
  } catch {
    /* ignore */
  }
}

/* ---------------------------------- position --------------------------------- */

export async function loadAnchor(bookId: string): Promise<ReadingAnchor | null> {
  try {
    return (await get<ReadingAnchor>(`${ANCHOR_PREFIX}${bookId}`)) ?? null;
  } catch {
    return null;
  }
}

export async function saveAnchor(bookId: string, anchor: ReadingAnchor): Promise<void> {
  try {
    await set(`${ANCHOR_PREFIX}${bookId}`, anchor);
  } catch {
    /* ignore */
  }
}

/* --------------------------------- highlights -------------------------------- */

export async function loadHighlights(bookId: string): Promise<Highlight[]> {
  try {
    return (await get<Highlight[]>(`${HIGHLIGHT_PREFIX}${bookId}`)) ?? [];
  } catch {
    return [];
  }
}

export async function saveHighlights(bookId: string, highlights: Highlight[]): Promise<void> {
  try {
    await set(`${HIGHLIGHT_PREFIX}${bookId}`, highlights);
  } catch {
    /* ignore */
  }
}
