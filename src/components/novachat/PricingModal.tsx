import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPro?: boolean;
}

const FREE_FEATURES = [
  '10 messages per day',
  'Gemini 2.5 Flash model',
  'Basic chat history',
  'Image attachments',
  'Light & Dark themes',
];

const PRO_FEATURES = [
  'Unlimited messages',
  'All premium models (GPT-5, Gemini 2.5 Pro)',
  'Priority response speed',
  'Advanced reasoning mode',
  'No ads',
  'Voice input & output',
  'Priority support',
];

const PricingModal = ({ open, onOpenChange, isPro = false }: PricingModalProps) => {
  const handleUpgrade = () => {
    toast.info('Stripe checkout coming soon!', {
      description: 'Payment integration will be enabled in the next step.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-2">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-bold text-center">
            Upgrade to NovaChat Pro
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Unlock unlimited AI conversations and premium models
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Free Tier */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Free</h3>
            </div>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground text-sm"> / forever</span>
            </div>
            <ul className="space-y-2.5 flex-1 mb-4">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">{f}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full"
              disabled
            >
              {isPro ? 'Downgrade' : 'Current Plan'}
            </Button>
          </div>

          {/* Pro Tier */}
          <div
            className={cn(
              "rounded-2xl border-2 p-6 flex flex-col relative overflow-hidden",
              "border-primary bg-gradient-to-br from-primary/5 via-card to-card"
            )}
          >
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              Most Popular
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Pro</h3>
            </div>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold">$9.99</span>
              <span className="text-muted-foreground text-sm"> / month</span>
            </div>
            <ul className="space-y-2.5 flex-1 mb-4">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={handleUpgrade}
              disabled={isPro}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 transition-opacity"
            >
              {isPro ? 'Active' : 'Upgrade Now'}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Cancel anytime. Secure payment processing.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;
