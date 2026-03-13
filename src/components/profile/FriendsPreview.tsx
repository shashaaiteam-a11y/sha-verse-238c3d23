import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FriendsPreviewProps {
  friends: any[];
  friendsCount: number;
  mutualFriendsCount?: number;
  isOwnProfile: boolean;
  userId?: string;
  onSeeAllClick?: () => void;
}

export const FriendsPreview = ({ 
  friends, 
  friendsCount, 
  mutualFriendsCount,
  isOwnProfile, 
  userId,
  onSeeAllClick
}: FriendsPreviewProps) => {
  const navigate = useNavigate();
  const displayFriends = friends?.slice(0, 9) || [];

  const handleSeeAllClick = () => {
    if (onSeeAllClick) {
      onSeeAllClick();
    } else if (isOwnProfile) {
      navigate('/friends');
    }
  };

  return (
    <Card className="p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-lg">Friends</h3>
        {friendsCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary text-sm -mr-2"
            onClick={handleSeeAllClick}
          >
            See All Friends
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        {friendsCount} friends
        {!isOwnProfile && mutualFriendsCount && mutualFriendsCount > 0 && (
          <span className="text-primary"> · {mutualFriendsCount} mutual</span>
        )}
      </p>

      {displayFriends.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {displayFriends.map((friendship: any) => (
            <div 
              key={friendship.id} 
              className="cursor-pointer"
              onClick={() => navigate(`/profile/${friendship.profiles?.id}`)}
            >
              <div className="aspect-square rounded-lg overflow-hidden mb-1">
                <Avatar className="w-full h-full rounded-lg">
                  {friendship.profiles?.avatar_url && (
                    <AvatarImage 
                      src={friendship.profiles.avatar_url} 
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl rounded-lg">
                    {friendship.profiles?.display_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-xs font-medium truncate">
                {friendship.profiles?.display_name}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No friends to show
        </p>
      )}
    </Card>
  );
};
