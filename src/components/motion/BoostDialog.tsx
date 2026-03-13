// Boost Dialog - Unique monetization UI for sending boosts
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Flame, Zap, Star, Send } from "lucide-react";
import { useSendBoost } from "@/hooks/useMotionBoosts";
import { BOOST_TIERS } from "./types";
import { cn } from "@/lib/utils";

interface BoostDialogProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string | null;
  motionId?: string;
  trigger?: React.ReactNode;
}

const boostOptions = [
  { 
    tier: 'spark' as const, 
    icon: Sparkles, 
    label: 'Spark', 
    amount: 2900, 
    display: '₹29',
    color: 'from-cyan-500 to-cyan-400',
    description: 'Show your appreciation'
  },
  { 
    tier: 'flame' as const, 
    icon: Flame, 
    label: 'Flame', 
    amount: 5900, 
    display: '₹59',
    color: 'from-orange-500 to-yellow-400',
    description: 'Stand out in the crowd'
  },
  { 
    tier: 'blaze' as const, 
    icon: Zap, 
    label: 'Blaze', 
    amount: 9900, 
    display: '₹99',
    color: 'from-purple-500 to-pink-400',
    description: 'Maximum impact'
  },
  { 
    tier: 'supernova' as const, 
    icon: Star, 
    label: 'Supernova', 
    amount: 0, 
    display: 'Custom',
    color: 'from-yellow-400 to-amber-500',
    description: 'Go big your way'
  },
];

export const BoostDialog = ({ 
  creatorId, 
  creatorName, 
  creatorAvatar, 
  motionId,
  trigger 
}: BoostDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<typeof boostOptions[0] | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  
  const sendBoost = useSendBoost();

  const handleSendBoost = () => {
    if (!selectedTier) return;

    const amountCents = selectedTier.tier === 'supernova' 
      ? parseInt(customAmount) * 100 
      : selectedTier.amount;

    if (amountCents <= 0) return;

    sendBoost.mutate({
      motionId,
      creatorId,
      amountCents,
      message: message.trim() || undefined,
      boostTier: selectedTier.tier,
    }, {
      onSuccess: () => {
        setOpen(false);
        setSelectedTier(null);
        setMessage("");
        setCustomAmount("");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full gap-2 border-accent/50 hover:bg-accent/10 hover:border-accent"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            Boost
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-background p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="w-6 h-6 text-accent" />
                <span className="text-xl font-bold">Send a Boost</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {/* Creator info */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <Avatar className="h-12 w-12 ring-2 ring-primary/30">
              <AvatarImage src={creatorAvatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                {creatorName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{creatorName}</p>
              <p className="text-xs text-muted-foreground">will receive your boost</p>
            </div>
          </div>
        </div>

        {/* Boost options */}
        <div className="p-6 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {boostOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedTier?.tier === option.tier;
              
              return (
                <button
                  key={option.tier}
                  onClick={() => setSelectedTier(option)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 transition-all duration-200 text-left",
                    isSelected 
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
                      : "border-border hover:border-primary/50 hover:bg-secondary/50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center mb-2",
                    option.color
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-semibold text-sm">{option.label}</p>
                  <p className="text-lg font-bold">{option.display}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{option.description}</p>
                  
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom amount input */}
          {selectedTier?.tier === 'supernova' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Amount (₹)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                min="100"
                className="text-lg"
              />
            </div>
          )}

          {/* Message */}
          {selectedTier && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Add a message (optional)</label>
              <Textarea
                placeholder="Say something nice..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
                className="resize-none"
                rows={2}
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {message.length}/200
              </p>
            </div>
          )}

          {/* Send button */}
          <Button
            className="w-full h-12 rounded-xl gap-2 text-base"
            disabled={!selectedTier || sendBoost.isPending || (selectedTier.tier === 'supernova' && !customAmount)}
            onClick={handleSendBoost}
          >
            {sendBoost.isPending ? (
              "Sending..."
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Boost
              </>
            )}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            By sending a boost, you agree to our terms of service
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
