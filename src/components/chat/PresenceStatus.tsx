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
      <div className={cn(`flex items-center gap-1 ${textSize} font-medium text-green-500`, className)}>
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
 * Format last seen time like WhatsApp — always shows actual clock time
 *   - Today      → "Last seen today at 1:45 PM"
 *   - Yesterday  → "Last seen yesterday at 1:45 PM"
 *   - This week  → "Last seen Mon at 1:45 PM"
 *   - Older      → "Last seen 12 Apr at 1:45 PM"
 */
const formatLastSeen = (date: Date | null | undefined): string => {
  if (!date) return 'offline';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  if (dayDiff <= 0) return `Last seen today at ${time}`;
  if (dayDiff === 1) return `Last seen yesterday at ${time}`;
  if (dayDiff < 7) {
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
    return `Last seen ${weekday} at ${time}`;
  }

  const day = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(date);
  return `Last seen ${day} at ${time}`;
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
        'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background',
        isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400',
        className
      )}
    />
  );
};
