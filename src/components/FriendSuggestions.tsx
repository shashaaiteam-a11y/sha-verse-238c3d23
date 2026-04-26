import { Fragment } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus, Users } from 'lucide-react';
import { useFriendSuggestions } from '@/hooks/useFriendSuggestions';
import { useNavigate } from 'react-router-dom';
import { SponsoredPersonCard } from '@/components/ads';
import { useDiscoveryAds } from '@/hooks/useDiscoveryAds';

export const FriendSuggestions = () => {
  const { suggestions, isLoading, sendRequest } = useFriendSuggestions();
  const navigate = useNavigate();
  const visibleSuggestions = suggestions?.slice(0, 6) || [];
  const { adPositions } = useDiscoveryAds(visibleSuggestions.length, 'pymk');

  if (isLoading) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          People You May Know
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-28 animate-pulse">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted mx-auto mb-2" />
              <div className="h-4 bg-muted rounded w-20 mx-auto mb-1" />
              <div className="h-3 bg-muted rounded w-16 mx-auto" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        People You May Know
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {visibleSuggestions.map((suggestion: any, idx: number) => (
          <Fragment key={suggestion.id}>
            <div className="flex-shrink-0 w-28 text-center">
              <Avatar 
                className="h-9 w-9 sm:h-10 sm:w-10 mx-auto mb-2 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => navigate(`/profile/${suggestion.id}`)}
              >
                {suggestion.avatar_url && <AvatarImage src={suggestion.avatar_url} />}
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                  {suggestion.display_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <p 
                className="text-sm font-medium truncate cursor-pointer hover:text-primary"
                onClick={() => navigate(`/profile/${suggestion.id}`)}
              >
                {suggestion.display_name}
              </p>
              {suggestion.mutualCount > 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  {suggestion.mutualCount} mutual friends
                </p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-1"
                onClick={() => sendRequest.mutate(suggestion.id)}
                disabled={sendRequest.isPending}
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
            {adPositions.has(idx) && (
              <SponsoredPersonCard key={`pymk-ad-${idx}`} />
            )}
          </Fragment>
        ))}
      </div>
    </Card>
  );
};
