import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Ban, 
  Flag, 
  Link as LinkIcon,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useProfileSettings } from "@/hooks/useProfileSettings";

interface ProfileMoreMenuProps {
  userId: string;
  displayName: string;
  onReport?: () => void;
}

export const ProfileMoreMenu = ({ 
  userId, 
  displayName, 
  onReport 
}: ProfileMoreMenuProps) => {
  const { toast } = useToast();
  const { blockUser, isUserBlocked } = useProfileSettings();
  const isBlocked = isUserBlocked(userId);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/profile/${userId}`;
    await navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Profile link copied to clipboard",
    });
  };

  const handleBlock = () => {
    if (window.confirm(`Are you sure you want to block ${displayName}? This will:
- Remove them from your friends list
- Prevent them from seeing your posts
- Stop notifications from them
- Prevent messaging between you
- Require a new friend request if you unblock them later`)) {
      blockUser.mutate({ 
        userId, 
        reason: 'Blocked from profile' 
      });
    }
  };

  const handleReport = () => {
    if (onReport) {
      onReport();
    } else {
      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="h-9 w-9">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopyLink}>
          <LinkIcon className="w-4 h-4 mr-2" />
          Copy link to profile
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={handleBlock} 
          className="text-destructive focus:text-destructive"
          disabled={isBlocked || blockUser.isPending}
        >
          <Ban className="w-4 h-4 mr-2" />
          {isBlocked ? `${displayName} is blocked` : `Block ${displayName}`}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleReport} className="text-destructive focus:text-destructive">
          <Flag className="w-4 h-4 mr-2" />
          Report profile
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};