// Movion Layout Component
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Menu, Search, Bell, Home, Zap, Clapperboard, 
  Library as LibraryIcon, Plus, X, User, Settings,
  Loader2
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useMovionStore } from '../store';
import Logo from './Logo';
import { ToastContainer } from './Toast';
import { useMyChannel } from '@/hooks/useChannels';
import { useAuth } from '@/contexts/AuthContext';

interface MovionLayoutProps {
  children: React.ReactNode;
}

export const MovionLayout: React.FC<MovionLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { searchQuery, setSearchQuery, addToSearchHistory } = useMovionStore();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const location = useLocation();
  const navigate = useNavigate();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { channel: myChannel, isLoading: channelLoading } = useMyChannel();
  
  const userAvatar = useMemo(() => 
    myChannel?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'default'}`,
    [myChannel?.avatar_url, user?.id]
  );
  const userName = useMemo(() => 
    myChannel?.name || user?.email?.split('@')[0] || 'User',
    [myChannel?.name, user?.email]
  );
  const userHandle = useMemo(() => 
    myChannel?.username ? `@${myChannel.username}` : '@user',
    [myChannel?.username]
  );

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      addToSearchHistory(localSearch);
      setSearchQuery(localSearch);
    }
  };

  const basePath = '/movion';
  const navItems = [
    { name: 'Home', icon: <Home size={22} />, path: basePath },
    { name: 'Pulse', icon: <Zap size={22} />, path: `${basePath}/shorts` },
    { name: 'Subscriptions', icon: <Clapperboard size={22} />, path: `${basePath}/subscriptions` },
    { name: 'Library', icon: <LibraryIcon size={22} />, path: `${basePath}/library` },
  ];

  const isActiveLink = (path: string) => {
    if (path === basePath) return location.pathname === basePath;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-16 sticky top-0 bg-card z-[60] border-b border-border">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (window.innerWidth >= 1024) {
                setIsSidebarOpen(!isSidebarOpen);
              } else {
                setIsMobileMenuOpen(true);
              }
            }} 
            className="p-2 hover:bg-muted rounded-full transition-all active:scale-90"
          >
            <Menu size={24} className="text-foreground" />
          </button>
          <Link to={basePath} className="flex items-center gap-2 group" onClick={() => setSearchQuery('')}>
            <Logo size={32} />
            <span className="text-xl font-black tracking-tighter uppercase text-foreground hidden sm:block">MOVION</span>
          </Link>
        </div>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-[720px] items-center gap-2 px-8">
          <div className="flex flex-1 items-center bg-background border border-border rounded-full overflow-hidden focus-within:border-primary h-10">
            <input 
              type="text" 
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search MOVION" 
              className="w-full bg-transparent px-5 py-2 outline-none text-foreground text-[15px] placeholder:text-muted-foreground"
            />
            <button type="submit" className="bg-muted px-6 h-full border-l border-border hover:bg-muted/80">
              <Search size={20} className="text-muted-foreground" />
            </button>
          </div>
        </form>

        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => navigate(`${basePath}/upload`)} className="hidden sm:flex items-center gap-2 px-4 h-10 hover:bg-muted rounded-full border border-border">
            <Plus size={20} />
            <span className="font-bold text-sm">Create</span>
          </button>
          <button className="p-2 hover:bg-muted rounded-full">
            <Bell size={20} />
          </button>
          <div ref={profileMenuRef} className="relative">
            <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="w-10 h-10 rounded-full overflow-hidden border border-border">
              {channelLoading ? (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
              )}
            </button>
            {isProfileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-[280px] bg-card border border-border rounded-xl shadow-lg z-[100] py-2">
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-bold text-foreground">{userName}</p>
                  <p className="text-sm text-muted-foreground">{userHandle}</p>
                </div>
                {myChannel ? (
                  <Link to={`${basePath}/channel/${myChannel.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-foreground">
                    <User size={20} /> Your channel
                  </Link>
                ) : (
                  <Link to={`${basePath}/upload`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-foreground">
                    <Plus size={20} /> Create channel
                  </Link>
                )}
                <Link to={`${basePath}/studio`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-foreground">
                  <Settings size={20} /> Studio
                </Link>
                {!user && (
                  <Link to="/auth" className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-primary">
                    <User size={20} /> Sign In
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-64 px-3' : 'w-20 px-1'} hidden lg:flex flex-col bg-card transition-all duration-300`}>
          <div className="flex flex-col gap-1 py-2">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`flex items-center gap-5 p-3 rounded-xl transition-all ${isActiveLink(item.path) ? 'bg-muted font-bold' : 'hover:bg-muted'} ${!isSidebarOpen ? 'flex-col gap-1 px-1 py-4' : ''}`}
              >
                <div className={isActiveLink(item.path) ? (item.name === 'Pulse' ? 'text-accent' : 'text-primary') : 'text-foreground'}>{item.icon}</div>
                <span className={`text-[13px] ${!isSidebarOpen ? 'text-[10px]' : ''}`}>{item.name}</span>
              </Link>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background pb-20 lg:pb-0">
          {children}
        </main>
        
        <ToastContainer />

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card/98 backdrop-blur-xl border-t border-border flex items-center justify-around z-50 lg:hidden safe-area-bottom">
          {navItems.map((item) => {
            const active = isActiveLink(item.path);
            return (
              <Link key={item.path} to={item.path} className="flex flex-col items-center gap-0.5 flex-1 py-2">
                <div className={`p-1 rounded-lg ${active ? 'bg-muted' : ''}`}>
                  <div className={active ? (item.name === 'Pulse' ? 'text-accent' : 'text-primary') : 'text-muted-foreground'}>{item.icon}</div>
                </div>
                <span className={`text-[9px] ${active ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{item.name}</span>
              </Link>
            );
          })}
          <button 
            onClick={() => navigate(`${basePath}/upload`)} 
            className="flex flex-col items-center gap-0.5 flex-1 py-2"
          >
            <div className="p-1.5 bg-gradient-to-r from-primary to-accent rounded-xl">
              <Plus size={20} className="text-primary-foreground" />
            </div>
            <span className="text-[9px] font-bold text-foreground">Create</span>
          </button>
        </nav>

        {/* Mobile Drawer Menu */}
        {isMobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-[80] lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="fixed left-0 top-0 bottom-0 w-72 bg-card z-[90] lg:hidden shadow-2xl">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <Link to={basePath} className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                  <Logo size={28} />
                  <span className="text-lg font-black tracking-tighter uppercase text-foreground">MOVION</span>
                </Link>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-muted rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-2">
                {navItems.map((item) => (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                      isActiveLink(item.path) ? 'bg-muted font-bold' : 'hover:bg-muted'
                    }`}
                  >
                    <div className={isActiveLink(item.path) ? (item.name === 'Pulse' ? 'text-accent' : 'text-primary') : 'text-foreground'}>
                      {item.icon}
                    </div>
                    <span>{item.name}</span>
                  </Link>
                ))}
                
                <div className="my-2 border-t border-border" />
                
                <Link 
                  to={`${basePath}/upload`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted"
                >
                  <Plus size={22} />
                  <span>Create Video</span>
                </Link>
                
                {myChannel ? (
                  <Link 
                    to={`${basePath}/channel/${myChannel.id}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted"
                  >
                    <User size={22} />
                    <span>Your Channel</span>
                  </Link>
                ) : (
                  <Link 
                    to={`${basePath}/upload`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted"
                  >
                    <Plus size={22} />
                    <span>Create Channel</span>
                  </Link>
                )}
                
                <Link 
                  to={`${basePath}/studio`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted"
                >
                  <Settings size={22} />
                  <span>Studio</span>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MovionLayout;
