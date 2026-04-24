import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Flag, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  bookTitle?: string;
}

const REPORT_REASONS = [
  { value: "copyright", label: "Copyright infringement" },
  { value: "duplicate", label: "Duplicate / re-uploaded content" },
  { value: "stolen_content", label: "Content stolen from me" },
  { value: "inappropriate", label: "Inappropriate or offensive" },
  { value: "spam", label: "Spam or misleading" },
  { value: "other", label: "Other" },
];

const BookReportDialog = ({
  open,
  onOpenChange,
  bookId,
  bookTitle,
}: BookReportDialogProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason("");
    setDescription("");
    setContactEmail("");
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error("Please sign in to submit a report.");
      return;
    }
    if (!reason) {
      toast.error("Please select a reason.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("book_reports")
        .insert({
          book_id: bookId,
          reporter_id: user.id,
          reason,
          description: description.trim() || null,
          contact_email: contactEmail.trim() || null,
        });
      if (error) throw error;

      toast.success("Report submitted. Our team will review it shortly.");
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Failed to submit report: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            Report Book
          </DialogTitle>
          <DialogDescription>
            {bookTitle ? `Reporting "${bookTitle}". ` : ""}
            Submit a copyright claim or report abusive content. Our team will
            review your report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason" className="mt-1">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Details</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the issue (proof links, original publication date, etc.)"
              rows={4}
              className="mt-1"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/1000
            </p>
          </div>

          <div>
            <Label htmlFor="contact">Contact email (optional)</Label>
            <Input
              id="contact"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting || !reason}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookReportDialog;
