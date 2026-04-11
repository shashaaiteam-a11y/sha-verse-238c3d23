// Movion Library Page - YouTube-style Library with History, Watch Later, Liked, Playlists
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  History, Clock, ThumbsUp, ListVideo, Play, Trash2, Loader2, Plus, Lock, Globe, MoreVertical
} from "lucide-react";
import { useWatchHistory, useClearHistory } from "@/hooks/useWatchHistory";
import { useWatchLater, useToggleWatchLater, useClearWatchLater } from "@/hooks/useWatchLater";
import { useLikedVideos } from "@/hooks/useLikedVideos";
import { usePlaylists, useCreatePlaylist, useDeletePlaylist, usePlaylistVideos, useRemoveFromPlaylist } from "@/hooks/usePlaylists";
import { useMovionRealtime } from "@/hooks/useMovionRealtime";
import { useAuth } from "@/contexts/AuthContext";
import { VideoCard } from "../components";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { VideoType, MovionVideo } from "../types";
import { toast } from "sonner";

const formatDuration = (seconds?: number) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatCount = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const transformVideo = (item: any): MovionVideo | null => {
  const video = item.videos || item;
  if (!video || !video.id) return null;
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

// Horizontal video row item
const VideoRowItem = ({ video, onPlay, actions }: { video: MovionVideo; onPlay: () => void; actions?: React.ReactNode }) => (
  <div className="flex gap-3 md:gap-4 group">
    <div 
      className="relative w-36 sm:w-40 md:w-56 aspect-video rounded-lg overflow-hidden cursor-pointer flex-shrink-0"
      onClick={onPlay}
    >
      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Play className="w-8 h-8 text-white" fill="white" />
      </div>
      <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">{video.duration}</span>
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="font-medium text-sm md:text-base line-clamp-2 cursor-pointer hover:text-primary" onClick={onPlay}>
        {video.title}
      </h3>
      <p className="text-xs md:text-sm text-muted-foreground mt-1">{video.channelName}</p>
      <p className="text-xs md:text-sm text-muted-foreground">{formatCount(video.views)} views • {video.timestamp}</p>
    </div>
    {actions}
  </div>
);

const MovionLibrary = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Data hooks
  const { watchHistory, isLoading: historyLoading } = useWatchHistory();
  const { watchLater, isLoading: watchLaterLoading } = useWatchLater();
  const { likedVideos, isLoading: likedLoading } = useLikedVideos();
  const { playlists, isLoading: playlistsLoading } = usePlaylists();
  const clearHistory = useClearHistory();
  const clearWatchLater = useClearWatchLater();
  const toggleWatchLater = useToggleWatchLater();
  const createPlaylist = useCreatePlaylist();
  const deletePlaylist = useDeletePlaylist();

  // Realtime
  useMovionRealtime();
  
  const initialTab = searchParams.get('tab') || 'history';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Playlist creation dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistPublic, setNewPlaylistPublic] = useState(false);

  // Expanded playlist
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);

  // Transform data
  const historyVideos = (watchHistory || []).map(transformVideo).filter(Boolean) as MovionVideo[];
  const watchLaterVideos = (watchLater || []).map(transformVideo).filter(Boolean) as MovionVideo[];
  const likedVideosList = (likedVideos || []).map(transformVideo).filter(Boolean) as MovionVideo[];

  const handleCreatePlaylist = () => {
    if (!newPlaylistTitle.trim()) return;
    createPlaylist.mutate(
      { title: newPlaylistTitle.trim(), isPublic: newPlaylistPublic },
      {
        onSuccess: () => {
          setNewPlaylistTitle('');
          setNewPlaylistPublic(false);
          setShowCreateDialog(false);
        },
      }
    );
  };

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
    <div className="min-h-screen bg-background text-foreground p-3 md:p-4 pb-20">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Library</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 md:mb-6 w-full justify-start overflow-x-auto">
            <TabsTrigger value="history" className="gap-1.5 text-xs md:text-sm">
              <History className="w-3.5 h-3.5 md:w-4 md:h-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="watch-later" className="gap-1.5 text-xs md:text-sm">
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Watch later
            </TabsTrigger>
            <TabsTrigger value="liked" className="gap-1.5 text-xs md:text-sm">
              <ThumbsUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Liked
            </TabsTrigger>
            <TabsTrigger value="playlists" className="gap-1.5 text-xs md:text-sm">
              <ListVideo className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Playlists
            </TabsTrigger>
          </TabsList>
          
          {/* ====== HISTORY TAB ====== */}
          <TabsContent value="history">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold">Watch history</h2>
              {historyVideos.length > 0 && (
                <Button 
                  variant="outline" size="sm"
                  onClick={() => clearHistory.mutate()}
                  disabled={clearHistory.isPending}
                >
                  {clearHistory.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
                  Clear
                </Button>
              )}
            </div>
            
            {historyLoading ? (
              <LoadingSkeleton type="list" />
            ) : historyVideos.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {historyVideos.map((video) => (
                  <VideoRowItem 
                    key={video.id} 
                    video={video} 
                    onPlay={() => navigate(`/movion/watch/${video.id}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={History} title="No watch history yet" subtitle="Videos you watch will appear here" />
            )}
          </TabsContent>
          
          {/* ====== WATCH LATER TAB ====== */}
          <TabsContent value="watch-later">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold">
                Watch later
                {watchLaterVideos.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">{watchLaterVideos.length} videos</span>
                )}
              </h2>
              {watchLaterVideos.length > 0 && (
                <Button 
                  variant="outline" size="sm"
                  onClick={() => clearWatchLater.mutate()}
                  disabled={clearWatchLater.isPending}
                >
                  {clearWatchLater.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
                  Clear all
                </Button>
              )}
            </div>
            
            {watchLaterLoading ? (
              <LoadingSkeleton type="list" />
            ) : watchLaterVideos.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {watchLaterVideos.map((video) => (
                  <VideoRowItem 
                    key={video.id} 
                    video={video} 
                    onPlay={() => navigate(`/movion/watch/${video.id}`)}
                    actions={
                      <Button 
                        variant="ghost" size="icon"
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 self-start"
                        onClick={() => toggleWatchLater.mutate({ videoId: video.id, isInList: true })}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={Clock} title="No videos in Watch later" subtitle="Save videos to watch later" />
            )}
          </TabsContent>
          
          {/* ====== LIKED VIDEOS TAB ====== */}
          <TabsContent value="liked">
            <h2 className="text-lg md:text-xl font-semibold mb-4">
              Liked videos
              {likedVideosList.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">{likedVideosList.length} videos</span>
              )}
            </h2>
            
            {likedLoading ? (
              <LoadingSkeleton type="list" />
            ) : likedVideosList.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {likedVideosList.map((video) => (
                  <VideoRowItem 
                    key={video.id} 
                    video={video} 
                    onPlay={() => navigate(`/movion/watch/${video.id}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={ThumbsUp} title="No liked videos" subtitle="Videos you like will appear here" />
            )}
          </TabsContent>
          
          {/* ====== PLAYLISTS TAB ====== */}
          <TabsContent value="playlists">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold">Playlists</h2>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    New playlist
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create new playlist</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <Input 
                      placeholder="Playlist title" 
                      value={newPlaylistTitle}
                      onChange={(e) => setNewPlaylistTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                    />
                    <div className="flex items-center justify-between">
                      <Label htmlFor="playlist-public" className="flex items-center gap-2">
                        {newPlaylistPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        {newPlaylistPublic ? 'Public' : 'Private'}
                      </Label>
                      <Switch 
                        id="playlist-public"
                        checked={newPlaylistPublic}
                        onCheckedChange={setNewPlaylistPublic}
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleCreatePlaylist}
                      disabled={!newPlaylistTitle.trim() || createPlaylist.isPending}
                    >
                      {createPlaylist.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Create
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {playlistsLoading ? (
              <LoadingSkeleton type="grid" />
            ) : (playlists || []).length > 0 ? (
              <div className="space-y-3">
                {(playlists || []).map((playlist: any) => (
                  <PlaylistCard 
                    key={playlist.id}
                    playlist={playlist}
                    isExpanded={expandedPlaylist === playlist.id}
                    onToggle={() => setExpandedPlaylist(expandedPlaylist === playlist.id ? null : playlist.id)}
                    onDelete={() => deletePlaylist.mutate(playlist.id)}
                    onPlayVideo={(videoId: string) => navigate(`/movion/watch/${videoId}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={ListVideo} title="No playlists created" subtitle="Create a playlist to organize your videos" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Playlist card with expandable video list
const PlaylistCard = ({ playlist, isExpanded, onToggle, onDelete, onPlayVideo }: {
  playlist: any;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onPlayVideo: (videoId: string) => void;
}) => {
  const { videos, isLoading } = usePlaylistVideos(isExpanded ? playlist.id : undefined);
  const removeFromPlaylist = useRemoveFromPlaylist();

  const playlistVideos = (videos || []).map(transformVideo).filter(Boolean) as MovionVideo[];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div 
        className="flex items-center gap-3 p-3 md:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
          <ListVideo className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm md:text-base truncate">{playlist.title}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {playlist.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {playlist.video_count || 0} videos
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Delete playlist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isExpanded && (
        <div className="border-t border-border p-3 md:p-4 space-y-3 bg-muted/20">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading videos...
            </div>
          ) : playlistVideos.length > 0 ? (
            playlistVideos.map((video) => (
              <VideoRowItem
                key={video.id}
                video={video}
                onPlay={() => onPlayVideo(video.id)}
                actions={
                  <Button 
                    variant="ghost" size="icon" className="flex-shrink-0 self-start"
                    onClick={() => removeFromPlaylist.mutate({ playlistId: playlist.id, videoId: video.id })}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                }
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No videos in this playlist</p>
          )}
        </div>
      )}
    </div>
  );
};

// Loading skeleton
const LoadingSkeleton = ({ type }: { type: 'list' | 'grid' }) => {
  if (type === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-video rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-4">
          <Skeleton className="w-40 md:w-56 aspect-video rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Empty state
const EmptyState = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) => (
  <div className="text-center py-12 text-muted-foreground">
    <Icon className="w-16 h-16 mx-auto mb-4 opacity-50" />
    <p className="font-medium">{title}</p>
    <p className="text-sm mt-1">{subtitle}</p>
  </div>
);

export default MovionLibrary;
