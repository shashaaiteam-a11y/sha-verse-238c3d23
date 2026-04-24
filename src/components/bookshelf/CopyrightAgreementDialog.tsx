import { useState } from "react";
import { Shield, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CopyrightAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when user agrees and wants to proceed with publishing. */
  onAgree: () => void;
  /** Optional: name in PDF metadata so we can show the mismatch context. */
  detectedAuthor?: string | null;
  /** Current user display name */
  currentUserName?: string | null;
}

const CopyrightAgreementDialog = ({
  open,
  onOpenChange,
  onAgree,
  detectedAuthor,
  currentUserName,
}: CopyrightAgreementDialogProps) => {
  const [ownsRights, setOwnsRights] = useState(false);
  const [acceptsTerms, setAcceptsTerms] = useState(false);

  const canProceed = ownsRights && acceptsTerms;

  const reset = () => {
    setOwnsRights(false);
    setAcceptsTerms(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Copyright Disclosure
          </DialogTitle>
          <DialogDescription>
            Before publishing, please confirm that you have the legal right to
            distribute this book on SHA-VERSE.
          </DialogDescription>
        </DialogHeader>

        {detectedAuthor && currentUserName && detectedAuthor.trim().toLowerCase() !== currentUserName.trim().toLowerCase() && (
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Author mismatch detected</p>
              <p className="text-muted-foreground mt-1">
                The file's metadata lists{" "}
                <span className="font-semibold">"{detectedAuthor}"</span> as the
                creator, but your account is{" "}
                <span className="font-semibold">"{currentUserName}"</span>. If
                you are not the rights holder, do not proceed.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3">
            <Checkbox
              id="owns-rights"
              checked={ownsRights}
              onCheckedChange={(c) => setOwnsRights(c === true)}
            />
            <Label
              htmlFor="owns-rights"
              className="text-sm leading-relaxed cursor-pointer"
            >
              I legally own the rights to this content, or I have explicit
              written permission from the rights holder to publish it.
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="accepts-terms"
              checked={acceptsTerms}
              onCheckedChange={(c) => setAcceptsTerms(c === true)}
            />
            <Label
              htmlFor="accepts-terms"
              className="text-sm leading-relaxed cursor-pointer"
            >
              I understand that uploading copyrighted material without
              permission may result in removal of my book, suspension of my
              account, and legal action by the rights holder.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canProceed}
            onClick={() => {
              onAgree();
              reset();
            }}
          >
            Agree & Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CopyrightAgreementDialog;
