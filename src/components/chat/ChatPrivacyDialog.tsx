/**
 * ChatPrivacyDialog - WhatsApp-style chat privacy controls
 *
 * Lets the user choose who can see:
 *   - Last Seen (Everyone / My Contacts / Nobody)
 *   - Online status (Everyone / My Contacts / Nobody)
 *   - Read receipts (on/off)
 *
 * Saves through `upsert_my_chat_privacy` RPC. Server enforces the
 * "Give and Take" rule (hiding both means you can't see others' status).
 */
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Eye, Wifi, CheckCheck } from 'lucide-react';

type Visibility = 'everyone' | 'contacts' | 'nobody';

interface ChatPrivacyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChatPrivacyDialog = ({ open, onOpenChange }: ChatPrivacyDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [lastSeen, setLastSeen] = useState<Visibility>('everyone');
  const [onlineStatus, setOnlineStatus] = useState<Visibility>('everyone');
  const [readReceipts, setReadReceipts] = useState(true);


  // Load current settings + subscribe to live changes (other tabs/devices)
  useEffect(() => {
    if (!open || !user?.id) return;

    let cancelled = false;
    setLoading(true);

    const loadSettings = async () => {
      const { data } = await (supabase as any)
        .from('user_settings')
        .select('last_seen_visibility, online_status_visibility, read_receipts_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      setLastSeen((data?.last_seen_visibility as Visibility) || 'everyone');
      setOnlineStatus((data?.online_status_visibility as Visibility) || 'everyone');
      setReadReceipts(data?.read_receipts_enabled !== false);
      setLoading(false);
    };

    void loadSettings();

    // Realtime: keep the open dialog in sync if changed elsewhere
    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase
      .channel(`chat-privacy-self-${user.id}-${suffix}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          if (!savingRef.current) void loadSettings();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [open, user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    savingRef.current = true;
    setSaving(true);

    const { error } = await (supabase as any).rpc('upsert_my_chat_privacy', {
      _last_seen: lastSeen,
      _online_status: onlineStatus,
      _read_receipts: readReceipts,
    });

    setSaving(false);
    savingRef.current = false;

    if (error) {
      console.error('Failed to save chat privacy:', error);
      toast.error('Could not save privacy settings');
      return;
    }

    // Make presence header pills (Online / Last seen) reflect new visibility instantly
    queryClient.invalidateQueries({ queryKey: ['user-presence'] });
    queryClient.invalidateQueries({ queryKey: ['chat-partner-presence'] });

    toast.success('Privacy settings saved');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chat Privacy</DialogTitle>
          <DialogDescription>
            Choose who can see your activity. If you hide both Last Seen and Online status,
            you won't be able to see other people's either.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Last Seen */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Eye className="w-4 h-4 text-muted-foreground" />
                Last Seen
              </Label>
              <Select value={lastSeen} onValueChange={(v) => setLastSeen(v as Visibility)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="contacts">My Contacts</SelectItem>
                  <SelectItem value="nobody">Nobody</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Online status */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Wifi className="w-4 h-4 text-muted-foreground" />
                Online Status
              </Label>
              <Select
                value={onlineStatus}
                onValueChange={(v) => setOnlineStatus(v as Visibility)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="contacts">My Contacts</SelectItem>
                  <SelectItem value="nobody">Nobody</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Read receipts */}
            <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <CheckCheck className="w-4 h-4 text-muted-foreground" />
                  Read receipts
                </Label>
                <p className="text-xs text-muted-foreground">
                  If turned off, you won't send or receive read receipts.
                </p>
              </div>
              <Switch checked={readReceipts} onCheckedChange={setReadReceipts} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
