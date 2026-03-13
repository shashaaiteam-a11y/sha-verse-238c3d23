import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  Zap,
  Link2,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useNavigate } from "react-router-dom";

interface MovionSidebarProps {
  isOpen: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose?: () => void;
}

// STRICT: Only HOME, PULSE, LINKS-UP, ETC in main menu
const mainMenuItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "pulse", label: "Pulse", icon: Zap },
  { id: "links-up", label: "Links-up", icon: Link2 },
  { id: "etc", label: "Etc", icon: MoreHorizontal },
];

export const MovionSidebar = ({ isOpen, activeTab, onTabChange, onClose }: MovionSidebarProps) => {
  const { subscriptions } = useSubscriptions();
  const navigate = useNavigate();

  const handleItemClick = (id: string) => {
    onTabChange(id);
    onClose?.();
  };

  const handleChannelClick = (channelId: string) => {
    navigate(`/movion/channel/${channelId}`);
    onClose?.();
  };

  // Mini sidebar (collapsed) - Desktop only
  if (!isOpen) {
    return (
      <aside className="hidden md:flex flex-col items-center w-[72px] py-2 border-r border-border/50 bg-background fixed left-0 top-14 bottom-0 z-30">
        {mainMenuItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              "flex flex-col items-center justify-center h-[74px] w-full rounded-none gap-1 transition-colors",
              activeTab === item.id && "bg-primary/10 text-primary"
            )}
            onClick={() => handleItemClick(item.id)}
          >
            <item.icon className={cn(
              "h-5 w-5", 
              item.id === 'pulse' && "text-accent",
              item.id === 'links-up' && "text-primary"
            )} />
            <span className="text-[10px]">{item.label}</span>
          </Button>
        ))}
      </aside>
    );
  }

  // Full sidebar (expanded)
  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />
      
      <aside className={cn(
        "fixed left-0 top-14 bottom-0 w-[240px] bg-background border-r border-border/50 z-50",
        "transition-transform duration-200",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <ScrollArea className="h-full">
          <div className="p-3">
            {/* Main Menu - STRICT: HOME, PULSE, LINKS-UP, ETC only */}
            <div className="space-y-1">
              {mainMenuItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-4 h-10 px-3 rounded-lg transition-all",
                    activeTab === item.id && "bg-primary/10 text-primary font-semibold"
                  )}
                  onClick={() => handleItemClick(item.id)}
                >
                  <item.icon className={cn(
                    "h-5 w-5",
                    item.id === 'pulse' && "text-accent",
                    item.id === 'links-up' && "text-primary"
                  )} />
                  <span className="text-sm">{item.label}</span>
                </Button>
              ))}
            </div>

            {/* Links-up (Subscriptions) - Show followed channels */}
            {subscriptions && subscriptions.length > 0 && (
              <>
                <Separator className="my-3 bg-border/50" />
                <div className="mb-2 px-3">
                  <span className="text-sm font-semibold text-primary">Links-up</span>
                </div>
                <div className="space-y-1">
                  {subscriptions.slice(0, 7).map((sub) => (
                    sub.channels && (
                      <Button
                        key={sub.id}
                        variant="ghost"
                        className="w-full justify-start gap-3 h-10 px-3 rounded-lg hover:bg-primary/5"
                        onClick={() => handleChannelClick(sub.channels!.id)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={sub.channels.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-accent text-primary-foreground">
                            {sub.channels.name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">{sub.channels.name}</span>
                      </Button>
                    )
                  ))}
                  {subscriptions.length > 7 && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-4 h-10 px-3 rounded-lg"
                      onClick={() => handleItemClick("links-up")}
                    >
                      <ChevronRight className="h-5 w-5" />
                      <span className="text-sm">Show all ({subscriptions.length})</span>
                    </Button>
                  )}
                </div>
              </>
            )}

            <div className="h-20" />
          </div>
        </ScrollArea>
      </aside>
    </>
  );
};
