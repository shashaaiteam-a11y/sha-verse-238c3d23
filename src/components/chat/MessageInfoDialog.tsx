/**
 * MessageInfoDialog - WhatsApp-style "Message Info"
 *
 * Shows for an outgoing message:
 *   ✓     Sent      → created_at
 *   ✓✓    Delivered → delivered_at (or "—" if not yet)
 *   ✓✓ 🔵 Read      → read_at (or "—" if not yet)
 *
 * Realtime: subscribes to UPDATEs on this specific message id so the
 * timestamps appear the moment the recipient receives / opens the chat.
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, CheckCheck } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface MessageInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: {
    id: string;
    content?: string | null;
    created_at: string;
    delivered_at?: string | null;
    read_at?: string | null;
    is_delivered?: boolean | null;
    is_read?: boolean | null;
    metadata?: { mediaUrl?: string; mediaType?: string } | null;
  } | null;
}

const formatStamp = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  const time = format(d, 'h:mm a');
  if (isToday(d)) return `Today, ${time}`;
  if (isYesterday(d)) return `Yesterday, ${time}`;
  return `${format(d, 'd MMM yyyy')}, ${time}`;
};

export const MessageInfoDialog = ({
  open,
  onOpenChange,
  message,
}: MessageInfoDialogProps) => {
  // Locally mirror the timestamps so realtime updates re-render this dialog
  // without waiting for the parent message list to refetch.
  const [readAt, setReadAt] = useState<string | null>(message?.read_at ?? null);
  const [deliveredAt, setDeliveredAt] = useState<string | null>(
    message?.delivered_at ?? null
  );

  useEffect(() => {
    setReadAt(message?.read_at ?? null);
    setDeliveredAt(message?.delivered_at ?? null);
  }, [message?.id, message?.read_at, message?.delivered_at]);

  // Realtime subscription tied to this exact message id
  useEffect(() => {
    if (!open || !message?.id) return;
    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase
      .channel(`message-info-${message.id}-${suffix}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `id=eq.${message.id}`,
        },
        (payload: any) => {
          const row = payload?.new;
          if (!row) return;
          setDeliveredAt(row.delivered_at ?? null);
          setReadAt(row.read_at ?? null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, message?.id]);

  if (!message) return null;

  const sentLabel = formatStamp(message.created_at);
  const deliveredLabel = formatStamp(deliveredAt);
  const readLabel = formatStamp(readAt);

  // A short preview of what message this is
  const preview =
    message.content?.trim() ||
    (message.metadata?.mediaType === 'image'
      ? '📷 Photo'
      : message.metadata?.mediaType === 'video'
        ? '🎥 Video'
        : message.metadata?.mediaType === 'file'
          ? '📎 File'
          : 'Message');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message info</DialogTitle>
        </DialogHeader>

        {/* Message preview bubble */}
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
          <p className="text-sm text-foreground line-clamp-3 break-words whitespace-pre-wrap">
            {preview}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground text-right">
            {format(new Date(message.created_at), 'h:mm a')}
          </p>
        </div>

        {/* Status rows — WhatsApp order: Read → Delivered → Sent (most recent first) */}
        <div className="mt-2 space-y-1">
          <InfoRow
            icon={
              <CheckCheck
                className={cn('h-5 w-5', readAt ? 'text-blue-500' : 'text-muted-foreground/40')}
              />
            }
            label="Read"
            time={readLabel}
            active={!!readAt}
          />
          <InfoRow
            icon={
              <CheckCheck
                className={cn('h-5 w-5', deliveredAt ? 'text-foreground' : 'text-muted-foreground/40')}
              />
            }
            label="Delivered"
            time={deliveredLabel}
            active={!!deliveredAt}
          />
          <InfoRow
            icon={<Check className="h-5 w-5 text-foreground" />}
            label="Sent"
            time={sentLabel}
            active
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InfoRow = ({
  icon,
  label,
  time,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  time: string;
  active: boolean;
}) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <span
        className={cn(
          'text-sm font-medium',
          active ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {label}
      </span>
    </div>
    <span
      className={cn(
        'text-xs tabular-nums',
        active ? 'text-foreground' : 'text-muted-foreground/70'
      )}
    >
      {time}
    </span>
  </div>
);
