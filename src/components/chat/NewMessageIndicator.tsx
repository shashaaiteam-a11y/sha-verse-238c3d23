/**
 * NewMessageIndicator
 * WhatsApp-style small green pill shown inside the chat view when the user is
 * scrolled UP and a new message arrives. Click → smooth scroll to bottom.
 *
 * Purely an overlay — no layout shift, no footer-nav interference.
 */
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewMessageIndicatorProps {
  visible: boolean;
  count: number;
  onClick: () => void;
  className?: string;
}

export const NewMessageIndicator = ({
  visible,
  count,
  onClick,
  className,
}: NewMessageIndicatorProps) => {
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count > 0 ? `${count} new messages, scroll to bottom` : 'Scroll to bottom'}
      className={cn(
        'absolute right-3 bottom-3 z-30 flex items-center gap-1 px-2 py-1 rounded-full',
        'bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 active:scale-95 transition',
        'pointer-events-auto select-none',
        className,
      )}
      style={{ minWidth: 28, minHeight: 28 }}
    >
      <ChevronDown className="w-4 h-4" strokeWidth={3} />
      {count > 0 && (
        <span className="text-[11px] font-semibold leading-none pr-1">{count}</span>
      )}
    </button>
  );
};
