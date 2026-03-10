import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, Zap, Link2, Clapperboard, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface MovionBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// STRICT: Only HOME, PULSE, LINKS-UP, PROFILE, STUDIO
const bottomNavItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "pulse", label: "Pulse", icon: Zap },
  { id: "links-up", label: "Links-up", icon: Link2 },
  { id: "profile", label: "Profile", icon: User },
  { id: "studio", label: "Studio", icon: Clapperboard },
];

export const MovionBottomNav = ({ activeTab, onTabChange }: MovionBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on the library page
  const isLibraryPage = location.pathname.includes('/movion/library');

  const handleClick = (id: string) => {
    if (id === 'studio') {
      navigate('/movion/studio');
    } else if (id === 'profile') {
      // Navigate to library with history tab as default
      navigate('/movion/library?tab=history');
    } else {
      onTabChange(id);
    }
  };

  const isActive = (id: string) => {
    if (id === 'profile' && isLibraryPage) return true;
    return activeTab === id && !isLibraryPage;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/50 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {bottomNavItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              "flex flex-col items-center justify-center h-full flex-1 rounded-none gap-0.5 transition-all",
              isActive(item.id) && "text-primary bg-primary/5"
            )}
            onClick={() => handleClick(item.id)}
          >
            <item.icon className={cn(
              "h-5 w-5",
              item.id === 'pulse' && isActive(item.id) && "text-accent",
              item.id === 'links-up' && isActive(item.id) && "text-primary",
              item.id === 'profile' && isActive(item.id) && "text-primary",
              item.id === 'studio' && "text-primary"
            )} />
            <span className={cn(
              "text-[10px]",
              isActive(item.id) ? "font-semibold" : "font-normal"
            )}>
              {item.label}
            </span>
          </Button>
        ))}
      </div>
    </nav>
  );
};
