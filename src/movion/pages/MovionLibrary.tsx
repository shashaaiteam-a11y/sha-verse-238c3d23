// Movion Library Page - Live with Supabase + Realtime
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  History, Clock, ThumbsUp, ListVideo, Play, Trash2, Loader2
} from "lucide-react";
import { useWatchHistory, useClearHistory } from "@/hooks/useWatchHistory";
import { useWatchLater, useToggleWatchLater } from "@/hooks/useWatchLater";
import { useSavedVideos } from "@/hooks/useSavedVideos";
import { useMovionRealtime } from "@/hooks/useMovionRealtime";
import { useAuth } from "@/contexts/AuthContext";
import { VideoCard } from "../components";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoType, MovionVideo } from "../types";
import { toast } from "sonner";

const formatDuration = (seconds?: number) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const transformHistoryVideo = (item: any): MovionVideo | null => {
  if (!item.videos) return null;
  const video = item.videos;
  return {
    id: video.id,
    title: video.title || 'Untitled',
    description: '',
    thumbnail: video.thumbnail_url || 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400',
    videoUrl: video.video_url || '',
    type: video.is_short ? VideoType.SHORT : VideoType.LONG,
    views: video.views_count || 0,
    likes: 0,
    dislikes: 0,
    timestamp: video.created_at ? new Date(video.created_at).toLocaleDateString() : 'Recently',
    duration: formatDuration(video.duration),
    channelId: video.channel_id,
    channelName: video.channels?.name || 'Unknown Channel',
    channelAvatar: video.channels?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.channel_id}`,
    category: video.category || 'Other',
    tags: [],
  };
};

const MovionLibrary = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { watchHistory, isLoading: historyLoading } = useWatchHistory();
  const { watchLater, isLoading: watchLaterLoading } = useWatchLater();
  const { savedVideos, isLoading: savedLoading } = useSavedVideos();
  const clearHistory = useClearHistory();
  const toggleWatchLater = useToggleWatchLater();

  // Enable realtime updates
  useMovionRealtime();
  
  const initialTab = searchParams.get('tab') || 'history';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Transform watch history items
  const historyVideos = (watchHistory || [])
    .map(transformHistoryVideo)
    .filter(Boolean) as MovionVideo[];

  // Transform watch later items
  const watchLaterVideos = (watchLater || [])
    .map(transformHistoryVideo)
    .filter(Boolean) as MovionVideo[];

  // Transform saved/liked videos
  const likedVideos = (savedVideos || [])
    .map(transformHistoryVideo)
    .filter(Boolean) as MovionVideo[];

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <History className="w-24 h-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-bold mb-2">Sign in to view your library</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Your watch history, saved videos, and playlists will appear here
        </p>
        <Button onClick={() => navigate("/auth")}>Sign in</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-2xl font-bold mb-6">Library</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="watch-later" className="gap-2">
              <Clock className="w-4 h-4" />
              Watch later
            </TabsTrigger>
            <TabsTrigger value="liked" className="gap-2">
              <ThumbsUp className="w-4 h-4" />
              Liked videos
            </TabsTrigger>
            <TabsTrigger value="playlists" className="gap-2">
              <ListVideo className="w-4 h-4" />
              Playlists
            </TabsTrigger>
          </TabsList>
          
          {/* History Tab */}
          <TabsContent value="history">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Watch history</h2>
              {historyVideos.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    clearHistory.mutate();
                    toast.success("History cleared");
                  }}
                  disabled={clearHistory.isPending}
                >
                  {clearHistory.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Clear history
                </Button>
              )}
            </div>
            
            {historyLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-40 md:w-60 aspect-video rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : historyVideos.length > 0 ? (
              <div className="space-y-4">
                {historyVideos.map((video) => (
                  <div key={video.id} className="flex gap-4 group">
                    <div 
                      className="relative w-40 md:w-60 aspect-video rounded-lg overflow-hidden cursor-pointer flex-shrink-0"
                      onClick={() => navigate(`/movion/watch/${video.id}`)}
                    >
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-10 h-10 text-white" fill="white" />
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                        {video.duration}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="font-medium line-clamp-2 cursor-pointer hover:text-primary"
                        onClick={() => navigate(`/movion/watch/${video.id}`)}
                      >
                        {video.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {video.channelName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCount(video.views)} views • {video.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No watch history yet</p>
                <p className="text-sm mt-1">Videos you watch will appear here</p>
              </div>
            )}
          </TabsContent>
          
          {/* Watch Later Tab */}
          <TabsContent value="watch-later">
            <h2 className="text-xl font-semibold mb-4">Watch later</h2>
            
            {watchLaterLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : watchLaterVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {watchLaterVideos.map((video) => (
                  <div key={video.id} className="relative group">
                    <VideoCard video={video} />
                    <Button 
                      variant="secondary" 
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                      onClick={() => toggleWatchLater.mutate({ videoId: video.id, isInList: true })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No videos in Watch later</p>
                <p className="text-sm mt-1">Save videos to watch later</p>
              </div>
            )}
          </TabsContent>
          
          {/* Liked Videos Tab */}
          <TabsContent value="liked">
            <h2 className="text-xl font-semibold mb-4">Liked videos</h2>
            
            {savedLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : likedVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {likedVideos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ThumbsUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No liked videos</p>
                <p className="text-sm mt-1">Videos you like will appear here</p>
              </div>
            )}
          </TabsContent>
          
          {/* Playlists Tab */}
          <TabsContent value="playlists">
            <h2 className="text-xl font-semibold mb-4">Playlists</h2>
            
            <div className="text-center py-12 text-muted-foreground">
              <ListVideo className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No playlists created</p>
              <Button className="mt-4">Create playlist</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MovionLibrary;
