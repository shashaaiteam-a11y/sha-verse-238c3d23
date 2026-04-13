import React, { useRef, useEffect } from 'react';
import { Bell, X, CheckCheck, RefreshCw, Video, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMovionNotifications } from '@/hooks/useMovionNotifications';
import type { MovionNotificationItem } from '@/hooks/useMovionNotifications';

interface MovionNotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const formatTimeAgo = (dateStr: string): string => {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const NotificationItem: React.FC<{
  notif: MovionNotificationItem;
  onSeen: (id: string) => void;
  onNavigate: (videoId: string, notifId: string) => void;
}> = ({ notif, onSeen, onNavigate }) => {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-muted/60 group relative ${
        !notif.seen ? 'bg-primary/5 border-l-2 border-primary' : ''
      }`}
      onClick={() => onNavigate(notif.videoId, notif.id)}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-20 h-12 rounded-lg overflow-hidden bg-muted">
        {notif.videoThumbnail ? (
          <img
            src={notif.videoThumbnail}
            alt={notif.videoTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Video size={18} className="text-muted-foreground" />
          </div>
        )}
        {!notif.seen && (
          <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          {/* Channel avatar */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full overflow-hidden bg-muted border border-border">
            {notif.channelAvatar ? (
              <img src={notif.channelAvatar} alt={notif.channelName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[8px] font-bold text-white">
                {notif.channelName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
              {notif.videoTitle}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {notif.channelName}
              {notif.category && (
                <span className="ml-1 text-xs text-primary/70">• {notif.category}</span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{formatTimeAgo(notif.uploadedAt)}</p>
          </div>
        </div>
      </div>

      {/* Mark seen */}
      {!notif.seen && (
        <button
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            onSeen(notif.id);
          }}
          title="Mark as seen"
        >
          <CheckCheck size={14} className="text-primary" />
        </button>
      )}
    </div>
  );
};

export const MovionNotificationPanel: React.FC<MovionNotificationPanelProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  const { notifications, unreadCount, isLoading, markAsSeen, markAllAsSeen, refresh } =
    useMovionNotifications();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose, triggerRef]);

  const handleNavigate = (videoId: string, notifId: string) => {
    markAsSeen(notifId);
    onClose();
    navigate(`/movion/watch/${videoId}`);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-[380px] max-h-[520px] bg-card border border-border rounded-2xl shadow-2xl z-[200] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ maxWidth: 'calc(100vw - 32px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-primary" />
          <h3 className="font-bold text-foreground text-base">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsSeen}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded-lg hover:bg-muted transition-colors"
              title="Mark all as seen"
            >
              <CheckCheck size={14} />
              <span className="hidden sm:inline">All seen</span>
            </button>
          )}
          <button
            onClick={refresh}
            className={`p-1.5 hover:bg-muted rounded-full transition-colors ${isLoading ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <RefreshCw size={14} className="text-muted-foreground" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-full transition-colors"
          >
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="overflow-y-auto flex-1 divide-y divide-border/50">
        {isLoading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Bell size={28} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No new videos</p>
              <p className="text-sm text-muted-foreground mt-1">
                Subscribe to channels to see their latest uploads here
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Unread */}
            {notifications.filter(n => !n.seen).length > 0 && (
              <>
                <div className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                  New
                </div>
                {notifications
                  .filter(n => !n.seen)
                  .map(n => (
                    <NotificationItem
                      key={n.id}
                      notif={n}
                      onSeen={markAsSeen}
                      onNavigate={handleNavigate}
                    />
                  ))}
              </>
            )}

            {/* Read / Earlier */}
            {notifications.filter(n => n.seen).length > 0 && (
              <>
                <div className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                  Earlier
                </div>
                {notifications
                  .filter(n => n.seen)
                  .map(n => (
                    <NotificationItem
                      key={n.id}
                      notif={n}
                      onSeen={markAsSeen}
                      onNavigate={handleNavigate}
                    />
                  ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-border px-4 py-2 flex-shrink-0">
          <button
            onClick={() => {
              markAllAsSeen();
              onClose();
            }}
            className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground py-1 rounded-lg hover:bg-muted transition-colors"
          >
            <CheckCheck size={14} />
            Mark all as seen
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default MovionNotificationPanel;
