import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Reply, Forward, Pencil, Copy, Star, Trash2, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageActionBarProps {
  count: number;
  canReply: boolean;
  canEdit: boolean;
  canDeleteForEveryone: boolean;
  canInfo: boolean;
  onCancel: () => void;
  onReply: () => void;
  onForward: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onStar: () => void;
  onDelete: () => void;
  onInfo: () => void;
}

/**
 * WhatsApp-style top action bar shown when one or more messages are selected
 * via long-press. Replaces the regular ChatHeader while a selection exists.
 *
 * Strict rule: this is purely additive UI — it does not alter the underlying
 * chat module logic; it just exposes existing mutations (edit / delete / etc.)
 * via a familiar selection UI.
 */
export const MessageActionBar = ({
  count,
  canReply,
  canEdit,
  canDeleteForEveryone,
  canInfo,
  onCancel,
  onReply,
  onForward,
  onEdit,
  onCopy,
  onStar,
  onDelete,
  onInfo,
}: MessageActionBarProps) => {
  return (
    <div
      className="flex items-center gap-1 p-2 border-b border-border bg-background sticky top-0 z-40"
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full flex-shrink-0"
        onClick={onCancel}
        aria-label="Cancel selection"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <span className="font-semibold text-base mx-2 flex-1 truncate">
        {count} selected
      </span>

      <div className="flex items-center gap-0.5">
        {canReply && (
          <Button
            variant="ghost" size="icon" className="rounded-full"
            onClick={onReply} aria-label="Reply"
          >
            <Reply className="w-5 h-5" />
          </Button>
        )}
        <Button
          variant="ghost" size="icon" className="rounded-full"
          onClick={onForward} aria-label="Forward"
        >
          <Forward className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost" size="icon" className="rounded-full"
          onClick={onCopy} aria-label="Copy"
        >
          <Copy className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost" size="icon" className="rounded-full"
          onClick={onStar} aria-label="Star"
        >
          <Star className="w-5 h-5" />
        </Button>
        {canEdit && (
          <Button
            variant="ghost" size="icon" className="rounded-full"
            onClick={onEdit} aria-label="Edit"
          >
            <Pencil className="w-5 h-5" />
          </Button>
        )}
        <Button
          variant="ghost" size="icon"
          className={cn("rounded-full", canDeleteForEveryone && "text-destructive")}
          onClick={onDelete} aria-label="Delete"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
        {canInfo && (
          <Button
            variant="ghost" size="icon" className="rounded-full"
            onClick={onInfo} aria-label="Info"
          >
            <Info className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
};
