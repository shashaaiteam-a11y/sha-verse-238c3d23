// Movion Channel Page - Live with Supabase
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, Grid3X3, ListVideo, Users, Play, Loader2 } from "lucide-react";
import { useChannel, useChannelVideos } from "@/hooks/useChannels";
import { useAuth } from "@/contexts/AuthContext";
import { VideoCard } from "../components";
import { SubscribeButton } from "../components/SubscribeButton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoType, MovionVideo } from "../types";
import { BannerAd } from "@/components/ads";

const formatDuration = (seconds?: number) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const transformVideo = (video: any, channelData?: any): MovionVideo => ({
  id: video.id,
  title: video.title || 'Untitled',
  description: video.description || '',
  thumbnail: video.thumbnail_url || 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400',
  videoUrl: video.video_url || video.hls_url || '',
  type: video.is_short ? VideoType.SHORT : VideoType.LONG,
  views: video.views_count || 0,
  likes: video.likes_count || 0,
  dislikes: 0,
  timestamp: video.created_at ? new Date(video.created_at).toLocaleDateString() : 'Recently',
  duration: formatDuration(video.duration),
  channelId: video.channel_id,
  channelName: channelData?.name || video.channels?.name || 'Unknown Channel',
  channelAvatar: channelData?.avatar_url || video.channels?.avatar_url || '',
  category: video.category || 'Other',
  tags: video.tags || [],
});

