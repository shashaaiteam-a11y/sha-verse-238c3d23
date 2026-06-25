import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const REMOVED_ITEMS = [
  "Profile & account details",
  "Posts, comments, likes & saved content",
  "Followers & following connections",
  "Messages & conversations",
  "Notifications",
  "Groups, group memberships & group posts",
  "Uploaded files, images & videos",
  "AI chat history",
  "Bookshelf content",
  "Movion content",
  "Any other data you own",
];

/**
 * Production-grade, Google-Play-compliant account deletion flow.
 * Permanent deletion: consent checkbox + typed "DELETE" + final confirmation,
 * then calls the secure `delete-account` edge function.
 */
export function DeleteAccountDialog({ trigger }: { trigger: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = understood && confirmText.trim().toUpperCase() === "DELETE" && !deleting;

  const reset = () => {
    setUnderstood(false);
    setConfirmText("");
  };

  async function handleDelete() {
    if (!user || !canDelete) return;
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Session expired. Please sign in again.");

      const { data, error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({
        title: "Account deleted",
        description: "Your account and all associated data have been permanently removed.",
      });
      setOpen(false);
      await signOut();
      navigate("/auth");
    } catch (e: any) {
      toast({
        title: "Deletion failed",
        description: e?.message || "Could not delete your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Account Permanently</DialogTitle>
          <DialogDescription>
            This action is <strong>permanent and cannot be undone</strong>. Deleting your
            account will permanently remove the following:
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-40 rounded-md border p-3">
          <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-4">
            {REMOVED_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ScrollArea>

        <div className="flex items-start gap-2 pt-1">
          <Checkbox
            id="delete-understood"
            checked={understood}
            onCheckedChange={(v) => setUnderstood(v === true)}
            className="mt-0.5"
          />
          <label htmlFor="delete-understood" className="text-sm leading-snug cursor-pointer">
            I understand this action is permanent.
          </label>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="delete-confirm" className="text-sm font-medium">
            Type <span className="font-bold">DELETE</span> to confirm
          </label>
          <Input
            id="delete-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!canDelete}>
            {deleting ? "Deleting..." : "Delete Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
