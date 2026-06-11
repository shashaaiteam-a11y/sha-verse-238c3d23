import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBookInteractions } from "@/hooks/useBookInteractions";

interface BookDeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  bookTitle: string;
}

const DELETION_REASONS = [
  { value: "incorrect_upload", label: "Incorrect upload" },
  { value: "copyright_issue", label: "Copyright issue" },
  { value: "want_to_remove", label: "Want to remove" },
  { value: "privacy_issue", label: "Privacy issue" },
  { value: "other", label: "Other" },
];

const BookDeletionDialog = ({ open, onOpenChange, bookId, bookTitle }: BookDeletionDialogProps) => {
  const { submitDeletionRequest } = useBookInteractions(bookId);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !confirmed) return;
    await submitDeletionRequest.mutateAsync({ reason, description: description || undefined });
    onOpenChange(false);
    setReason("");
    setDescription("");
    setConfirmed(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Request Book Deletion
          </DialogTitle>
          <DialogDescription>
            Submit a request to delete "{bookTitle}". Once submitted, your book is permanently deleted within 3 hours.
          </DialogDescription>

        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              This action cannot be undone. Your book will be permanently deleted within 3 hours of submitting this request.
            </p>
          </div>

          {/* Book Info */}
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm"><strong>Book:</strong> {bookTitle}</p>
            <p className="text-xs text-muted-foreground">ID: {bookId}</p>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason">Reason for deletion *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                {DELETION_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Additional details</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide more details about your request..."
              rows={3}
              className="mt-2"
            />
          </div>

          {/* Confirmation */}
          <div className="flex items-start gap-2">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <Label htmlFor="confirm" className="text-sm leading-tight cursor-pointer">
              I understand that my book will be permanently deleted within 3 hours and this is irreversible.
            </Label>

          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleSubmit}
              disabled={!reason || !confirmed || submitDeletionRequest.isPending}
            >
              {submitDeletionRequest.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookDeletionDialog;
