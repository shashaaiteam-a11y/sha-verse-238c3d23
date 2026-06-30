import { ReactNode, useRef, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  header: ReactNode;
  messages: ReactNode;
  inputBar: ReactNode;
  /**
   * Optional fixed banner rendered BETWEEN the header and the scrollable messages area.
   * Use this for elements (e.g. pinned-message banner) that must stay visible at all
   * times — `position: sticky` inside the Radix ScrollArea is unreliable on mobile
   * WebViews, so we render outside the scroll viewport instead.
   */
  pinnedBanner?: ReactNode;
  className?: string;
  emptyState?: ReactNode;
  isLoading?: boolean;
  onScrollToBottom?: () => void;
  onScrollPositionChange?: (distanceFromBottom: number) => void;
  onViewportReady?: (viewport: HTMLElement | null) => void;
  /**
   * When this key changes (e.g. the active conversationId), the layout treats it
   * as opening a fresh chat: it re-anchors the viewport to the LATEST message
   * instantly (no smooth animation, no visible top→bottom scroll), matching
   * WhatsApp's "open directly on the last message" behavior. Optional so existing
   * consumers (group/dialog chat) keep working unchanged.
   */
  bottomAnchorKey?: string | null;
}


/**
 * WhatsApp-style chat layout component
 * - Fixed header at top
 * - Scrollable message area in the middle
 * - Fixed input bar at bottom
 * - Consistent across all chat types (1-to-1, group, dialog, full-page)
 *
 * Scroll behavior (WhatsApp parity):
 *   - On open / conversation switch → jump straight to the latest message.
 *   - While near the bottom → auto-stick to the bottom as new content / media
 *     loads (ResizeObserver keeps it pinned even when images/videos reflow).
 *   - When the user has scrolled UP to read history → do NOT auto-scroll. Parent
 *     can show a "new messages" indicator via onScrollPositionChange.
 */
export const ChatLayout = ({
  header,
  messages,
  inputBar,
  pinnedBanner,
  className,
  emptyState,
  isLoading = false,
  onScrollPositionChange,
  onViewportReady,
  bottomAnchorKey,
}: ChatLayoutProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wasNearBottomRef = useRef(true);
  // Track previous scrollHeight so we ONLY auto-scroll when new content was
  // actually appended. This prevents the viewport from snapping back to the
  // bottom on every unrelated parent re-render (the cause of mobile scroll jank).
  const prevScrollHeightRef = useRef(0);
  // Until the first real content render for a conversation is pinned to the
  // bottom, we keep forcing the viewport down (covers async media reflow).
  const initialAnchoredRef = useRef(false);
  const anchorKeyRef = useRef<string | null | undefined>(bottomAnchorKey);

  const getViewport = useCallback((): HTMLElement | null => {
    if (viewportRef.current) return viewportRef.current;
    const v = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    viewportRef.current = v;
    return v;
  }, []);

  const jumpToBottom = useCallback((smooth = false) => {
    const v = getViewport();
    if (!v) return;
    if (smooth) {
      v.scrollTo({ top: v.scrollHeight, behavior: 'smooth' });
    } else {
      v.scrollTop = v.scrollHeight;
    }
    wasNearBottomRef.current = true;
    prevScrollHeightRef.current = v.scrollHeight;
  }, [getViewport]);

  // Expose viewport ref to parent and wire scroll listener
  useEffect(() => {
    const v = getViewport();
    onViewportReady?.(v);
    if (!v) return;
    const handle = () => {
      const dist = v.scrollHeight - v.scrollTop - v.clientHeight;
      wasNearBottomRef.current = dist < 80;
      onScrollPositionChange?.(dist);
    };
    v.addEventListener('scroll', handle, { passive: true });
    return () => v.removeEventListener('scroll', handle);
    // Intentionally NOT calling handle() on mount: on first paint scrollTop is 0
    // which would mark the user as "scrolled up" and suppress the open-at-bottom
    // auto-anchor below.
  }, [getViewport, onScrollPositionChange, onViewportReady]);

  // Re-anchor to the latest message when the active conversation changes (open,
  // reopen, switch). Done instantly so the user never sees a top→bottom scroll.
  useEffect(() => {
    if (anchorKeyRef.current === bottomAnchorKey) return;
    anchorKeyRef.current = bottomAnchorKey;
    initialAnchoredRef.current = false;
    wasNearBottomRef.current = true;
    prevScrollHeightRef.current = 0;
    // Multiple frames: content + async measurement can land across ticks.
    jumpToBottom(false);
    const r1 = requestAnimationFrame(() => jumpToBottom(false));
    const t1 = setTimeout(() => jumpToBottom(false), 60);
    const t2 = setTimeout(() => jumpToBottom(false), 200);
    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [bottomAnchorKey, jumpToBottom]);

  // Auto-scroll on content change:
  //   - First content render for this conversation → force to bottom (open at
  //     last message) regardless of measured position.
  //   - Afterwards → only stick to bottom if the user was already near it.
  useEffect(() => {
    const v = getViewport();
    if (!v) return;
    const prev = prevScrollHeightRef.current;
    const curr = v.scrollHeight;

    if (!initialAnchoredRef.current && curr > 0) {
      v.scrollTop = curr;
      wasNearBottomRef.current = true;
      prevScrollHeightRef.current = curr;
      // Consider the chat anchored once it actually has scrollable content.
      if (curr > v.clientHeight) initialAnchoredRef.current = true;
      return;
    }

    if (curr > prev && wasNearBottomRef.current) {
      v.scrollTop = curr;
    }
    prevScrollHeightRef.current = curr;
  }, [messages, getViewport]);

  // Keep pinned to the bottom while media (images/videos) load and reflow the
  // content. ResizeObserver catches height changes that don't change the
  // `messages` node reference, so the open-at-bottom stays correct on mobile.
  useEffect(() => {
    const v = getViewport();
    const content = contentRef.current;
    if (!v || !content || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (!initialAnchoredRef.current || wasNearBottomRef.current) {
        v.scrollTop = v.scrollHeight;
        prevScrollHeightRef.current = v.scrollHeight;
        if (v.scrollHeight > v.clientHeight) initialAnchoredRef.current = true;
      }
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [getViewport, bottomAnchorKey]);

  return (
    <div className={cn("flex flex-col h-full overflow-hidden bg-background", className)}>
      {/* Fixed Header */}
      <div className="flex-shrink-0 z-10 bg-background">
        {header}
      </div>

      {/* Fixed Pinned Banner (rendered OUTSIDE the scroll viewport for reliable
          mobile visibility — `position: sticky` inside Radix ScrollArea fails on
          Capacitor WebView / older iOS Safari). */}
      {pinnedBanner && (
        <div className="flex-shrink-0 z-10 bg-background">
          {pinnedBanner}
        </div>
      )}

      {/* Scrollable Messages Area */}
      <div className="flex-1 min-h-0 overflow-hidden relative bg-background">
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-background">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ScrollArea
            ref={scrollRef}
            className="h-full w-full bg-background"
          >
            <div ref={contentRef} className="p-4 min-h-full bg-background">
              {messages ? (
                <>{messages}</>
              ) : (
                <div className="flex items-center justify-center min-h-[300px]">
                  {emptyState || (
                    <div className="text-center text-muted-foreground">
                      <p>No messages yet</p>
                      <p className="text-sm mt-1">Start a conversation</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Fixed Input Bar at Bottom */}
      <div className="flex-shrink-0 z-10 bg-background">
        {inputBar}

      </div>
    </div>
  );
};
