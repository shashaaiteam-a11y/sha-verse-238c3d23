/**
 * PresenceStatus - Shows "Online" or "Last seen X minutes ago"
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PresenceStatusProps {
  isOnline: boolean;
  lastSeen?: Date | null;
  isLoading?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const PresenceStatus = ({
  isOnline,
  lastSeen,
  isLoading = false,
  className,
  size = 'sm',
}: PresenceStatusProps) => {
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  if (isLoading) {
    return (
      <div className={cn(`flex items-center gap-1 ${textSize} text-muted-foreground`, className)}>
        <Loader2 className={cn(dotSize, 'animate-spin')} />
        <span>Loading...</span>
      </div>
    );
  }

  if (isOnline) {
    return (
      <div className={cn(`flex items-center gap-1 ${textSize} text-green-500 font-medium`, className)}>
        <div className={cn(dotSize, 'rounded-full bg-green-500 animate-pulse')} />
        <span>Online</span>
      </div>
    );
  }

  return (
    <div className={cn(`flex items-center gap-1 ${textSize} text-muted-foreground`, className)}>
      <div className={cn(dotSize, 'rounded-full bg-gray-400')} />
      <span>{formatLastSeen(lastSeen)}</span>
    </div>
  );
};

/**
 * Format last seen time like WhatsApp
 */
const formatLastSeen = (date: Date | null | undefined): string => {
  if (!date) return 'offline';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return formatter.format(date);
};

/**
 * OnlineBadge - Dot indicator for contact lists
 */
export const OnlineBadge = ({
  isOnline,
  className,
}: {
  isOnline: boolean;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
        isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400',
        className
      )}
    />
  );
};
