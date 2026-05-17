import { Fragment, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, ArrowLeft, Check } from 'lucide-react';
import { useFriendSuggestions } from '@/hooks/useFriendSuggestions';
import { useNavigate } from 'react-router-dom';
import { SponsoredPersonCard } from '@/components/ads';
import { useDiscoveryAds } from '@/hooks/useDiscoveryAds';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Header-icon PYMK. Tapping opens a full-screen overlay (between the device's
 * status bar and bottom nav safe areas) with vertical scrolling. Includes a
 * working back button. Existing PYMK logic is reused unchanged.
 */
export const FriendSuggestionsPopover = () => {
  const { suggestions, isLoading, sendRequest } = useFriendSuggestions();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const visibleSuggestions = suggestions?.slice(0, 50) || [];
  const { adPositions } = useDiscoveryAds(visibleSuggestions.length, 'pymk');
  const count = suggestions?.length || 0;

  // Lock body scroll + handle Android/browser back button while overlay is open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.history.pushState({ pymkOverlay: true }, '');
    const onPop = () => setOpen(false);
    window.addEventListener('popstate', onPop);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('popstate', onPop);
    };
  }, [open]);

  const closeOverlay = () => {
    if (window.history.state?.pymkOverlay) {
      window.history.back();
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-full"
        aria-label="People you may know"
        onClick={() => setOpen(true)}
      >
        <Users className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-background">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-background flex flex-col"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          data-no-swipe-nav="true"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-3 border-b border-border bg-background sticky top-0 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label="Back"
              onClick={closeOverlay}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-base">People You May Know</h2>
          </div>

          {/* Vertical scroll list */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain p-3"
            data-no-swipe-nav="true"
          >
            {isLoading && (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-32" />
                      <div className="h-2 bg-muted rounded w-20" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && visibleSuggestions.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-10">
                No suggestions right now
              </p>
            )}

            {!isLoading && visibleSuggestions.map((suggestion: any, idx: number) => (
              <Fragment key={suggestion.id}>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <Avatar
                    className="h-12 w-12 cursor-pointer flex-shrink-0"
                    onClick={() => { closeOverlay(); navigate(`/profile/${suggestion.id}`); }}
                  >
                    {suggestion.avatar_url && <AvatarImage src={suggestion.avatar_url} />}
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
                      {suggestion.display_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => { closeOverlay(); navigate(`/profile/${suggestion.id}`); }}
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
                    className="h-8 px-3 text-xs flex-shrink-0"
                    onClick={() => sendRequest.mutate(suggestion.id)}
                    disabled={sendRequest.isPending}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                {adPositions.has(idx) && (
                  <div key={`pymk-ad-${idx}`} className="my-2">
                    <SponsoredPersonCard />
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default FriendSuggestionsPopover;
