// VideoCard Menu Component - With proper outside click handling
import React, { useEffect, useRef } from 'react';
import { Clock, X, Share2, Trash2, Download, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoCardMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isSavedInWatchLater: boolean;
  isSaved: boolean;
  isOwner: boolean;
  onWatchLater: () => void;
  onNotInterested: () => void;
  onShare: () => void;
  onSave: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  position?: 'left' | 'right';
}

export const VideoCardMenu: React.FC<VideoCardMenuProps> = ({
  isOpen,
  onClose,
  isSavedInWatchLater,
  isSaved,
  isOwner,
  onWatchLater,
  onNotInterested,
  onShare,
  onSave,
  onDelete,
  onDownload,
  position = 'right',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = (action: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute top-full mt-1 w-56 bg-popover border border-border rounded-xl shadow-lg z-50 py-2",
        "animate-in fade-in slide-in-from-top-2 duration-200",
        position === 'right' ? 'right-0' : 'left-0'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={handleAction(onWatchLater)}
        className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-3 transition-colors text-popover-foreground"
      >
        <Clock size={18} className={isSavedInWatchLater ? 'text-primary' : ''} />
        {isSavedInWatchLater ? 'Remove from Watch Later' : 'Save to Watch Later'}
      </button>
      
      <button
        onClick={handleAction(onSave)}
        className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-3 transition-colors text-popover-foreground"
      >
        <Bookmark size={18} className={isSaved ? 'fill-current text-primary' : ''} />
        {isSaved ? 'Remove from Saved' : 'Save'}
      </button>
      
      <button
        onClick={handleAction(onNotInterested)}
        className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-3 transition-colors text-popover-foreground"
      >
        <X size={18} />
        Not interested
      </button>
      
      <button
        onClick={handleAction(onShare)}
        className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-3 transition-colors text-popover-foreground"
      >
        <Share2 size={18} />
        Share
      </button>

      {onDownload && (
        <button
          onClick={handleAction(onDownload)}
          className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-3 transition-colors text-popover-foreground"
        >
          <Download size={18} />
          Download
        </button>
      )}

      {isOwner && onDelete && (
        <>
          <div className="h-px bg-border my-1" />
          <button
            onClick={handleAction(onDelete)}
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-3 text-destructive transition-colors"
          >
            <Trash2 size={18} />
            Delete
          </button>
        </>
      )}
    </div>
  );
};
