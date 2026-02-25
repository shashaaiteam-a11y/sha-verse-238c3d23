import { Button } from '@/components/ui/button';
import { 
  MoreVertical, Search, Trash2, Bell, BellOff, 
  UserX, Flag, Share2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ChatHeaderMenuProps {
  conversationId: string;
  otherUserName: string;
}

export const ChatHeaderMenu = ({ conversationId, otherUserName }: ChatHeaderMenuProps) => {
  const handleMuteNotifications = () => {
    toast.success('Notifications muted for this chat');
  };

  const handleSearch = () => {
    toast.info('Search in chat coming soon');
  };

  const handleClearChat = () => {
    toast.info('Clear chat coming soon');
  };

  const handleBlock = () => {
    toast.info(`Block ${otherUserName} coming soon`);
  };

  const handleReport = () => {
    toast.info('Report coming soon');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleSearch}>
          <Search className="w-4 h-4 mr-3" />
          Search in chat
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleMuteNotifications}>
          <BellOff className="w-4 h-4 mr-3" />
          Mute notifications
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleClearChat}>
          <Trash2 className="w-4 h-4 mr-3" />
          Clear chat
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleBlock} className="text-destructive">
          <UserX className="w-4 h-4 mr-3" />
          Block {otherUserName}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleReport} className="text-destructive">
          <Flag className="w-4 h-4 mr-3" />
          Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
