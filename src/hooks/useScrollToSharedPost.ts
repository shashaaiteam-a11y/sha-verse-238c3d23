import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to & briefly highlights a post when the URL contains `?post=<id>`.
 * Used by Home, Profile and GroupDetail so deep-links from ShareDialog work
 * across timeline / story / external share targets.
 *
 * @param ready  Pass `true` once the feed data has rendered, so the target
 *               element actually exists in the DOM before we try to scroll.
 */
export const useScrollToSharedPost = (ready: boolean = true) => {
  const { search, pathname } = useLocation();

  useEffect(() => {
    if (!ready) return;

    const params = new URLSearchParams(search);
    const postId = params.get('post');
    if (!postId) return;

    let cancelled = false;
    let highlightTimer: number | undefined;

    // Retry up to ~3s in case the post is still loading / lazy-rendered.
    const tryScroll = (attempt = 0) => {
      if (cancelled) return;
      const el = document.getElementById(`post-${postId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add(
          'ring-2',
          'ring-primary',
          'ring-offset-2',
          'transition-shadow',
          'duration-500',
        );
        highlightTimer = window.setTimeout(() => {
          el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2500);
        return;
      }
      if (attempt < 15) {
        window.setTimeout(() => tryScroll(attempt + 1), 200);
      }
    };

    tryScroll();

    return () => {
      cancelled = true;
      if (highlightTimer) window.clearTimeout(highlightTimer);
    };
  }, [search, pathname, ready]);
};
