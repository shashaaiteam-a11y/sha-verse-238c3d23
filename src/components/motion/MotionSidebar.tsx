// Motion Sidebar - Unique navigation design
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Home, 
  Zap, 
  Compass, 
  Users, 
  Clock, 
  Bookmark,
  History,
  TrendingUp,
  Gamepad2,
  Music,
  Newspaper,
  GraduationCap,
  Shirt,
  Radio,
  LayoutDashboard,
  Settings,
  HelpCircle,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MotionSidebarProps {
  isOpen: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose: () => void;
}

const mainNavItems = [
  { id: 'quick', label: 'Quick Motions', icon: Zap },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'following', label: 'Following', icon: Users },
];

const libraryItems = [
  { id: 'history', label: 'History', icon: History },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'watch-later', label: 'Watch Later', icon: Clock },
];

const exploreItems = [
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'education', label: 'Learning', icon: GraduationCap },
  { id: 'lifestyle', label: 'Lifestyle', icon: Shirt },
  { id: 'live', label: 'Live', icon: Radio },
];

const creatorItems = [
  { id: 'dashboard', label: 'Creator Panel', icon: LayoutDashboard },
];

const settingsItems = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help', icon: HelpCircle },
];

export const MotionSidebar = ({ isOpen, activeTab, onTabChange, onClose }: MotionSidebarProps) => {
  const NavButton = ({ id, label, icon: Icon }: { id: string; label: string; icon: React.ElementType }) => (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start gap-3 h-11 rounded-xl transition-all",
        activeTab === id 
          ? "bg-primary/10 text-primary hover:bg-primary/15 font-medium" 
          : "hover:bg-secondary/80"
      )}
      onClick={() => {
        onTabChange(id);
        onClose();
      }}
    >
      <Icon className={cn(
        "w-5 h-5 flex-shrink-0",
        activeTab === id && "text-primary"
      )} />
      <span className="truncate">{label}</span>
    </Button>
  );

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-14 bottom-0 z-50 bg-background border-r border-border/50 transition-all duration-300",
        isOpen ? "w-64 translate-x-0" : "w-[72px] -translate-x-full md:translate-x-0"
      )}>
        <ScrollArea className="h-full py-3">
          <div className="px-3 space-y-1">
            {/* Close button for mobile */}
            <div className="flex items-center justify-between mb-2 md:hidden">
              <span className="text-sm font-semibold text-muted-foreground px-3">Menu</span>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Main Navigation */}
            {mainNavItems.map((item) => (
              <NavButton key={item.id} {...item} />
            ))}

            <Separator className="my-3" />

            {/* Library */}
            {isOpen && (
              <p className="text-xs font-semibold text-muted-foreground px-3 py-2">Your Library</p>
            )}
            {libraryItems.map((item) => (
              <NavButton key={item.id} {...item} />
            ))}

            <Separator className="my-3" />

            {/* Explore Categories */}
            {isOpen && (
              <p className="text-xs font-semibold text-muted-foreground px-3 py-2">Explore</p>
            )}
            {exploreItems.map((item) => (
              <NavButton key={item.id} {...item} />
            ))}

            <Separator className="my-3" />

            {/* Creator */}
            {creatorItems.map((item) => (
              <NavButton key={item.id} {...item} />
            ))}

            <Separator className="my-3" />

            {/* Settings */}
            {settingsItems.map((item) => (
              <NavButton key={item.id} {...item} />
            ))}

            {/* Footer */}
            {isOpen && (
              <div className="px-3 py-4 mt-4">
                <p className="text-[10px] text-muted-foreground">
                  © 2024 Sha-Verse Motion
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  All rights reserved
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>
    </>
  );
};
