import { useNavigate } from "react-router-dom";
import { Sparkles, Clock, ArrowLeft, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo as MovionLogo } from "@/movion/components/Logo";

const MovionComingSoon = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <MovionLogo size={96} />
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center animate-pulse shadow-lg">
            <Sparkles className="w-4 h-4 text-yellow-900" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Movion Coming Soon</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            We're making Movion even better! Coming back very soon with amazing new features.
          </p>
        </div>

        <div className="bg-muted/50 rounded-2xl p-5 space-y-3 text-left">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-sm font-medium">Launching very soon</span>
          </div>
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-sm font-medium">Best-in-class video experience</span>
          </div>
          <div className="flex items-center gap-3">
            <Film className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-sm font-medium">Shorts, channels & more</span>
          </div>
        </div>

        <Button onClick={() => navigate("/")} size="lg" className="w-full gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>

        <p className="text-xs text-muted-foreground">Thanks for your patience 💙</p>
      </div>
    </div>
  );
};

export default MovionComingSoon;
