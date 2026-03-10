import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyChannel } from "@/hooks/useChannels";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  Bookmark,
  ListVideo,
  Clock,
  ThumbsUp,
  BarChart3,
  Plus,
  ChevronRight,
  Flame,
  Music2,
  Gamepad2,
  Newspaper,
  Trophy,
  Lightbulb,
} from "lucide-react";

interface EtcMenuProps {
  onTabChange: (tab: string) => void;
  onClose?: () => void;
}

// Profile Section Items (moved from sidebar)
const profileItems = [
  { id: "history", label: "History", icon: History },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "playlists", label: "Playlists", icon: ListVideo },
  { id: "watch-later", label: "Watch Later", icon: Clock },
  { id: "liked", label: "Liked Videos", icon: ThumbsUp },
];

// Explore Categories
const exploreItems = [
  { id: "trending", label: "Trending", icon: Flame },
  { id: "music", label: "Music", icon: Music2 },
  { id: "gaming", label: "Gaming", icon: Gamepad2 },
  { id: "news", label: "News", icon: Newspaper },
  { id: "sports", label: "Sports", icon: Trophy },
  { id: "learning", label: "Learning", icon: Lightbulb },
];

export const EtcMenu = ({ onTabChange, onClose }: EtcMenuProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { channel } = useMyChannel();

  const handleItemClick = (id: string) => {
    onTabChange(id);
    onClose?.();
  };

  const handleStudioClick = () => {
    navigate('/movion/studio');
    onClose?.();
  };

  const handleProfileClick = () => {
    if (user) {
      navigate(`/profile/${user.id}`);
    }
    onClose?.();
  };

  return (
    <ScrollArea className="h-[calc(100vh-120px)]">
      <div className="p-4 space-y-6">
        {/* Profile Section */}
        {user && (
          <div className="space-y-3">
            <div 
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={handleProfileClick}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  {profile?.display_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{profile?.display_name || 'User'}</p>
                <p className="text-sm text-muted-foreground">@{profile?.username}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Channel / Studio Access */}
            {channel ? (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3"
                onClick={handleStudioClick}
              >
                <BarChart3 className="h-5 w-5 text-primary" />
                <span>Creator Studio</span>
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3"
                onClick={() => navigate('/movion?createChannel=true')}
              >
                <Plus className="h-5 w-5" />
                <span>Create Channel</span>
              </Button>
            )}
          </div>
        )}

        <Separator className="bg-border/50" />

        {/* Your Library Section */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">Your Library</h3>
          <div className="space-y-1">
            {profileItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className="w-full justify-start gap-4 h-11 px-3 rounded-lg"
                onClick={() => handleItemClick(item.id)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Button>
            ))}
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Explore Section */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">Explore</h3>
          <div className="grid grid-cols-2 gap-2">
            {exploreItems.map((item) => (
              <Button
                key={item.id}
                variant="outline"
                className="justify-start gap-2 h-11 px-3"
                onClick={() => handleItemClick(item.id)}
              >
                <item.icon className={`h-4 w-4 ${item.id === 'trending' ? 'text-orange-500' : ''}`} />
                <span className="text-sm">{item.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
