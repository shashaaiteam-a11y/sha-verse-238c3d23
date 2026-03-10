// Motion Header - Unique header design for Motion module
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Menu, 
  Plus, 
  Bell,
  Zap,
  X,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface MotionHeaderProps {
  onSearch?: (query: string) => void;
  onMenuClick?: () => void;
  showBack?: boolean;
  title?: string;
}

export const MotionHeader = ({ onSearch, onMenuClick, showBack, title }: MotionHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50">
      <div className="flex items-center h-14 px-3 md:px-6 gap-2">
        {/* Left section */}
        <div className="flex items-center gap-2">
          {showBack ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full md:mr-2"
              onClick={onMenuClick}
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          
          {/* Logo */}
          {!searchOpen && (
            <div 
              className="flex items-center gap-1.5 cursor-pointer"
              onClick={() => navigate('/motion')}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <Zap className="w-5 h-5 text-primary-foreground fill-current" />
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Motion
              </span>
            </div>
          )}
        </div>

        {/* Search - Desktop */}
        {!searchOpen && (
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <form onSubmit={handleSearch} className="w-full relative">
              <Input
                type="text"
                placeholder="Search motions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 h-10 rounded-full bg-secondary/50 border-border/50 focus:bg-background focus:ring-2 focus:ring-primary/30"
              />
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </form>
          </div>
        )}

        {/* Mobile search expanded */}
        {searchOpen && (
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 md:hidden">
            <Input
              type="text"
              placeholder="Search motions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-10 rounded-full"
              autoFocus
            />
            <Button 
              variant="ghost" 
              size="icon" 
              type="button"
              className="rounded-full"
              onClick={() => setSearchOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </form>
        )}

        {/* Title for detail pages */}
        {title && !searchOpen && (
          <h1 className="flex-1 font-semibold text-base truncate md:hidden">
            {title}
          </h1>
        )}

        {/* Right section */}
        {!searchOpen && (
          <div className="flex items-center gap-1 md:gap-2 ml-auto">
            {/* Mobile search button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full md:hidden"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="w-5 h-5" />
            </Button>

            {/* Upload button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={() => navigate('/motion/upload')}
            >
              <Plus className="w-5 h-5" />
            </Button>

            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full relative"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent" />
            </Button>

            {/* Profile */}
            {user ? (
              <Avatar 
                className="h-8 w-8 cursor-pointer ring-2 ring-background hover:ring-primary transition-all"
                onClick={() => navigate('/motion/dashboard')}
              >
                <AvatarImage src={undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-bold">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Button 
                size="sm" 
                className="rounded-full"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
