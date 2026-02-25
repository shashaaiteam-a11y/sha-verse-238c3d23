import { Home, Video, MessageSquare, BookOpen, Users, User } from "lucide-react";
import { NavLink } from "./NavLink";
import { useLocation } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Video, label: "Movion", path: "/movion" },
  { icon: MessageSquare, label: "Nova", path: "/novachat" },
  { icon: BookOpen, label: "Books", path: "/bookshelf" },
  { icon: Users, label: "Groups", path: "/groups" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  const location = useLocation();
  
  // Hide bottom nav on auth page and video watch page
  if (location.pathname === '/auth' || location.pathname.includes('/watch/')) {
    return null;
  }

  return (
    <nav className="bottom-nav shadow-lg">
      <div className="grid grid-cols-6 h-14 xs:h-16 max-w-screen-xl mx-auto px-1">
        {navItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors relative group touch-target ripple min-w-0"
            activeClassName="text-primary"
          >
            {({ isActive }) => (
              <>
                <div className={`p-1 xs:p-1.5 rounded-full transition-all duration-200 ${isActive ? 'bg-primary/10' : ''}`}>
                  <Icon className={`w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 transition-transform ${isActive ? 'scale-110' : ''}`} />
                </div>
                <span className="text-[9px] xs:text-[10px] sm:text-xs font-medium truncate w-full text-center px-0.5">{label}</span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 xs:w-8 sm:w-12 h-0.5 bg-gradient-primary rounded-b-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};