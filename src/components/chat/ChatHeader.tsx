/**
 * ChatHeader - Enhanced header with presence, block status, and options
 */

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Copy,
  Bell,
  BellOff,
  ShieldX,
  Ban,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { PresenceStatus, OnlineBadge } from './PresenceStatus';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  otherUser: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
  } | null;
  isOnline: boolean;
  lastSeen?: Date | null;
  isBlocked: boolean;
  isBlockedBy: boolean;
  isMuted: boolean;
  onBack: () => void;
  onCall: () => void;
  onVideoCall: () => void;
  onBlock: () => void;
  onMute: (duration: 'always' | '8hours' | '1week') => void;
  onClearChat: () => void;
  isLoading?: boolean;
}

export const ChatHeader = ({
  otherUser,
  isOnline,
  lastSeen,
  isBlocked,
  isBlockedBy,
  isMuted,
  onBack,
  onCall,
  onVideoCall,
  onBlock,
  onMute,
  onClearChat,
  isLoading = false,
}: ChatHeaderProps) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  if (!otherUser) {
    return (
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-40">
      {/* Left: Avatar + Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10">
            {otherUser.avatar_url && <AvatarImage src={otherUser.avatar_url} />}
            <AvatarFallback className="bg-gradient-primary text-white">
              {otherUser.display_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <OnlineBadge isOnline={isOnline} />
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate text-foreground">{otherUser.display_name || 'Unknown User'}</h2>
          <PresenceStatus
            isOnline={isOnline}
            lastSeen={lastSeen}
            size="sm"
            className="text-xs"
          />

          {/* Block status indicators */}
          {(isBlocked || isBlockedBy) && (
            <div className="flex items-center gap-1 mt-0.5 text-red-500">
              <ShieldX className="w-3 h-3" />
              <span className="text-xs font-medium">
                {isBlockedBy ? '(You are blocked)' : '(Blocked)'}
              </span>
            </div>
          )}

          {/* Muted indicator */}
          {isMuted && (
            <div className="flex items-center gap-1 mt-0.5 text-amber-500">
              <BellOff className="w-3 h-3" />
              <span className="text-xs font-medium">Muted</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Disable calls if blocked */}
        {!isBlockedBy && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCall}
              disabled={isBlocked || isLoading}
              title="Voice call"
              className="hover:bg-blue-50"
            >
              <Phone className="w-5 h-5 text-blue-600" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onVideoCall}
              disabled={isBlocked || isLoading}
              title="Video call"
              className="hover:bg-green-50"
            >
              <Video className="w-5 h-5 text-green-600" />
            </Button>
          </>
        )}

        {/* More options menu */}
        <DropdownMenu open={showMoreMenu} onOpenChange={setShowMoreMenu}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isLoading}>
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* View contact */}
            <DropdownMenuItem onClick={() => {
              // Navigate to profile
              window.open(`/profile/${otherUser.username}`, '_blank');
              setShowMoreMenu(false);
            }}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>View Profile</span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Mute options */}
            <DropdownMenuItem
              onClick={() => {
                onMute('8hours');
                setShowMoreMenu(false);
              }}
            >
              <BellOff className="w-4 h-4 mr-2" />
              <span>Mute for 8 hours</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                onMute('1week');
                setShowMoreMenu(false);
              }}
            >
              <BellOff className="w-4 h-4 mr-2" />
              <span>Mute for 1 week</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                onMute('always');
                setShowMoreMenu(false);
              }}
            >
              <BellOff className="w-4 h-4 mr-2" />
              <span>Mute always</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Clear chat */}
            <DropdownMenuItem
              onClick={() => {
                if (confirm('Clear all messages in this chat?')) {
                  onClearChat();
                  setShowMoreMenu(false);
                }
              }}
              className="text-amber-600 hover:text-amber-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span>Clear chat</span>
            </DropdownMenuItem>

            {/* Block/Unblock */}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                onBlock();
                setShowMoreMenu(false);
              }}
              className="text-red-600 hover:text-red-700"
            >
              <Ban className="w-4 h-4 mr-2" />
              <span>{isBlocked ? 'Unblock user' : 'Block user'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
