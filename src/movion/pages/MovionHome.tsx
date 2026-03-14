// Movion Home Page - With global menu state and fixed video card menu behavior
import React, { useState } from 'react';
import { useVideos } from '@/hooks/useVideos';
import { useShorts } from '@/hooks/useShorts';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { useMovionRealtime, useGlobalVideoRealtime } from '@/hooks/useMovionRealtime';
import { usePrioritizedVideos, usePrioritizedPulse } from '@/hooks/useMovionAlgorithms';
import { useHiddenVideos } from '@/hooks/useHiddenVideos';
import { VideoCard, ShortsCard } from '../components';
import { VIDEO_CATEGORIES } from '../constants';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const MovionHome: React.FC = () => {
  const { videos, isLoading: videosLoading } = useVideos();
  const { shorts, isLoading: shortsLoading } = useShorts();
  const { subscriptions } = useSubscriptions();
  const { watchHistory } = useWatchHistory();
  const { hiddenVideos } = useHiddenVideos();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Global menu state - only one menu open at a time
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Enable realtime updates
  useMovionRealtime();
  useGlobalVideoRealtime();

  // Apply smart algorithms to videos (filter out hidden videos)
  const prioritizedVideos = usePrioritizedVideos(
    videos,
    subscriptions,
    watchHistory,
    searchQuery,
    activeCategory
  ).filter(video => !hiddenVideos.includes(video.id));

  // Apply pulse algorithm to shorts
  const prioritizedShorts = usePrioritizedPulse(shorts);

  const isLoading = videosLoading || shortsLoading;

  // Close menu when clicking anywhere on the page
  const handlePageClick = () => {
    if (activeMenuId) {
      setActiveMenuId(null);
    }
  };

  return (
    <div className="min-h-full bg-white" onClick={handlePageClick}>
      {/* Category Pills */}
      <div className="sticky top-0 bg-white z-20 border-b border-[#f2f2f2] px-4 py-3">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {VIDEO_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                activeCategory === cat
                  ? "bg-[#0f0f0f] text-white"
                  : "bg-[#f2f2f2] text-[#0f0f0f] hover:bg-[#e5e5e5]"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 lg:p-6 max-w-[2000px] mx-auto">
        {/* Pulse (Shorts) Section - Horizontal Scroll */}
        {!shortsLoading && prioritizedShorts.length > 0 && activeCategory === 'All' && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-pink-600">⚡</span> Pulse
            </h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
              {prioritizedShorts.slice(0, 10).map((video) => (
                <ShortsCard 
                  key={video.id} 
                  video={video} 
                  className="w-[140px] sm:w-[160px] flex-shrink-0" 
                />
              ))}
            </div>
          </section>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video rounded-xl" />
                <div className="flex gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Videos Grid - Algorithm Prioritized */}
        {!isLoading && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
              {prioritizedVideos.map((video) => (
                <VideoCard 
                  key={video.id} 
                  video={video}
                  activeMenuId={activeMenuId}
                  onMenuToggle={setActiveMenuId}
                />
              ))}
            </div>

            {prioritizedVideos.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-[#606060]">
                  {videos?.length === 0 
                    ? "No videos uploaded yet. Be the first to upload!" 
                    : "No videos found for this category"}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default MovionHome;
