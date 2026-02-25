import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  History, 
  Clock, 
  Bookmark, 
  ListVideo, 
  ArrowLeft,
  Play,
  Trash2,
  Plus,
  MoreVertical
} from "lucide-react";
import { MovionHeader } from "@/components/movion/MovionHeader";
import { useWatchHistory, useClearHistory } from "@/hooks/useWatchHistory";
import { useWatchLater, useClearWatchLater } from "@/hooks/useWatchLater";
import { useSavedVideos } from "@/hooks/useSavedVideos";
import { usePlaylists, useCreatePlaylist } from "@/hooks/usePlaylists";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MovionLibrary = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Get initial tab from URL or default to "history"
  const initialTab = searchParams.get("tab") || "history";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);

  // Update URL when tab changes (SPA navigation)
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Sync tab state with URL on mount and when URL changes
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  const { watchHistory, isLoading: historyLoading } = useWatchHistory();
  const { watchLater, isLoading: laterLoading } = useWatchLater();
  const { savedVideos, isLoading: savedLoading } = useSavedVideos();
  const { playlists, isLoading: playlistsLoading } = usePlaylists();
  
  const clearHistory = useClearHistory();
  const clearWatchLater = useClearWatchLater();
  const createPlaylist = useCreatePlaylist();

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    await createPlaylist.mutateAsync({ title: newPlaylistName.trim() });
    setNewPlaylistName("");
    setCreatePlaylistOpen(false);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Please sign in to view your library</p>
            <Button onClick={() => navigate('/auth')} className="mt-4">Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const VideoCard = ({ item, showProgress = false }: { item: any; showProgress?: boolean }) => {
    const video = item.videos;
    if (!video) return null;

    return (
      <div 
        className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
        onClick={() => navigate(`/video/${video.id}`)}
      >
        <div className="relative w-40 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {video.duration && (
            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
              {formatDuration(video.duration)}
            </span>
          )}
          {showProgress && item.watch_percentage && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted-foreground/30">
              <div 
                className="h-full bg-cyan-500" 
                style={{ width: `${item.watch_percentage}%` }}
              />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play className="w-10 h-10 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium line-clamp-2">{video.title}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {video.channels?.name || 'Unknown Channel'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {video.views_count?.toLocaleString() || 0} views
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
              Add to Playlist
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
              Share
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <MovionHeader onSearch={() => {}} onMenuClick={() => {}} />
      
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/movion')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Library</h1>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" /> History
            </TabsTrigger>
            <TabsTrigger value="later" className="gap-2">
              <Clock className="w-4 h-4" /> Watch Later
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Bookmark className="w-4 h-4" /> Saved
            </TabsTrigger>
            <TabsTrigger value="playlists" className="gap-2">
              <ListVideo className="w-4 h-4" /> Playlists
            </TabsTrigger>
          </TabsList>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Watch History
                </CardTitle>
                {watchHistory && watchHistory.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:text-red-600"
                    onClick={() => clearHistory.mutate()}
                    disabled={clearHistory.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : watchHistory && watchHistory.length > 0 ? (
                  <div className="space-y-1">
                    {watchHistory.map((item) => (
                      <VideoCard key={item.id} item={item} showProgress />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No watch history yet</p>
                    <p className="text-sm mt-1">Videos you watch will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Watch Later Tab */}
          <TabsContent value="later">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Watch Later
                </CardTitle>
                {watchLater && watchLater.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:text-red-600"
                    onClick={() => clearWatchLater.mutate()}
                    disabled={clearWatchLater.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {laterLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : watchLater && watchLater.length > 0 ? (
                  <div className="space-y-1">
                    {watchLater.map((item) => (
                      <VideoCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No videos saved for later</p>
                    <p className="text-sm mt-1">Save videos to watch them later</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Saved Tab */}
          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5" />
                  Saved Videos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {savedLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : savedVideos && savedVideos.length > 0 ? (
                  <div className="space-y-1">
                    {savedVideos.map((item) => (
                      <VideoCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bookmark className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No saved videos</p>
                    <p className="text-sm mt-1">Save videos to find them easily later</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Playlists Tab */}
          <TabsContent value="playlists">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ListVideo className="w-5 h-5" />
                  Playlists
                </CardTitle>
                <Dialog open={createPlaylistOpen} onOpenChange={setCreatePlaylistOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <Plus className="w-4 h-4" />
                      New Playlist
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Playlist</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="playlistName">Playlist Name</Label>
                        <Input
                          id="playlistName"
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          placeholder="My Playlist"
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        onClick={handleCreatePlaylist} 
                        className="w-full"
                        disabled={!newPlaylistName.trim() || createPlaylist.isPending}
                      >
                        {createPlaylist.isPending ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {playlistsLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : playlists && playlists.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {playlists.map((playlist) => (
                      <Card 
                        key={playlist.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
                        onClick={() => navigate(`/playlist/${playlist.id}`)}
                      >
                        <div className="aspect-video bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
                          {playlist.thumbnail_url ? (
                            <img src={playlist.thumbnail_url} alt={playlist.title} className="w-full h-full object-cover" />
                          ) : (
                            <ListVideo className="w-12 h-12 text-muted-foreground" />
                          )}
                        </div>
                        <CardContent className="p-3">
                          <p className="font-medium truncate">{playlist.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {playlist.video_count || 0} videos
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ListVideo className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No playlists yet</p>
                    <p className="text-sm mt-1">Create a playlist to organize your videos</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MovionLibrary;
