/**
 * TypingIndicator - Shows "X is typing..." animation
 */

import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  username: string;
  className?: string;
}

export const TypingIndicator = ({ username, className }: TypingIndicatorProps) => {
  return (
    <div className={cn('flex items-center gap-1 p-3', className)}>
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-muted-foreground ml-1">{username} is typing...</span>
    </div>
  );
};

/**
 * TypingBubble - For message threads
 */
export const TypingBubble = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex gap-1 p-2 bg-gray-200 rounded-2xl w-fit', className)}>
      <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
};