const MovionChannel = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { channel, isLoading: channelLoading } = useChannel(channelId);
  const { videos, isLoading: videosLoading } = useChannelVideos(channelId);
  
  const [activeTab, setActiveTab] = useState("videos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortMode, setSortMode] = useState<"latest" | "popular" | "oldest">("latest");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const rawVideos = videos || [];
  const channelVideos = rawVideos.map(v => transformVideo(v, channel));
  const longVideos = channelVideos.filter(v => v.type === VideoType.LONG);
  const shortVideos = channelVideos.filter(v => v.type === VideoType.SHORT);

  // Build a map from video id to raw created_at for accurate sorting
  const createdAtMap = useMemo(() => {
    const map: Record<string, string> = {};
    rawVideos.forEach((v: any) => { if (v.id && v.created_at) map[v.id] = v.created_at; });
    return map;
  }, [rawVideos]);

  const sortVideos = (list: MovionVideo[]) => {
    switch (sortMode) {
      case "popular":
        return [...list].sort((a, b) => b.views - a.views);
      case "oldest":
        return [...list].sort((a, b) => 
          new Date(createdAtMap[a.id] || 0).getTime() - new Date(createdAtMap[b.id] || 0).getTime()
        );
      case "latest":
      default:
        return [...list].sort((a, b) => 
          new Date(createdAtMap[b.id] || 0).getTime() - new Date(createdAtMap[a.id] || 0).getTime()
        );
    }
  };

  const sortedLongVideos = useMemo(() => sortVideos(longVideos), [longVideos, sortMode, createdAtMap]);
  const sortedShortVideos = useMemo(() => sortVideos(shortVideos), [shortVideos, sortMode, createdAtMap]);
  
  if (channelLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-32 md:h-48 lg:h-56 w-full" />
        <div className="max-w-[1400px] mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-32 h-32 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!channel) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground gap-4">
        <p className="text-xl font-medium">Channel not found</p>
        <Button onClick={() => navigate('/movion')}>Back to Movion</Button>
      </div>
    );
  }
  
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Banner */}
      <div 
        className="h-32 md:h-48 lg:h-56 bg-gradient-to-r from-primary/20 to-primary/40"
        style={channel.banner_url ? { 
          backgroundImage: `url(${channel.banner_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      />
      
      {/* Channel Info */}
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 py-4">
          <Avatar className="w-20 h-20 md:w-32 md:h-32 border-4 border-background -mt-10 md:-mt-16">
            <AvatarImage src={channel.avatar_url} />
            <AvatarFallback className="text-3xl">{channel.name?.[0] || 'C'}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold">{channel.name}</h1>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
              <span>@{channel.username || channel.name?.toLowerCase().replace(/\s+/g, '')}</span>
              <span>•</span>
              <span>{channelVideos.length} videos</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {channel.description || 'No description'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <SubscribeButton 
              channelId={channelId || ''}
              channelOwnerId={channel.user_id}
            />
          </div>
        </div>
        
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <div className="flex items-center justify-between border-b border-border">
            <TabsList className="bg-transparent h-12 p-0 gap-6">
              <TabsTrigger 
                value="videos"
                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-1 pb-3"
              >
                Videos
              </TabsTrigger>
              <TabsTrigger 
                value="shorts"
                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-1 pb-3"
              >
                Shorts
              </TabsTrigger>
              <TabsTrigger 
                value="about"
                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-1 pb-3"
              >
                About
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              >
                {viewMode === "grid" ? <ListVideo className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
              </Button>
            </div>
          </div>
          

          
          {/* Videos Tab */}
          <TabsContent value="videos" className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Button 
                variant={sortMode === "latest" ? "secondary" : "ghost"} 
                size="sm" 
                className="rounded-full"
                onClick={() => setSortMode("latest")}
              >
                Latest
              </Button>
              <Button 
                variant={sortMode === "popular" ? "secondary" : "ghost"} 
                size="sm" 
                className="rounded-full"
                onClick={() => setSortMode("popular")}
              >
                Popular
              </Button>
              <Button 
                variant={sortMode === "oldest" ? "secondary" : "ghost"} 
                size="sm" 
                className="rounded-full"
                onClick={() => setSortMode("oldest")}
              >
                Oldest
              </Button>
            </div>
            
            {videosLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className={viewMode === "grid" 
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                : "space-y-4"
              }>
                {sortedLongVideos.map((video) => (
                  <VideoCard key={video.id} video={video} layout={viewMode === "list" ? "list" : "grid"} activeMenuId={activeMenuId} onMenuToggle={setActiveMenuId} />
                ))}
              </div>
            )}
            
            {!videosLoading && longVideos.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No videos yet</p>
              </div>
            )}
          </TabsContent>
          
          {/* Shorts Tab */}
          <TabsContent value="shorts" className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Button 
                variant={sortMode === "latest" ? "secondary" : "ghost"} 
                size="sm" 
                className="rounded-full"
                onClick={() => setSortMode("latest")}
              >
                Latest
              </Button>
              <Button 
                variant={sortMode === "popular" ? "secondary" : "ghost"} 
                size="sm" 
                className="rounded-full"
                onClick={() => setSortMode("popular")}
              >
                Popular
              </Button>
              <Button 
                variant={sortMode === "oldest" ? "secondary" : "ghost"} 
                size="sm" 
                className="rounded-full"
                onClick={() => setSortMode("oldest")}
              >
                Oldest
              </Button>
            </div>
            {videosLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="aspect-[9/16] rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {sortedShortVideos.map((video) => (
                  <div 
                    key={video.id}
                    className="relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer group"
                    onClick={() => navigate(`/movion/shorts/${video.id}`)}
                  >
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-white text-sm font-medium line-clamp-2">{video.title}</p>
                      <p className="text-white/70 text-xs">{formatCount(video.views)} views</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!videosLoading && shortVideos.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No shorts yet</p>
              </div>
            )}
          </TabsContent>
          
          {/* About Tab */}
          <TabsContent value="about" className="mt-6">
            <div className="max-w-3xl">
              <h3 className="text-lg font-semibold mb-4">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {channel.description || "No description"}
              </p>
              
              <div className="mt-8 space-y-4">
                <div>
                  <h4 className="font-medium">Stats</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    Joined {channel.created_at ? new Date(channel.created_at).toLocaleDateString() : 'Recently'}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MovionChannel;
