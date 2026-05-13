import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Forward } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: any[];
  excludeConversationId?: string | null;
  /** Messages selected for forwarding. Order is preserved on send. */
  messages: Array<{
    id: string;
    content: string | null;
    metadata?: any;
  }>;
  onDone?: () => void;
}

/**
 * WhatsApp-style "Forward to..." picker. Shows the user's existing
 * conversations and lets them tick one or more recipients. On confirm,
 * inserts copies of the selected messages with `metadata.forwarded = true`
 * so receiving bubbles can render the "Forwarded" label.
 *
 * Uses only the existing `messages` table + `metadata` jsonb column —
 * no schema changes.
 */
export const ForwardDialog = ({
  open, onOpenChange, conversations, excludeConversationId, messages, onDone,
}: ForwardDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const filtered = (conversations || [])
    .filter((c: any) => c.id !== excludeConversationId)
    .filter((c: any) => {
      const name = c.otherMembers?.[0]?.display_name || '';
      return !query || name.toLowerCase().includes(query.toLowerCase());
    });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleForward = async () => {
    if (!user || selected.size === 0 || messages.length === 0) return;
    setSending(true);
    try {
      const rows: any[] = [];
      for (const convoId of selected) {
        for (const msg of messages) {
          if (!msg.content && !msg.metadata?.mediaUrl) continue;
          const meta = { ...(msg.metadata || {}), forwarded: true };
          // Drop reply context when forwarding (WhatsApp parity)
          delete meta.replyTo;
          rows.push({
            conversation_id: convoId,
            sender_id: user.id,
            content: msg.content,
            metadata: meta,
          });
        }
      }
      if (rows.length === 0) {
        toast.error('Nothing to forward');
        return;
      }
      const { error } = await supabase.from('messages').insert(rows);
      if (error) throw error;
      toast.success(`Forwarded to ${selected.size} chat${selected.size > 1 ? 's' : ''}`);
      queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
      onOpenChange(false);
      setSelected(new Set());
      setQuery('');
      onDone?.();
    } catch (e: any) {
      console.error('Forward failed:', e);
      toast.error('Failed to forward');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Forward className="w-5 h-5" />
            Forward to...
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="pl-10 bg-secondary border-0 rounded-full h-10"
            />
          </div>
        </div>

        <ScrollArea className="max-h-80">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No chats found
            </p>
          ) : (
            filtered.map((c: any) => {
              const other = c.otherMembers?.[0];
              const isOn = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors text-left',
                    isOn && 'bg-primary/10',
                  )}
                >
                  <Checkbox checked={isOn} className="pointer-events-none" />
                  <Avatar className="h-10 w-10">
                    {other?.avatar_url && <AvatarImage src={other.avatar_url} />}
                    <AvatarFallback>{other?.display_name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {other?.display_name || 'Unknown'}
                    </p>
                    {other?.username && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{other.username}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </ScrollArea>

        <DialogFooter className="px-4 py-3 border-t border-border">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={selected.size === 0 || sending}
            className="gap-2"
          >
            <Forward className="w-4 h-4" />
            Forward
            {selected.size > 0 && ` (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
