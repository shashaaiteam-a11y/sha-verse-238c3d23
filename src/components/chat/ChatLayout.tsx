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
}


/**
 * WhatsApp-style chat layout component
 * - Fixed header at top
 * - Scrollable message area in the middle
 * - Fixed input bar at bottom
 * - Consistent across all chat types (1-to-1, group, dialog, full-page)
 *
 * Auto-scroll behavior (WhatsApp parity):
 *   - If the user is at/near the bottom (within 80px) → auto-scroll on new content.
 *   - If the user has scrolled UP to read history → do NOT auto-scroll. Parent
 *     can show a "new messages" indicator via onScrollPositionChange.
 */
export const ChatLayout = ({
  header,
  messages,
  inputBar,
  className,
  emptyState,
  isLoading = false,
  onScrollPositionChange,
  onViewportReady,
}: ChatLayoutProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement | null>(null);
  const wasNearBottomRef = useRef(true);

  const getViewport = useCallback((): HTMLElement | null => {
    if (viewportRef.current) return viewportRef.current;
    const v = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    viewportRef.current = v;
    return v;
  }, []);

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
    handle();
    v.addEventListener('scroll', handle, { passive: true });
    return () => v.removeEventListener('scroll', handle);
  }, [getViewport, onScrollPositionChange, onViewportReady]);

  // Auto-scroll on new content ONLY when user was already near bottom
  useEffect(() => {
    const v = getViewport();
    if (!v) return;
    if (wasNearBottomRef.current) {
      v.scrollTop = v.scrollHeight;
    }
  }, [messages, getViewport]);

  return (
    <div className={cn("flex flex-col h-full overflow-hidden bg-background", className)}>
      {/* Fixed Header */}
      <div className="flex-shrink-0 z-10 bg-background">
        {header}
      </div>

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
            <div className="p-4 min-h-full bg-background">
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
