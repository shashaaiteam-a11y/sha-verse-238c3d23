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

  // 1. File-hash match (strongest signal)
  if (fileHash) {
    const { data, error } = await (supabase as any)
      .from("books")
      .select("id, title, author")
      .eq("file_hash", fileHash)
      .maybeSingle();
    if (!error && data) {
      return {
        isDuplicate: true,
        matchType: "file",
        existingBook: data,
      };
    }
  }

  // 2. Metadata match (title + author, case-insensitive)
  if (title && author) {
    const { data, error } = await supabase
      .from("books")
      .select("id, title, author")
      .ilike("title", title.trim())
      .ilike("author", author.trim())
      .maybeSingle();
    if (!error && data) {
      return {
        isDuplicate: true,
        matchType: "metadata",
        existingBook: data as any,
      };
    }
  }

  return { isDuplicate: false };
}
