import { Button } from '@/components/ui/button';
import { MoreVertical, Search, Trash2, UserX, UserCheck, Bell, BellOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderMenuProps {
  conversationId: string;
  otherUserId?: string;
  otherUserName: string;
  isBlocked?: boolean;
  isMuted?: boolean;
  onClearChat?: () => void;
  onSearchToggle?: () => void;
  onBlock?: () => void;
  onUnblock?: () => void;
  onMuteToggle?: () => void;
}

export const ChatHeaderMenu = ({
  conversationId,
  otherUserId,
  otherUserName,
  isBlocked,
  isMuted,
  onClearChat,
  onSearchToggle,
  onBlock,
  onUnblock,
  onMuteToggle,
}: ChatHeaderMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onSearchToggle}>
          <Search className="w-4 h-4 mr-3" />
          Search in chat
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onMuteToggle}>
          {isMuted ? (
            <>
              <Bell className="w-4 h-4 mr-3" />
              Unmute notifications
            </>
          ) : (
            <>
              <BellOff className="w-4 h-4 mr-3" />
              Mute notifications
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onClearChat}>
          <Trash2 className="w-4 h-4 mr-3" />
          Clear chat
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isBlocked ? (
          <DropdownMenuItem onClick={onUnblock} className="text-emerald-500">
            <UserCheck className="w-4 h-4 mr-3" />
            Unblock {otherUserName}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onBlock} className="text-destructive">
            <UserX className="w-4 h-4 mr-3" />
            Block {otherUserName}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
