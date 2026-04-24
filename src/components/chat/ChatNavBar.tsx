/**
 * ChatNavBar - Messenger-style responsive navigation for the Chats module.
 *
 * Layout rules (matches the spec):
 *   - Mobile  (< 640px) : fixed bottom horizontal bar, icons only
 *   - Tablet  (640-1023): slim left sidebar, icons only
 *   - Desktop (>= 1024) : wide left sidebar, icons + labels + footer profile
 *
 * Realtime:
 *   - Total unread badge comes from useTotalUnreadBadge() which already
 *     subscribes to messages INSERT/UPDATE in realtime.
 *
 * Isolation:
 *   - Lives only inside the Chats module (rendered by MessengerChat).
 *   - Does NOT touch BottomNav, NovaChat, Groups, or any other module.
 *   - Tab switching is purely local state — no routing side effects.
 */
import { MessageCircle, Users, Settings, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTotalUnreadBadge } from '@/hooks/useBadgeCount';
import { useAuth } from '@/contexts/AuthContext';

export type ChatNavTab = 'chats' | 'people' | 'settings';

interface ChatNavBarProps {
  active: ChatNavTab;
  onChange: (tab: ChatNavTab) => void;
  onClose: () => void;
}

interface NavItem {
  id: ChatNavTab;
  label: string;
  icon: typeof MessageCircle;
  showBadge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'chats', label: 'Chats', icon: MessageCircle, showBadge: true },
  { id: 'people', label: 'People', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const ChatNavBar = ({ active, onChange, onClose }: ChatNavBarProps) => {
  const { user } = useAuth();
  const totalUnread = useTotalUnreadBadge();

  return (
    <>
      {/* ============ DESKTOP / TABLET LEFT SIDEBAR ============ */}
      <aside
        className={cn(
          'hidden sm:flex flex-col border-r border-border bg-card flex-shrink-0',
          // slim on tablet, wide on desktop
          'w-16 lg:w-56 transition-[width] duration-200'
        )}
        aria-label="Chat navigation"
      >
        {/* Brand / logo space */}
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-4 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
            S
          </div>
          <span className="hidden lg:block ml-3 font-semibold text-base text-foreground">
            Chats
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 flex flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            const badge = item.showBadge ? totalUnread : 0;

            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl transition-all duration-200',
                  'px-3 py-2.5 lg:py-2',
                  'justify-center lg:justify-start',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
              >
                <span className="relative inline-flex">
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-transform',
                      isActive && 'scale-110'
                    )}
                  />
                  {badge > 0 && (
                    <span
                      className={cn(
                        'absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1',
                        'flex items-center justify-center rounded-full',
                        'bg-emerald-500 text-white text-[10px] font-bold shadow-sm',
                        'animate-in fade-in zoom-in duration-200',
                        // On wide desktop we move the badge to the side
                        'lg:hidden'
                      )}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                <span className="hidden lg:inline text-sm font-medium flex-1 text-left">
                  {item.label}
                </span>
                {badge > 0 && (
                  <span
                    className={cn(
                      'hidden lg:inline-flex items-center justify-center rounded-full',
                      'min-w-[20px] h-5 px-1.5 text-[10px] font-bold',
                      'bg-emerald-500 text-white shadow-sm',
                      'animate-in fade-in zoom-in duration-200'
                    )}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
                {/* Active accent bar (desktop) */}
                {isActive && (
                  <span className="hidden lg:block absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer: profile + close */}
        <div className="border-t border-border p-2 lg:p-3 flex flex-col gap-2">
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg p-2',
              'hover:bg-secondary/60 transition-colors'
            )}
          >
            <Avatar className="h-8 w-8">
              {user?.user_metadata?.avatar_url && (
                <AvatarImage src={user.user_metadata.avatar_url} />
              )}
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:block min-w-0 flex-1">
              <p className="text-xs font-medium truncate text-foreground">
                {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'You'}
              </p>
              <p className="text-[10px] text-muted-foreground">Online</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={cn(
              'justify-center lg:justify-start gap-2 h-9',
              'text-muted-foreground hover:text-foreground'
            )}
            aria-label="Exit chats"
            title="Exit"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline text-sm">Exit</span>
          </Button>
        </div>
      </aside>

      {/* ============ MOBILE BOTTOM BAR ============ */}
      <nav
        className={cn(
          'sm:hidden fixed bottom-0 inset-x-0 z-40',
          'bg-card/95 backdrop-blur border-t border-border',
          'pb-[env(safe-area-inset-bottom)]'
        )}
        aria-label="Chat navigation"
      >
        <div className="grid grid-cols-3 h-14">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            const badge = item.showBadge ? totalUnread : 0;

            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                <span className="relative inline-flex">
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-transform',
                      isActive && 'scale-110'
                    )}
                  />
                  {badge > 0 && (
                    <span
                      className={cn(
                        'absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1',
                        'flex items-center justify-center rounded-full',
                        'bg-emerald-500 text-white text-[10px] font-bold shadow-sm',
                        'animate-in fade-in zoom-in duration-200'
                      )}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
