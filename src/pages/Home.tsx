import { useEffect, useRef, useCallback, useMemo, memo } from 'react';

import { Button } from "@/components/ui/button";

/** Tiny wrapper: notifies the smart engine when an ad mounts (for session cap). */
const SmartAdSlot = memo(({
  onMount,
  children,
}: {
  onMount: () => void;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    onMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
});
SmartAdSlot.displayName = 'SmartAdSlot';

import { Card } from "@/components/ui/card";

import { MessageCircle, UserPlus, Bookmark, Loader2 } from "lucide-react";

import { useFeed } from '@/hooks/useFeed';

import { useFriends } from '@/hooks/useFriends';

import { useNavigate } from 'react-router-dom';

import { FriendSuggestionsPopover } from '@/components/FriendSuggestionsPopover';

import { UserSearchDialog } from '@/components/UserSearchDialog';

import { PullToRefresh } from '@/components/ui/PullToRefresh';

import { useQueryClient } from '@tanstack/react-query';

import { useShares } from '@/hooks/useShares';

import { FeedCard } from '@/components/FeedCard';
import { FeedSkeleton } from '@/components/FeedSkeleton';

import { CreatePostCard } from '@/components/CreatePostCard';

import NotificationBell from '@/components/NotificationBell';

import FacebookStoriesBar from '@/components/stories/FacebookStoriesBar';
import AppLogoStatusRing from '@/components/promotions/AppLogoStatusRing';

import AppMenu from '@/components/AppMenu';

import { NativeAdCard, BannerAd, StickyBannerAd } from '@/components/ads';

import { useSmartFeedAds } from '@/hooks/useSmartFeedAds';

import { useTotalUnreadBadge } from '@/hooks/useBadgeCount';


// Memoized row — re-renders only when its specific props change, NOT on every scroll
type FeedRowProps = {
  item: any;
  showAd: boolean;
  showBanner: boolean;
  registerAdShown: () => void;
  onShare: (item: any) => void;
};
const FeedRow = memo(({ item, showAd, showBanner, registerAdShown, onShare }: FeedRowProps) => {
  return (
    <div>
      <FeedCard item={item} onShare={() => onShare(item)} />
      {showAd && (
        <SmartAdSlot onMount={registerAdShown}>
          <div className="mt-3 sm:mt-4">
            <NativeAdCard placement="home_feed" />
          </div>
        </SmartAdSlot>
      )}
      {showBanner && (
        <div className="mt-3 sm:mt-4 flex justify-center">
          <BannerAd placement="home_banner" />
        </div>
      )}
    </div>
  );
});
FeedRow.displayName = 'FeedRow';

const Home = () => {

  const { feedItems, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed();

  const { friends, pendingRequests } = useFriends();

  const { sharePost } = useShares();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const totalUnreadMessages = useTotalUnreadBadge();

  // 🤖 AI Smart Ad Engine — realtime scroll-speed + dynamic frequency
  const { shouldShowAd, registerAdShown } = useSmartFeedAds();

  // Stable share handler — prevents FeedRow re-renders
  const handleShare = useCallback((item: any) => {
    if (item.type === 'post' || item.type === 'group_post') {
      sharePost.mutate({ postId: item.id });
    }
  }, [sharePost]);


  const handleRefresh = async () => {

    await queryClient.invalidateQueries({ queryKey: ['unified-feed'] });

    await queryClient.invalidateQueries({ queryKey: ['friend-suggestions'] });

    await queryClient.invalidateQueries({ queryKey: ['stories'] });

  };



  // Infinite scroll observer

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {

    const [entry] = entries;

    if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {

      fetchNextPage();

    }

  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);



  useEffect(() => {

    const element = loadMoreRef.current;

    if (!element) return;



    observerRef.current = new IntersectionObserver(handleObserver, {

      root: null,

      rootMargin: '100px',

      threshold: 0,

    });



    observerRef.current.observe(element);



    return () => {

      if (observerRef.current) {

        observerRef.current.disconnect();

      }

    };

  }, [handleObserver]);



  return (

    <div className="min-h-screen bg-gradient-subtle page-content">

      {/* Header */}

      <header className="sticky-header">

        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">

          <div className="flex items-center gap-2">

            <AppLogoStatusRing src="/sha-verse-logo.jpeg" alt="Sha-Verse" />

          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">

            <UserSearchDialog />

            <Button 

              variant="ghost" 

              size="icon" 

              onClick={() => navigate('/messages')}

              className="relative h-9 w-9 rounded-full"

              aria-label={totalUnreadMessages > 0 ? `Messages, ${totalUnreadMessages} unread` : 'Messages'}

            >

              <MessageCircle className="w-5 h-5" />

              {totalUnreadMessages > 0 && (

                <span className="absolute -top-0.5 -right-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-background animate-in fade-in zoom-in duration-200">

                  {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}

                </span>

              )}

            </Button>

            <Button 

              variant="ghost" 

              size="icon" 

              onClick={() => navigate('/saved')}

              className="h-9 w-9 rounded-full"

            >

              <Bookmark className="w-5 h-5" />

            </Button>

            <Button 

              variant="ghost" 

              size="icon" 

              onClick={() => navigate('/friends')}

              className="relative h-9 w-9 rounded-full"

            >

              <UserPlus className="w-5 h-5" />

              {pendingRequests && pendingRequests.length > 0 && (

                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">

                  {pendingRequests.length > 9 ? '9+' : pendingRequests.length}

                </span>

              )}

            </Button>

            <FriendSuggestionsPopover />

            <NotificationBell />

            <AppMenu />

          </div>

        </div>

      </header>



      {/* Main Content */}

      <PullToRefresh onRefresh={handleRefresh}>

        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4">

          {/* Stories Section - Facebook Style */}

          <FacebookStoriesBar />




          {/* Ad: 320x100 banner after friend suggestions */}

          <div className="mb-3 sm:mb-4 flex justify-center">

            <BannerAd placement="home_banner" />

          </div>



          {/* Create Post */}

          <div className="mb-3 sm:mb-4">

            <CreatePostCard />

          </div>



          {/* Ad: Native card after Create Post */}

          <div className="mb-3 sm:mb-4">

            <NativeAdCard placement="home_feed_after_create" />

          </div>



          {/* Unified Feed */}

          <div className="space-y-3 sm:space-y-4 pb-4">

            {isLoading ? (

              <div className="text-center py-8">

                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>

              </div>

            ) : feedItems && feedItems.length > 0 ? (

              <>

                {feedItems.map((item, idx) => (
                  <FeedRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    showAd={shouldShowAd(idx)}
                    showBanner={idx >= 5 && (idx + 1) % 9 === 0}
                    registerAdShown={registerAdShown}
                    onShare={handleShare}
                  />
                ))}


                

                {/* Load More Trigger */}

                <div ref={loadMoreRef} className="py-4">

                  {isFetchingNextPage && <FeedSkeleton count={2} />}

                  {!hasNextPage && feedItems.length > 0 && (

                    <p className="text-center text-sm text-muted-foreground">You've reached the end</p>

                  )}

                </div>

              </>

            ) : (

              <Card className="p-6 sm:p-8 text-center">

                <p className="text-muted-foreground mb-2 text-sm sm:text-base">

                  {friends && friends.length === 0 

                    ? "Add friends to see their posts, videos, and books in your feed!" 

                    : "No content yet. Be the first to post!"}

                </p>

              </Card>

            )}

          </div>

        </div>

      </PullToRefresh>

      {/* 📢 Sticky bottom banner — continuous low-profile earning slot */}
      <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-30 pointer-events-auto">
        <div className="max-w-2xl mx-auto">
          <StickyBannerAd placement="home_banner" />
        </div>
      </div>

    </div>

  );

};



export default Home;

