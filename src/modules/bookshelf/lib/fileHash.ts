/**
 * Bookshelf-only utilities for file fingerprinting and duplicate detection.
 * Isolated to the bookshelf module — do not import from other modules.
 */
import { supabase } from "@/integrations/supabase/client";

/**
 * Generate SHA-256 hex digest of a File using Web Crypto API.
 * Streaming-friendly: reads as ArrayBuffer (acceptable for <=200MB book files).
 */
export async function generateFileHash(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType?: "file" | "metadata";
  existingBook?: {
    id: string;
    title: string;
    author: string;
  };
}

/**
 * Pre-flight duplicate check. Runs against books table BEFORE upload.
 * Checks both file_hash (exact file match) and (title, author) case-insensitive.
 */
export async function checkBookDuplicate(params: {
  fileHash?: string;
  title?: string;
  author?: string;
}): Promise<DuplicateCheckResult> {
  const { fileHash, title, author } = params;

  // Duplicate detection runs through a SECURITY DEFINER function so the
  // private `file_hash` column never has to be exposed to the client API.
  // It returns the strongest match (exact file first, then title+author).
  const { data, error } = await (supabase as any).rpc("check_book_duplicate", {
    _file_hash: fileHash ?? null,
    _title: title?.trim() ?? null,
    _author: author?.trim() ?? null,
  });

  if (!error && Array.isArray(data) && data.length > 0) {
    const match = data[0];
    return {
      isDuplicate: true,
      matchType: match.match_type === "file" ? "file" : "metadata",
      existingBook: {
        id: match.id,
        title: match.title,
        author: match.author,
      },
    };
  }

  return { isDuplicate: false };
}
