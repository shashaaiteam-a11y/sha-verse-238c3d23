/**
 * TickIndicator - Shows message status with WhatsApp-style ticks
 * ✓ = Sent
 * ✓✓ = Delivered
 * ✓✓ (Blue) = Read
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TickIndicatorProps {
  status: 'pending' | 'sent' | 'delivered' | 'read';
  className?: string;
  showText?: boolean;
}

export const TickIndicator = ({ status, className, showText = false }: TickIndicatorProps) => {
  const isBlue = status === 'read';

  if (status === 'pending') {
    return (
      <div className={cn('inline-flex items-center', className)}>
        <div className="w-1 h-1 rounded-full bg-gray-400 animate-pulse" />
      </div>
    );
  }

  const checkClass = cn(
    'w-4 h-4 inline',
    isBlue ? 'text-blue-500' : 'text-gray-400'
  );

  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      <Check className={checkClass} strokeWidth={3} />
      {(status === 'delivered' || status === 'read') && (
        <Check className={cn(checkClass, '-ml-2')} strokeWidth={3} />
      )}
      {showText && (
        <span className="text-xs ml-1 text-gray-500">
          {status === 'sent' && 'Sent'}
          {status === 'delivered' && 'Delivered'}
          {status === 'read' && 'Read'}
        </span>
      )}
    </div>
  );
};

/**
 * MessageStatusIndicator - Compact version for message bubbles
 */
export const MessageStatusIndicator = ({
  status,
  className,
}: {
  status: 'pending' | 'sent' | 'delivered' | 'read';
  className?: string;
}) => {
  const isBlue = status === 'read';

  if (status === 'pending') {
    return (
      <div className={cn('inline-block', className)}>
        <span className="text-[10px] text-gray-400">⏱️</span>
      </div>
    );
  }

  return (
    <span className={cn(
      'text-[10px] inline-block',
      isBlue ? 'text-blue-500 font-bold' : 'text-gray-400'
    )}>
      ✓{(status === 'delivered' || status === 'read') && '✓'}
    </span>
  );
};
