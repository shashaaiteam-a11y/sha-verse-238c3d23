/**
 * Deep-link helper — single source of truth for entity URLs.
 *
 * Use this from ShareDialog, copy-link buttons, push notifications, etc.
 * Every link generated here is guaranteed to resolve to a real route in App.tsx.
 */

export type ShareEntityType =
  | 'post'
  | 'group_post'
  | 'video'
  | 'book'
  | 'profile'
  | 'channel'
  | 'group'
  | 'page';

/**
 * Returns the in-app path (no origin) for a given entity.
 * Always starts with `/`.
 */
export const getEntityPath = (type: ShareEntityType, id: string): string => {
  switch (type) {
    case 'video':
      return `/video/${id}`;
    case 'book':
      return `/bookshelf/book/${id}`;
    case 'group_post':
      return `/group-post/${id}`;
    case 'profile':
      return `/profile/${id}`;
    case 'channel':
      return `/channel/${id}`;
    case 'group':
      return `/groups/${id}`;
    case 'page':
      return `/pages/${id}`;
    case 'post':
    default:
      return `/post/${id}`;
  }
};

/**
 * Returns a fully-qualified absolute URL (including origin) for sharing externally.
 */
export const getEntityUrl = (type: ShareEntityType, id: string): string => {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  return `${origin}${getEntityPath(type, id)}`;
};

/**
 * Reusable share helper. Tries the Native Web Share API first
 * (mobile + supported browsers), falls back to clipboard copy.
 *
 * Returns:
 *   - 'shared'  → native share sheet completed
 *   - 'copied'  → copied to clipboard fallback
 *   - 'failed'  → user dismissed / nothing happened
 */
export const handleShare = async (
  type: ShareEntityType,
  id: string,
  title?: string,
  text?: string
): Promise<'shared' | 'copied' | 'failed'> => {
  const url = getEntityUrl(type, id);
  const shareTitle = title || 'SHA-VERSE';
  const shareText = text || 'Check this out on SHA-VERSE';

  // Native Web Share API
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: shareTitle, text: shareText, url });
      return 'shared';
    } catch (err: any) {
      // User dismissed — fall through to clipboard
      if (err?.name === 'AbortError') return 'failed';
    }
  }

  // Clipboard fallback
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return 'copied';
    }
  } catch {
    /* ignore */
  }

  return 'failed';
};
