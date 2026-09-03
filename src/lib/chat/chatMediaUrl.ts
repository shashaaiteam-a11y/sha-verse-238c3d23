/**
 * Chat media URLs.
 *
 * The `chat-media` bucket is PRIVATE (RLS-gated to conversation participants),
 * so the public URL stored on old/new messages returns
 * `{"statusCode":"404","error":"Bucket not found"}` when opened directly.
 *
 * This helper converts such a stored URL into a short-lived signed URL that
 * actually resolves for the authenticated participant.
 */

import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'chat-media';
const TTL_SECONDS = 60 * 60; // 1 hour

const cache = new Map<string, { url: string; expiresAt: number }>();

/** Extracts the object path inside `chat-media` from a stored URL, if any. */
export function extractChatMediaPath(url: string): string | null {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const raw = url.slice(idx + marker.length).split('?')[0];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Returns a usable URL for a chat attachment.
 * Non chat-media URLs (external links, blobs) are returned unchanged.
 */
export async function getChatMediaUrl(url: string): Promise<string> {
  const path = extractChatMediaPath(url);
  if (!path) return url;

  const cached = cache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error('Failed to sign chat media URL:', error?.message);
    return url;
  }

  cache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + (TTL_SECONDS - 60) * 1000,
  });
  return data.signedUrl;
}
