import { supabase } from '@/integrations/supabase/client';
import { ENABLE_SERVER_COMPRESSION } from '@/lib/media/config';

/**
 * Fire-and-forget request for server-side WebP variants of an uploaded image.
 *
 * Design rules (do not change without care):
 *  - GATED: only runs when ENABLE_SERVER_COMPRESSION is true. It is OFF by
 *    default because uploads are already compressed client-side, and these
 *    variants ADD extra files (more storage). Flip the flag in
 *    `@/lib/media/config` to instantly re-enable across the whole app.
 *  - NON-BLOCKING: never awaited by callers, runs in the background.
 *  - SILENT: never throws, never shows UI, never affects the upload result.
 *  - SAFE: the original uploaded file is always left untouched; the
 *    `compress-image` edge function only writes extra `_thumb/_medium/_compressed`
 *    WebP variants and silently fails on any error.
 *
 * Usage (immediately AFTER a successful storage.upload):
 *   triggerImageCompression('post-images', uploadedPath);
 */
export function triggerImageCompression(bucket: string, path: string): void {
  if (!ENABLE_SERVER_COMPRESSION) return;
  if (!bucket || !path) return;
  try {
    void supabase.functions
      .invoke('compress-image', { body: { bucket, path } })
      .catch(() => {
        /* silent fail — compression is best-effort only */
      });
  } catch {
    /* never let compression wiring affect the upload flow */
  }
}

