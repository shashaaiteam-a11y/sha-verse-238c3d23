import { ReactNode, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  header: ReactNode;
  messages: ReactNode;
  inputBar: ReactNode;
  className?: string;
  emptyState?: ReactNode;
  isLoading?: boolean;
  onScrollToBottom?: () => void;
}

/**
 * WhatsApp-style chat layout component
 * - Fixed header at top
 * - Scrollable message area in the middle
 * - Fixed input bar at bottom
 * - Consistent across all chat types (1-to-1, group, dialog, full-page)
 */
export const ChatLayout = ({
  header,
  messages,
  inputBar,
  className,
  emptyState,
  isLoading = false,
}: ChatLayoutProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

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
