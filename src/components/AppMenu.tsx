import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/useProfile";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { useFriends } from "@/hooks/useFriends";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Menu,
  Home,
  Video,
  MessageSquare,
  BookOpen,
  Users,
  User,
  Bookmark,
  Settings,
  Moon,
  Sun,
  LogOut,
  Bell,
  UserPlus,
  HelpCircle,
  Shield,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";

const AppMenu = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { savedPosts } = useSavedPosts();
  const { pendingRequests } = useFriends();
  const { unreadCount } = useNotifications();

  const savedCount = savedPosts?.length || 0;
  const pendingCount = pendingRequests?.length || 0;
  const isDarkMode = (resolvedTheme ?? theme) === "dark";

  const mainModules = [
    { icon: Home, label: "Home", path: "/", color: "text-blue-500" },
    { icon: Video, label: "Movion", path: "/movion", color: "text-red-500" },
    { icon: MessageSquare, label: "NovaChat", path: "/novachat", color: "text-purple-500" },
    { icon: BookOpen, label: "Bookshelf", path: "/bookshelf", color: "text-orange-500" },
    { icon: Users, label: "Groups", path: "/groups", color: "text-green-500" },
    { icon: User, label: "Profile", path: "/profile", color: "text-primary" },
  ];

  const shortcuts = [
    { icon: Bookmark, label: "Saved Posts", path: "/saved", badge: savedCount },
    { icon: UserPlus, label: "Friends", path: "/friends", badge: pendingCount },
    { icon: Bell, label: "Notifications", path: "/notifications", badge: unreadCount },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[300px] sm:w-[350px] p-0 overflow-y-auto [&>button.absolute]:top-[calc(1rem+env(safe-area-inset-top,0px))]"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>

        {/* Profile Section */}
        <div 
          className="mx-4 p-3 rounded-xl bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors"
          onClick={() => handleNavigate("/profile")}
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold">
                {profile?.display_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{profile?.display_name || "User"}</h3>
              <p className="text-xs text-muted-foreground">View your profile</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        <Separator className="my-3" />

        {/* Main Modules */}
        <div className="px-4 space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Modules
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {mainModules.map(({ icon: Icon, label, path, color }) => (
              <button
                key={path}
                onClick={() => handleNavigate(path)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary/30 hover:bg-secondary transition-colors"
              >
                <div className={`p-2 rounded-full bg-background ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <Separator className="my-3" />

        {/* Shortcuts */}
        <div className="px-4 space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Shortcuts
          </h4>
          {shortcuts.map(({ icon: Icon, label, path, badge }) => (
            <button
              key={path}
              onClick={() => handleNavigate(path)}
              className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-secondary transition-colors"
            >
              <div className="relative p-2 rounded-full bg-secondary">
                <Icon className="w-4 h-4" />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold px-1">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium flex-1 text-left">{label}</span>
              {badge > 0 && (
                <span className="text-xs text-muted-foreground">{badge}</span>
              )}
            </button>
          ))}
        </div>

        <Separator className="my-3" />

        {/* Settings & Actions */}
        <div className="px-4 space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Settings
          </h4>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setTheme(isDarkMode ? "light" : "dark")}
            className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-secondary">
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </div>
              <span className="text-sm font-medium">Dark Mode</span>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors ${isDarkMode ? "bg-primary" : "bg-muted"}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${isDarkMode ? "translate-x-4.5 ml-0.5" : "translate-x-0.5"}`} />
            </div>
          </button>

          <button
            onClick={() => handleNavigate("/settings")}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="p-2 rounded-full bg-secondary">
              <Settings className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Settings & Privacy</span>
          </button>

          <button
            onClick={() => handleNavigate("/help")}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="p-2 rounded-full bg-secondary">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Help & Support</span>
          </button>

          <button
            onClick={() => handleNavigate("/privacy-center")}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="p-2 rounded-full bg-secondary">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Privacy Center</span>
          </button>
        </div>

        <Separator className="my-3" />

        {/* Logout */}
        <div className="px-4 pb-8 space-y-2">
          {user?.email && (
            <p className="text-xs text-muted-foreground px-1 break-all">
              {user.email}
            </p>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"
          >
            <div className="p-2 rounded-full bg-destructive/10">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AppMenu;
