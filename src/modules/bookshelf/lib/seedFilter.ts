/**
 * Bookshelf-only helpers to hide demo/seed books from listings.
 *
 * Seed books were inserted with a fixed placeholder `book_url` (SEED_BOOK_URL),
 * while real user-uploaded books always point to Supabase storage. These helpers
 * filter out seed rows WITHOUT touching or deleting any data. Flip
 * HIDE_SEED_BOOKS to false in constants/bookshelf.ts to reveal them again.
 *
 * Isolated to the bookshelf module — do not import from other modules.
 */
import { HIDE_SEED_BOOKS, SEED_BOOK_URL } from "@/lib/constants/bookshelf";

/**
 * Apply a server-side filter to a PostgREST query on the `books` table so seed
 * rows are excluded. NULL-safe: real books with a null book_url are kept.
 *
 * Combines safely alongside other `.or()`/filters because PostgREST AND-joins
 * separate top-level filter params.
 */
export function excludeSeedBooks<T>(query: T): T {
  if (!HIDE_SEED_BOOKS) return query;
  // Keep rows where book_url is null OR not the seed placeholder URL.
  return (query as any).or(`book_url.is.null,book_url.neq.${SEED_BOOK_URL}`) as T;
}

/**
 * Client-side fallback for nested/array results (e.g. saved books fetched via a
 * join) where a server-side `.or()` on the books table cannot be expressed.
 */
export function filterSeedBooks<T extends { book_url?: string | null }>(
  rows: T[] | null | undefined,
): T[] {
  if (!rows) return [];
  if (!HIDE_SEED_BOOKS) return rows;
  return rows.filter((b) => b?.book_url !== SEED_BOOK_URL);
}
