// Movion Subscriptions Page - Live with Supabase + Smart Algorithm
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Grid3X3, List, Bell, Loader2 } from "lucide-react";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useVideos } from "@/hooks/useVideos";
import { useMovionRealtime } from "@/hooks/useMovionRealtime";
import { usePrioritizedSubscriptions } from "@/hooks/useMovionAlgorithms";
import { useAuth } from "@/contexts/AuthContext";
import { VideoCard } from "../components";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const MovionSubscriptions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscriptions, isLoading } = useSubscriptions();
  const { videos } = useVideos();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'smart' | 'recent'>('smart');

  // Enable realtime updates
  useMovionRealtime();

  // Apply smart subscription algorithm
  const prioritizedVideos = usePrioritizedSubscriptions(
    videos,
    subscriptions,
    activeFilter || undefined,
    sortMode
  );
  
  // Get unique channels from subscriptions
  const subscribedChannels = (subscriptions || [])
    .map((s: any) => s.channels)
    .filter(Boolean);
  
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Bell className="w-24 h-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-bold mb-2">Don't miss new videos</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Sign in to see updates from your favorite Movion channels
        </p>
        <Button onClick={() => navigate("/auth")}>Sign in</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4">
        <div className="max-w-[1400px] mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="flex gap-3 mb-6">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="w-14 h-14 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Bell className="w-24 h-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-bold mb-2">No subscriptions yet</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Subscribe to channels to see their latest videos here
        </p>
        <Button onClick={() => navigate("/movion")}>Explore Movion</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {sortMode === 'smart' ? 'Smart Sort' : 'Most Recent'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortMode('smart')}>
                  Smart Sort (by notification level)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode('recent')}>
                  Most Recent
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? <List className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        
        {/* Channel Filter Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Filter by channel</span>
          </div>
          
          <ScrollArea className="w-full whitespace-nowrap pb-3">
            <div className="flex gap-3 pb-1">
              <button
                className={`flex flex-col items-center gap-1 min-w-[72px] ${!activeFilter ? 'opacity-100' : 'opacity-60'}`}
                onClick={() => setActiveFilter(null)}
              >
                <div className={`w-14 h-14 rounded-full bg-primary flex items-center justify-center ${!activeFilter ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                  <span className="text-primary-foreground font-bold">All</span>
                </div>
                <span className="text-xs">All</span>
              </button>
              
              {subscribedChannels.map((channel: any) => (
                <button
                  key={channel.id}
                  className={`flex flex-col items-center gap-1 min-w-[72px] ${activeFilter === channel.id ? 'opacity-100' : 'opacity-60'}`}
                  onClick={() => setActiveFilter(activeFilter === channel.id ? null : channel.id)}
                >
                  <Avatar className={`w-14 h-14 ${activeFilter === channel.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                    <AvatarImage src={channel.avatar_url} />
                    <AvatarFallback>{channel.name?.[0] || 'C'}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate max-w-[72px]">{channel.name}</span>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        
        {/* Videos Grid/List - Algorithm Prioritized */}
        {prioritizedVideos.length > 0 ? (
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            : "space-y-4"
          }>
            {prioritizedVideos.map((video) => (
              <VideoCard 
                key={video.id} 
                video={video} 
                layout={viewMode === "list" ? "list" : "grid"} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No videos from {activeFilter ? 'this channel' : 'your subscriptions'} yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovionSubscriptions;
