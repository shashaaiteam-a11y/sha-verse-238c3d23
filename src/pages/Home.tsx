import { useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, UserPlus, Bookmark, Loader2 } from "lucide-react";
import { useFeed } from '@/hooks/useFeed';
import { useFriends } from '@/hooks/useFriends';
import { useNavigate } from 'react-router-dom';
import { FriendSuggestions } from '@/components/FriendSuggestions';
import { UserSearchDialog } from '@/components/UserSearchDialog';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { useQueryClient } from '@tanstack/react-query';
import { useShares } from '@/hooks/useShares';
import { FeedCard } from '@/components/FeedCard';
import { CreatePostCard } from '@/components/CreatePostCard';
import NotificationBell from '@/components/NotificationBell';
import FacebookStoriesBar from '@/components/stories/FacebookStoriesBar';
import AppMenu from '@/components/AppMenu';
import { NativeAdCard, BannerAd } from '@/components/ads';
import { TestAdSimple } from '@/components/ads/TestAdSimple';
import { AD_FREQUENCY } from '@/lib/ads/adConfig';

const Home = () => {
  const { feedItems, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed();
  const { friends, pendingRequests } = useFriends();
  const { sharePost } = useShares();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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
            <img src="/sha-verse-logo.jpeg" alt="Sha-Verse" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover" />
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Sha-Verse
            </h1>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <UserSearchDialog />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/messages')}
              className="h-9 w-9 rounded-full"
            >
              <MessageCircle className="w-5 h-5" />
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
            <NotificationBell />
            <AppMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <PullToRefresh onRefresh={handleRefresh} className="h-[calc(100vh-56px)]">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* Stories Section - Facebook Style */}
          <FacebookStoriesBar />

          {/* Friend Suggestions */}
          <div className="mb-3 sm:mb-4">
            <FriendSuggestions />
          </div>

          {/* Ad: 320x100 banner after friend suggestions */}
          <div className="mb-3 sm:mb-4 flex justify-center">
            <BannerAd placement="home_banner" />
          </div>

          {/* Create Post */}
          <div className="mb-3 sm:mb-4">
            <CreatePostCard />
          </div>

          {/* 🧪 HARD-CODED TEST ELEMENT */}
          <div className="mb-3 sm:mb-4 p-4 bg-red-500 text-white text-center font-bold rounded-lg">
            🧪 TEST: If you see this, the spot works! Ad should be below.
          </div>

          {/* 🧪 ULTRA SIMPLE TEST AD */}
          <div className="mb-3 sm:mb-4">
            <p className="text-xs text-green-600 mb-1 font-bold">Ultra simple ad below (no hooks):</p>
            <TestAdSimple placement="home_test" />
          </div>

          {/* Ad: Native card after Create Post */}
          <div className="mb-3 sm:mb-4 border-2 border-yellow-400 p-2">
            <p className="text-xs text-yellow-600 mb-1">NativeAdCard below (with hooks):</p>
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
                  <div key={`${item.type}-${item.id}`}>
                    <FeedCard
                      item={item}
                      onShare={() => {
                        if (item.type === 'post' || item.type === 'group_post') {
                          sharePost.mutate({ postId: item.id });
                        }
                      }}
                    />
                    {/* Ad: native card every N posts */}
                    {(idx + 1) % AD_FREQUENCY.HOME_FEED_EVERY_N_POSTS === 0 && (
                      <div className="mt-3 sm:mt-4">
                        <NativeAdCard placement="home_feed" />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Load More Trigger */}
                <div ref={loadMoreRef} className="py-4 flex justify-center">
                  {isFetchingNextPage && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Loading more...</span>
                    </div>
                  )}
                  {!hasNextPage && feedItems.length > 0 && (
                    <p className="text-sm text-muted-foreground">You've reached the end</p>
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
    </div>
  );
};

export default Home;
