import { Button } from '@/components/ui/button';
import { MoreVertical, Search, Trash2, UserX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProfileSettings } from '@/hooks/useProfileSettings';

interface ChatHeaderMenuProps {
  conversationId: string;
  otherUserId?: string;
  otherUserName: string;
  onClearChat?: () => void;
  onSearchToggle?: () => void;
}

export const ChatHeaderMenu = ({
  conversationId,
  otherUserId,
  otherUserName,
  onClearChat,
  onSearchToggle,
}: ChatHeaderMenuProps) => {
  const { blockUser } = useProfileSettings();

  const handleBlock = () => {
    if (!otherUserId) return;
    blockUser.mutate({ userId: otherUserId, reason: 'Blocked from chat' });
  };

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
        <DropdownMenuItem onClick={onClearChat}>
          <Trash2 className="w-4 h-4 mr-3" />
          Clear chat
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleBlock} className="text-destructive">
          <UserX className="w-4 h-4 mr-3" />
          Block {otherUserName}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
