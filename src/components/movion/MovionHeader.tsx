import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, Bell, Menu, X, Mic, Video, Cast,
  User, History, Bookmark, Clock, ListVideo, Settings, LogOut, ArrowLeft
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useMyChannel } from "@/hooks/useChannels";
import { useNavigate } from "react-router-dom";
import { UploadEntryDialog } from "./UploadEntryDialog";
import { CreateChannelDialog } from "./CreateChannelDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface MovionHeaderProps {
  onSearch?: (query: string) => void;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  onVoiceSearch?: () => void;
}

export const MovionHeader = ({
  onSearch,
  onMenuClick,
  showMenuButton = true,
  onVoiceSearch
}: MovionHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { user, signOut } = useAuth();
  const { profile } = useProfile(user?.id);
  const { channel } = useMyChannel();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch?.(searchQuery);
    }
  };

  const handleVoiceSearch = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Voice search is not supported in your browser");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Listening...", { duration: 2000 });
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      onSearch?.(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Could not recognize speech");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border/50">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left: Back + Menu + Logo */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => navigate(-1)}
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {showMenuButton && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hidden md:flex"
              onClick={onMenuClick}
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div
            onClick={() => navigate('/movion')}
            className="flex items-center cursor-pointer group"
          >
            <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground w-8 h-6 flex items-center justify-center rounded-lg mr-1 group-hover:scale-105 transition-transform">
              <span className="text-sm font-bold">M</span>
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Movion
            </span>
          </div>
        </div>

        {/* Center: Search */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-8">
          <div className="flex w-full">
            <Input
              type="search"
              placeholder="Search videos, channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-l-full rounded-r-none border-r-0 focus-visible:ring-1 focus-visible:ring-primary h-10 pl-4 bg-muted/50"
            />
            <Button
              type="submit"
              variant="secondary"
              className="rounded-l-none rounded-r-full px-6 h-10 border border-l-0 border-input bg-muted/50 hover:bg-muted"
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className={`rounded-full ml-2 h-10 w-10 ${isListening ? 'bg-destructive text-destructive-foreground animate-pulse' : ''}`}
            onClick={handleVoiceSearch}
          >
            <Mic className="w-5 h-5" />
          </Button>
        </form>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-full"
            onClick={() => setShowSearch(!showSearch)}
          >
            {showSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </Button>

          {/* Cast */}
          <Button variant="ghost" size="icon" className="rounded-full hidden sm:flex">
            <Cast className="w-5 h-5" />
          </Button>

          {/* Upload - Two-button entry: Pulse / Normal */}
          <UploadEntryDialog />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="rounded-full relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 bg-accent text-accent-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
              3
            </span>
          </Button>

          {/* Profile / Channel Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {channel ? (
                <Avatar className="h-8 w-8 cursor-pointer ml-1 ring-2 ring-transparent hover:ring-primary/50 transition-all">
                  <AvatarImage src={channel.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm">
                    {channel.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-8 w-8 cursor-pointer ml-1 ring-2 ring-transparent hover:ring-primary/50 transition-all">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm">
                    {profile?.display_name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {channel ? (
                <>
                  <DropdownMenuItem onClick={() => navigate(`/movion/channel/${channel.id}`)}>
                    <User className="w-4 h-4 mr-2" />
                    View Channel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/movion/studio')}>
                    <Video className="w-4 h-4 mr-2" />
                    Creator Studio
                  </DropdownMenuItem>
                </>
              ) : (
                <CreateChannelDialog
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Video className="w-4 h-4 mr-2" />
                      Create Channel
                    </DropdownMenuItem>
                  }
                />
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/movion?tab=history')}>
                <History className="w-4 h-4 mr-2" />
                History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/movion?tab=watch-later')}>
                <Clock className="w-4 h-4 mr-2" />
                Later
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/movion?tab=saved')}>
                <Bookmark className="w-4 h-4 mr-2" />
                Saved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/movion?tab=playlists')}>
                <ListVideo className="w-4 h-4 mr-2" />
                Playlists
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {showSearch && (
        <form onSubmit={handleSearch} className="md:hidden px-4 pb-3 flex gap-2">
          <div className="flex flex-1">
            <Input
              type="search"
              placeholder="Search videos, channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-l-full rounded-r-none border-r-0 h-10 bg-muted/50"
              autoFocus
            />
            <Button type="submit" variant="secondary" className="rounded-l-none rounded-r-full h-10 bg-muted/50">
              <Search className="w-4 h-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className={`rounded-full h-10 w-10 ${isListening ? 'bg-destructive text-destructive-foreground animate-pulse' : ''}`}
            onClick={handleVoiceSearch}
          >
            <Mic className="w-4 h-4" />
          </Button>
        </form>
      )}
    </header>
  );
};
