import { Fragment } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus } from 'lucide-react';
import { useFriendSuggestions } from '@/hooks/useFriendSuggestions';
import { useNavigate } from 'react-router-dom';
import { SponsoredPersonCard } from '@/components/ads';
import { useDiscoveryAds } from '@/hooks/useDiscoveryAds';

/**
 * Header-icon version of PYMK.
 * Same logic as <FriendSuggestions /> but rendered inside a popover
 * with vertical (up↔down) scrolling instead of horizontal.
 */
export const FriendSuggestionsPopover = () => {
  const { suggestions, isLoading, sendRequest } = useFriendSuggestions();
  const navigate = useNavigate();
  const visibleSuggestions = suggestions?.slice(0, 20) || [];
  const { adPositions } = useDiscoveryAds(visibleSuggestions.length, 'pymk');
  const count = visibleSuggestions.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label="People you may know"
        >
          <Users className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-background">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 z-50 bg-popover">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">People You May Know</h3>
        </div>
        <div
          className="max-h-[60vh] overflow-y-auto overscroll-contain p-2"
          data-no-swipe-nav="true"
        >
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-muted rounded w-24" />
                    <div className="h-2 bg-muted rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && visibleSuggestions.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">
              No suggestions right now
            </p>
          )}

          {!isLoading && visibleSuggestions.map((suggestion: any, idx: number) => (
            <Fragment key={suggestion.id}>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                <Avatar
                  className="h-10 w-10 cursor-pointer flex-shrink-0"
                  onClick={() => navigate(`/profile/${suggestion.id}`)}
                >
                  {suggestion.avatar_url && <AvatarImage src={suggestion.avatar_url} />}
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                    {suggestion.display_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/profile/${suggestion.id}`)}
                >
                  <p className="text-sm font-medium truncate hover:text-primary">
                    {suggestion.display_name}
                  </p>
                  {suggestion.mutualCount > 0 && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {suggestion.mutualCount} mutual
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-xs flex-shrink-0"
                  onClick={() => sendRequest.mutate(suggestion.id)}
                  disabled={sendRequest.isPending}
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
              {adPositions.has(idx) && (
                <div key={`pymk-ad-${idx}`} className="my-1">
                  <SponsoredPersonCard />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FriendSuggestionsPopover;
