import { ChevronDown, Reply, Forward, Copy, Pin, PinOff, Pencil, Trash2, Info, CheckSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface MessageActionsMenuProps {
  isOwn: boolean;
  canEdit: boolean;
  canDeleteForEveryone: boolean;
  isDeleted: boolean;
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onPin: () => void;
  isPinned?: boolean;
  /** When false and message is already pinned, hide the Unpin menu item completely. */
  canUnpin?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onInfo: () => void;
  onSelect?: () => void;
}

/**
 * WhatsApp/Telegram-style chevron arrow on each message bubble.
 * Opens a dropdown menu with Reply, Forward, Copy, Star, Edit, Delete, Info.
 *
 * Strict rule: this is purely additive UI — it reuses the existing message
 * action handlers (selection-based) without altering chat module logic.
 */
export const MessageActionsMenu = ({
  isOwn,
  canEdit,
  canDeleteForEveryone,
  isDeleted,
  onReply,
  onForward,
  onCopy,
  onPin,
  isPinned,
  onEdit,
  onDelete,
  onInfo,
  onSelect,
}: MessageActionsMenuProps) => {
  if (isDeleted) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="Message actions"
          className={cn(
            "absolute top-1 right-1 p-0.5 rounded-full",
            "bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20",
            "text-foreground/70 hover:text-foreground",
            "opacity-0 group-hover/msg:opacity-100 focus:opacity-100 active:opacity-100",
            "transition-opacity"
          )}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isOwn ? 'end' : 'start'}
        className="w-48"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem onSelect={onReply}>
          <Reply className="w-4 h-4 mr-3" /> Reply
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onForward}>
          <Forward className="w-4 h-4 mr-3" /> Forward
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCopy}>
          <Copy className="w-4 h-4 mr-3" /> Copy
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onPin}>
          {isPinned ? <PinOff className="w-4 h-4 mr-3" /> : <Pin className="w-4 h-4 mr-3" />}
          {isPinned ? 'Unpin' : 'Pin'}
        </DropdownMenuItem>
        {onSelect && (
          <DropdownMenuItem onSelect={onSelect}>
            <CheckSquare className="w-4 h-4 mr-3" /> Select
          </DropdownMenuItem>
        )}
        {canEdit && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="w-4 h-4 mr-3" /> Edit
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onDelete}
          className={cn(canDeleteForEveryone && "text-destructive focus:text-destructive")}
        >
          <Trash2 className="w-4 h-4 mr-3" /> Delete
        </DropdownMenuItem>
        {isOwn && (
          <DropdownMenuItem onSelect={onInfo}>
            <Info className="w-4 h-4 mr-3" /> Info
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
