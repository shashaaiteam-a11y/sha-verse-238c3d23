// Movion Layout Component
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Menu, Search, Bell, Home, Zap, Clapperboard, 
  Library as LibraryIcon, Plus, X, User, Settings,
  Loader2, ArrowLeft
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useMovionStore } from '../store';
import Logo from './Logo';
import { ToastContainer } from './Toast';
import { useMyChannel } from '@/hooks/useChannels';
import { useAuth } from '@/contexts/AuthContext';
import { MovionNotificationPanel } from './MovionNotificationPanel';
import { MovionSearchOverlay } from './MovionSearchOverlay';
import { useMovionNotifications } from '@/hooks/useMovionNotifications';

interface MovionLayoutProps {
  children: React.ReactNode;
}

export const MovionLayout: React.FC<MovionLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { searchQuery, setSearchQuery, addToSearchHistory } = useMovionStore();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchFocused, setIsMobileSearchFocused] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const [mobileLocalSearch, setMobileLocalSearch] = useState('');
  const bellBtnRef = useRef<HTMLButtonElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useMovionNotifications();
  
  const { user } = useAuth();
  const { channel: myChannel, isLoading: channelLoading } = useMyChannel();

  // Count navigations inside Movion to know how far back to go to exit
  const movionNavCount = useRef(0);
  const prevPathname = useRef(location.pathname);
  useEffect(() => {
    if (prevPathname.current !== location.pathname) {
      movionNavCount.current += 1;
      prevPathname.current = location.pathname;
    }
  }, [location.pathname]);

  const handleBackToApp = () => {
    const stepsBack = movionNavCount.current;
    if (stepsBack > 0) {
      window.history.go(-(stepsBack));
    } else {
      navigate('/');
    }
  };
  
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
    setIsNotifOpen(false);
    setIsSearchFocused(false);
    setIsMobileSearchFocused(false);
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      addToSearchHistory(localSearch);
      setSearchQuery(localSearch);
      setIsSearchFocused(false);
      setIsMobileSearchFocused(false);
      // Navigate to home so search results are visible
      if (!location.pathname.endsWith('/movion') && location.pathname !== '/movion') {
        navigate('/movion');
      }
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
      <header className="flex items-center justify-between px-2 sm:px-4 h-16 sticky top-0 bg-card z-[60] border-b border-border">
        <div className="flex items-center gap-1 sm:gap-4">
          <button 
            onClick={handleBackToApp} 
            className="p-2 hover:bg-muted rounded-full transition-all active:scale-90"
            title="Go Back"
          >
            <ArrowLeft size={24} className="text-foreground" />
          </button>
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
          <div ref={searchContainerRef} className="relative flex flex-1 items-center bg-background border border-border rounded-full overflow-visible focus-within:border-primary h-10">
            <div className="flex flex-1 items-center bg-background border-0 rounded-full overflow-hidden h-10 w-full">
              <input 
                type="text" 
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsSearchFocused(false);
                }}
                placeholder="Search videos, channels, categories..." 
                className="w-full bg-transparent px-5 py-2 outline-none text-foreground text-[15px] placeholder:text-muted-foreground"
                autoComplete="off"
              />
              <button type="submit" className="bg-muted px-6 h-full border-l border-border hover:bg-muted/80 flex-shrink-0">
                <Search size={20} className="text-muted-foreground" />
              </button>
            </div>
            <MovionSearchOverlay
              query={localSearch}
              isVisible={isSearchFocused && localSearch.trim().length > 0}
              onClose={() => setIsSearchFocused(false)}
              onQueryChange={(q) => { setLocalSearch(q); setSearchQuery(q); }}
              containerRef={searchContainerRef}
            />
          </div>
        </form>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile-only Search icon */}
          <button
            onClick={() => { setMobileLocalSearch(localSearch); setShowMobileSearch(true); }}
            className="md:hidden p-2 hover:bg-muted rounded-full transition-all active:scale-90"
            title="Search"
          >
            <Search size={20} />
          </button>
          {/* Mobile-only Create icon */}
          <button
            onClick={() => navigate(`${basePath}/upload`)}
            className="sm:hidden p-2 hover:bg-muted rounded-full transition-all active:scale-90"
            title="Create"
          >
            <Plus size={20} />
          </button>
          {/* Desktop Create button */}
          <button onClick={() => navigate(`${basePath}/upload`)} className="hidden sm:flex items-center gap-2 px-4 h-10 hover:bg-muted rounded-full border border-border">
            <Plus size={20} />
            <span className="font-bold text-sm">Create</span>
          </button>
          {/* Notification Bell with real-time unread count */}
          <div className="relative">
            <button
              ref={bellBtnRef}
              onClick={() => setIsNotifOpen(prev => !prev)}
              className={`p-2 hover:bg-muted rounded-full relative transition-all ${
                isNotifOpen ? 'bg-muted' : ''
              }`}
              title="Notifications"
            >
              <Bell size={20} className={unreadCount > 0 ? 'text-primary' : ''} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-in zoom-in duration-200">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <MovionNotificationPanel
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
              triggerRef={bellBtnRef}
            />
          </div>
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

      {/* Mobile Full-Screen Search */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col md:hidden">
          <div className="flex items-center gap-2 px-3 h-14 border-b border-border bg-card">
            <button
              onClick={() => setShowMobileSearch(false)}
              className="p-2 hover:bg-muted rounded-full transition-all active:scale-90 flex-shrink-0"
            >
              <ArrowLeft size={22} />
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (mobileLocalSearch.trim()) {
                  addToSearchHistory(mobileLocalSearch);
                  setSearchQuery(mobileLocalSearch);
                  setLocalSearch(mobileLocalSearch);
                  setShowMobileSearch(false);
                  if (!location.pathname.endsWith('/movion') && location.pathname !== '/movion') {
                    navigate('/movion');
                  }
                }
              }}
              className="flex flex-1 items-center"
            >
              <div ref={mobileSearchContainerRef} className="relative flex flex-1 items-center bg-background border border-border rounded-full overflow-visible focus-within:border-primary h-10">
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  value={mobileLocalSearch}
                  onChange={(e) => { setMobileLocalSearch(e.target.value); setIsMobileSearchFocused(true); }}
                  onFocus={() => setIsMobileSearchFocused(true)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setShowMobileSearch(false); }}
                  placeholder="Search videos, channels..."
                  className="w-full bg-transparent px-4 py-2 outline-none text-foreground text-[15px] placeholder:text-muted-foreground"
                  autoComplete="off"
                  autoFocus
                />
                <button type="submit" className="bg-muted px-4 h-full border-l border-border hover:bg-muted/80 flex-shrink-0 rounded-r-full">
                  <Search size={18} className="text-muted-foreground" />
                </button>
                <MovionSearchOverlay
                  query={mobileLocalSearch}
                  isVisible={isMobileSearchFocused && mobileLocalSearch.trim().length > 0}
                  onClose={() => { setIsMobileSearchFocused(false); setShowMobileSearch(false); }}
                  onQueryChange={(q) => { setMobileLocalSearch(q); setSearchQuery(q); setLocalSearch(q); setShowMobileSearch(false); if (!location.pathname.endsWith('/movion') && location.pathname !== '/movion') { navigate('/movion'); } }}
                  containerRef={mobileSearchContainerRef}
                />
              </div>
            </form>
          </div>
        </div>
      )}

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
