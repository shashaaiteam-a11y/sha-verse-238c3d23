import { useState, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Loader2,
  X,
  CheckCircle2,
  MessageCircle,
  Mail,
  ArrowLeft,
  ListChecks,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  PromoteCurrency,
  DURATIONS,
  getPriceBreakdown,
  formatMoney,
  detectDefaultCurrency,
  PAYMENT_GATEWAY,
} from "@/lib/promote/pricing";
import {
  buildWhatsAppLink,
  buildMailtoLink,
  OWNER_EMAIL,
} from "@/lib/promote/config";
import {
  useCreatePromotion,
  useMyPromotions,
  type Promotion,
} from "@/hooks/usePromote";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "details" | "payment" | "confirm" | "track";
type PromoType = "story" | "feed_banner";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const PromoteModal = ({ open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const create = useCreatePromotion();
  const myPromos = useMyPromotions();

  const [step, setStep] = useState<Step>("details");
  const [businessName, setBusinessName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<PromoType>("story");
  const [duration, setDuration] = useState(1);
  const [targetLink, setTargetLink] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [currency, setCurrency] = useState<PromoteCurrency>(detectDefaultCurrency());
  const [result, setResult] = useState<Promotion | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const price = useMemo(
    () => getPriceBreakdown(duration, currency),
    [duration, currency],
  );

  const reset = () => {
    setStep("details");
    setBusinessName("");
    setWhatsapp("");
    setEmail("");
    setType("story");
    setDuration(1);
    setTargetLink("");
    setCaption("");
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setCurrency(detectDefaultCurrency());
    setResult(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = (f: File) => {
    const isVideo = f.type.startsWith("video/");
    if (!isVideo && !f.type.startsWith("image/")) {
      toast({ title: "Only image or video allowed", variant: "destructive" });
      return;
    }
    if (isVideo && f.size > MAX_VIDEO_BYTES) {
      toast({ title: "Video must be under 50MB", variant: "destructive" });
      return;
    }
    if (!isVideo && f.size > MAX_IMAGE_BYTES) {
      toast({ title: "Image must be under 10MB", variant: "destructive" });
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const detailsValid =
    businessName.trim().length > 1 && whatsapp.trim().length > 5 && !!file;

  const goToPayment = () => {
    if (!detailsValid) {
      toast({
        title: "Please complete the form",
        description: "Business name, WhatsApp/contact and media are required.",
        variant: "destructive",
      });
      return;
    }
    setStep("payment");
  };

  const handlePay = async () => {
    if (!file) return;
    try {
      const promo = await create.mutateAsync({
        file,
        businessName,
        whatsapp,
        email: email || undefined,
        type,
        duration,
        currency,
        targetLink: targetLink || undefined,
        caption: caption || undefined,
      });
      setResult(promo);
      setStep("confirm");
      toast({ title: "Payment received (test mode)", description: "Promotion submitted for review." });
    } catch (err: any) {
      toast({
        title: "Could not submit",
        description: err?.message || "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(step === "payment" || step === "track") && (
              <button
                onClick={() => setStep(step === "track" ? "confirm" : "details")}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {step === "details" && "Promote with Us"}
            {step === "payment" && "Review & Pay"}
            {step === "confirm" && "Promotion Submitted"}
            {step === "track" && "Track Status"}
          </DialogTitle>
          <DialogDescription>
            {step === "details" && "Reach the Sha-Verse community. Fill in your details and upload your media."}
            {step === "payment" && "Confirm your plan and complete payment."}
            {step === "confirm" && "We've received your promotion. Our team will review it shortly."}
            {step === "track" && "Your submitted promotions and their review status."}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1 — DETAILS */}
        {step === "details" && (
          <div className="space-y-3">
            {!file ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full aspect-video rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Upload image (≤10MB) or video (≤50MB)
                </span>
              </button>
            ) : (
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                {file.type.startsWith("video/") ? (
                  <video src={preview!} className="w-full h-full object-contain" controls />
                ) : (
                  <img src={preview!} alt="" className="w-full h-full object-contain" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (preview) URL.revokeObjectURL(preview);
                    setFile(null);
                    setPreview(null);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />

            <div className="space-y-1.5">
              <Label htmlFor="pm-business">Business / Brand Name *</Label>
              <Input
                id="pm-business"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your business name"
                maxLength={80}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="pm-wa">WhatsApp *</Label>
                <Input
                  id="pm-wa"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+91..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pm-email">Email</Label>
                <Input
                  id="pm-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Promotion Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as PromoType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="feed_banner">Feed Banner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Select
                  value={String(duration)}
                  onValueChange={(v) => setDuration(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {DURATIONS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {h} {h === 1 ? "hour" : "hours"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pm-link">Target Link (optional)</Label>
              <Input
                id="pm-link"
                type="url"
                value={targetLink}
                onChange={(e) => setTargetLink(e.target.value)}
                placeholder="https://"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pm-caption">Caption (optional)</Label>
              <Textarea
                id="pm-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Short pitch shown over your media"
                maxLength={140}
                rows={2}
              />
            </div>

            <Button onClick={goToPayment} className="w-full" disabled={!detailsValid}>
              Continue to Payment
            </Button>

            <button
              onClick={() => setStep("track")}
              className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
            >
              <ListChecks className="w-3.5 h-3.5" /> Track my promotions
            </button>
          </div>
        )}

        {/* STEP 2 — REVIEW & PAYMENT */}
        {step === "payment" && (
          <div className="space-y-4">
            {/* Currency toggle */}
            <div className="inline-flex w-full rounded-lg border border-border p-1 bg-muted/40">
              {(["INR", "USD"] as PromoteCurrency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    currency === c
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {c === "INR" ? "₹ INR" : "$ USD"}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border divide-y divide-border text-sm">
              <Row label="Business" value={businessName} />
              <Row label="Type" value={type === "story" ? "Story" : "Feed Banner"} />
              <Row label="Duration" value={`${duration} ${duration === 1 ? "hour" : "hours"}`} />
              <Row label="Base price" value={formatMoney(price.base, currency)} />
              {price.hasGst && (
                <Row label="GST (18%)" value={formatMoney(price.gst, currency)} />
              )}
              <div className="flex items-center justify-between px-3 py-2.5 font-semibold">
                <span>Total</span>
                <span>{formatMoney(price.total, currency)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Payment via{" "}
              <span className="font-medium">{PAYMENT_GATEWAY[currency]}</span>{" "}
              ({currency === "INR" ? "UPI, cards & netbanking" : "cards, Apple Pay & Google Pay"}).
              {" "}Test mode — no real charge yet.
            </p>

            <Button onClick={handlePay} className="w-full" disabled={create.isPending}>
              {create.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Pay {formatMoney(price.total, currency)}
            </Button>
          </div>
        )}

        {/* STEP 3 — CONFIRMATION */}
        {step === "confirm" && result && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center gap-2 py-2">
              <CheckCircle2 className="w-12 h-12 text-primary" />
              <p className="font-semibold">Promotion submitted!</p>
              <p className="text-xs text-muted-foreground">
                Status: <span className="font-medium text-foreground">Pending Review</span>
              </p>
            </div>

            <div className="rounded-lg border border-border divide-y divide-border text-sm">
              <Row label="Promotion ID" value={result.id.slice(0, 8).toUpperCase()} />
              <Row label="Duration" value={`${result.duration} ${result.duration === 1 ? "hour" : "hours"}`} />
              <Row
                label="Amount paid"
                value={formatMoney(result.amount / 100, result.currency as PromoteCurrency)}
              />
              <Row label="Gateway" value={result.payment_gateway} />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" onClick={() => setStep("track")}>
                <ListChecks className="w-4 h-4 mr-2" /> Track Status
              </Button>
              <div className="grid grid-cols-2 gap-2">
                {(() => {
                  const waText = `Hi! I've submitted a promotion on Sha-Verse.\nID: ${result.id.slice(0, 8).toUpperCase()}\nBusiness: ${result.business_name}\nPlan: ${result.duration}h\nAmount: ${formatMoney(result.amount / 100, result.currency as PromoteCurrency)}`;
                  const wa = buildWhatsAppLink(waText);
                  return wa ? (
                    <Button variant="outline" asChild>
                      <a href={wa} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled title="Owner WhatsApp not configured">
                      <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                    </Button>
                  );
                })()}
                <Button variant="outline" asChild>
                  <a
                    href={buildMailtoLink(
                      `Promotion ${result.id.slice(0, 8).toUpperCase()}`,
                      `Promotion ID: ${result.id}\nBusiness: ${result.business_name}\nDuration: ${result.duration}h\nAmount: ${formatMoney(result.amount / 100, result.currency as PromoteCurrency)}`,
                    )}
                  >
                    <Mail className="w-4 h-4 mr-2" /> Email
                  </a>
                </Button>
              </div>
              <Button onClick={() => handleClose(false)} className="w-full">
                Done
              </Button>
            </div>
            <p className="text-[11px] text-center text-muted-foreground">
              Owner notifications go to {OWNER_EMAIL}
            </p>
          </div>
        )}

        {/* TRACK STATUS */}
        {step === "track" && (
          <div className="space-y-3">
            {myPromos.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (myPromos.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No promotions yet.
              </p>
            ) : (
              <div className="space-y-2">
                {myPromos.data!.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-2.5"
                  >
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                      {p.media_type === "video" ? (
                        <video src={p.media_url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={p.media_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.business_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.duration}h ·{" "}
                        {formatMoney(p.amount / 100, p.currency as PromoteCurrency)}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={() => setStep("details")}>
              New Promotion
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between px-3 py-2.5">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right truncate max-w-[60%]">{value}</span>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    PENDING: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    APPROVED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    LIVE: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    REJECTED: "bg-destructive/15 text-destructive",
    EXPIRED: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${
        map[status] || "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
};

export default PromoteModal;
