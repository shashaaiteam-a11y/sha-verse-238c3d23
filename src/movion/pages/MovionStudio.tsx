// Movion Studio - Creator Dashboard & Analytics (Live with Supabase)
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Video, BarChart3, DollarSign, MessageSquare,
  Settings, Users, Eye, ThumbsUp, Clock,
  ArrowUp, MoreVertical, Edit, Trash2, Share2, Play, Loader2, Upload, PieChart,
  ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMyChannel, useChannelVideos } from "@/hooks/useChannels";
import { useCreatorStats } from "@/hooks/useCreatorDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MONETIZATION_GOALS } from "../constants";
import { toast } from "sonner";
import { VideoEditDialog } from "@/components/movion/VideoEditDialog";
import { VideoDeleteDialog } from "@/components/movion/VideoDeleteDialog";
import { VideoAnalyticsDialog } from "@/components/movion/VideoAnalyticsDialog";
import { ChannelSettingsDialog } from "@/components/movion/ChannelSettingsDialog";

const MovionStudio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { channel, isLoading: channelLoading } = useMyChannel();
  const { videos, isLoading: videosLoading } = useChannelVideos(channel?.id);
  const { stats } = useCreatorStats(channel?.id);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Dialog states
  const [editVideo, setEditVideo] = useState<any>(null);
  const [deleteVideo, setDeleteVideo] = useState<any>(null);
  const [analyticsVideo, setAnalyticsVideo] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const channelVideos = videos || [];
  const longVideos = channelVideos.filter((v: any) => !v.is_short);
  const shortVideos = channelVideos.filter((v: any) => v.is_short);
  
  // Real-time stats calculations
  const totalViews = stats?.totalViews || channelVideos.reduce((sum: number, v: any) => sum + (v.views_count || 0), 0);
  const totalLikes = stats?.totalReacts || channelVideos.reduce((sum: number, v: any) => sum + (v.likes_count || 0), 0);
  const totalWatchMinutes = channelVideos.reduce((sum: number, v: any) => sum + ((v.views_count || 0) * (v.duration || 60) / 60), 0);
  const watchHours = Math.floor(totalWatchMinutes / 60);
  
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShare = async (video: any) => {
    const shareUrl = `${window.location.origin}/movion/watch/${video.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: `Check out this video: ${video.title}`,
          url: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Link copied to clipboard!");
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    }
  };
  
  const watchHoursProgress = (watchHours / MONETIZATION_GOALS.WATCH_TIME_HOURS) * 100;
  const subscribersProgress = channel ? ((channel.subscribers_count || 0) / MONETIZATION_GOALS.SUBSCRIBERS) * 100 : 0;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Video className="w-24 h-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-bold mb-2">Sign in to access Studio</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Manage your channel and view analytics
        </p>
        <Button onClick={() => navigate("/auth")}>Sign in</Button>
      </div>
    );
  }

  if (channelLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Video className="w-24 h-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-bold mb-2">Create your channel</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Start uploading videos and building your audience
        </p>
        <Button onClick={() => navigate("/movion/upload")}>Create Channel & Upload</Button>
      </div>
    );
  }

  const studioNavItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "content", icon: Video, label: "Content" },
    { id: "analytics", icon: BarChart3, label: "Analytics" },
    { id: "monetization", icon: DollarSign, label: "Monetization" },
    { id: "comments", icon: MessageSquare, label: "Comments" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Top Nav */}
      <div className="md:hidden border-b border-border bg-background sticky top-0 z-20">
        <div className="flex items-center gap-3 p-3 border-b border-border">
          <Avatar className="w-8 h-8">
            <AvatarImage src={channel.avatar_url} />
            <AvatarFallback>{channel.name?.[0] || 'C'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{channel.name}</p>
            <p className="text-xs text-muted-foreground">Your channel</p>
          </div>
        </div>
        <div className="flex overflow-x-auto no-scrollbar">
          {studioNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.id === "settings" ? setShowSettings(true) : setActiveTab(item.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors flex-shrink-0
                ${activeTab === item.id 
                  ? "border-primary text-primary font-semibold" 
                  : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="w-60 border-r border-border p-4 hidden md:block">
        <div className="flex items-center gap-3 mb-6">
          <Avatar className="w-10 h-10">
            <AvatarImage src={channel.avatar_url} />
            <AvatarFallback>{channel.name?.[0] || 'C'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{channel.name}</p>
            <p className="text-xs text-muted-foreground">Your channel</p>
          </div>
        </div>
        
        <nav className="space-y-1">
          {studioNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.id === "settings" ? setShowSettings(true) : setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                ${activeTab === item.id 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Channel Dashboard</h1>
            
            {/* Stats Cards - Real-time */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Views
                  </CardTitle>
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCount(totalViews)}</div>
                  <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                    <ArrowUp className="w-3 h-3" /> +12% from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Subscribers
                  </CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCount(channel.subscribers_count || 0)}</div>
                  <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                    <ArrowUp className="w-3 h-3" /> Growing
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Videos
                  </CardTitle>
                  <Video className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{channelVideos.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total uploads
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Likes
                  </CardTitle>
                  <ThumbsUp className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCount(totalLikes)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across all videos
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Monetization Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Monetization</span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">Coming Soon</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Monetization feature is coming soon. Keep creating great content and growing your channel!
                </p>
              </CardContent>
            </Card>
            
            {/* Recent Videos */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Content</CardTitle>
              </CardHeader>
              <CardContent>
                {videosLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="w-28 aspect-video rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : channelVideos.length > 0 ? (
                  <div className="space-y-4">
                    {channelVideos.slice(0, 5).map((video: any) => (
                      <div key={video.id} className="flex items-center gap-4">
                        <div 
                          className="relative w-28 aspect-video rounded overflow-hidden flex-shrink-0 cursor-pointer"
                          onClick={() => navigate(`/movion/watch/${video.id}`)}
                        >
                          <img 
                            src={video.thumbnail_url || 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400'} 
                            alt={video.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                            {formatDuration(video.duration)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium line-clamp-1">{video.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCount(video.views_count || 0)} views • {video.created_at ? new Date(video.created_at).toLocaleDateString() : 'Recently'}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/movion/watch/${video.id}`)}>
                              <Play className="w-4 h-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditVideo(video)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShare(video)}>
                              <Share2 className="w-4 h-4 mr-2" /> Share
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteVideo(video)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No videos uploaded yet</p>
                    <Button className="mt-4" onClick={() => navigate("/movion/upload")}>
                      Upload your first video
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Content Tab */}
        {activeTab === "content" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Channel Content</h1>
              <Button onClick={() => navigate("/movion/upload")}>
                <Upload className="w-4 h-4 mr-2" /> Upload
              </Button>
            </div>
            
            <Tabs defaultValue="videos">
              <TabsList>
                <TabsTrigger value="upload" onClick={() => navigate("/movion/upload")}>Upload</TabsTrigger>
                <TabsTrigger value="videos">Videos ({longVideos.length})</TabsTrigger>
                <TabsTrigger value="shorts">Shorts ({shortVideos.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="videos" className="mt-4">
                {videosLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                        <Skeleton className="w-24 aspect-video rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : longVideos.length > 0 ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="text-left p-3 font-medium">Video</th>
                          <th className="text-left p-3 font-medium hidden sm:table-cell">Views</th>
                          <th className="text-left p-3 font-medium hidden sm:table-cell">Likes</th>
                          <th className="text-left p-3 font-medium hidden md:table-cell">Date</th>
                          <th className="p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {longVideos.map((video: any) => (
                          <tr key={video.id} className="border-t border-border">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={video.thumbnail_url || 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400'} 
                                  alt={video.title}
                                  className="w-24 aspect-video object-cover rounded cursor-pointer"
                                  onClick={() => navigate(`/movion/watch/${video.id}`)}
                                />
                                <div>
                                  <p className="font-medium line-clamp-1">{video.title}</p>
                                  <p className="text-sm text-muted-foreground">{formatDuration(video.duration)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 hidden sm:table-cell">{formatCount(video.views_count || 0)}</td>
                            <td className="p-3 hidden sm:table-cell">{formatCount(video.likes_count || 0)}</td>
                            <td className="p-3 text-muted-foreground hidden md:table-cell">
                              {video.created_at ? new Date(video.created_at).toLocaleDateString() : 'Recently'}
                            </td>
                            <td className="p-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/movion/watch/${video.id}`)}>
                                    <Play className="w-4 h-4 mr-2" /> View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setEditVideo(video)}>
                                    <Edit className="w-4 h-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => setDeleteVideo(video)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No videos yet</p>
                    <Button className="mt-4" onClick={() => navigate("/movion/upload")}>
                      Upload your first video
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="shorts" className="mt-4">
                {shortVideos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {shortVideos.map((video: any) => (
                      <div 
                        key={video.id}
                        className="relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer group"
                        onClick={() => navigate(`/movion/shorts/${video.id}`)}
                      >
                        <img 
                          src={video.thumbnail_url || 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400'} 
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-white text-sm font-medium line-clamp-2">{video.title}</p>
                          <p className="text-white/70 text-xs">{formatCount(video.views_count || 0)} views</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No shorts uploaded</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {/* Analytics Tab - Overall Channel Analytics */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Channel Analytics</h1>
            
            {/* Overview Stats - Real-time */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Views</p>
                      <p className="text-3xl font-bold mt-2">{formatCount(totalViews)}</p>
                      <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                        <ArrowUp className="w-3 h-3" /> Real-time
                      </p>
                    </div>
                    <Eye className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Subscribers</p>
                      <p className="text-3xl font-bold mt-2">{formatCount(channel.subscribers_count || 0)}</p>
                      <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                        <ArrowUp className="w-3 h-3" /> Real-time
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Likes</p>
                      <p className="text-3xl font-bold mt-2">{formatCount(totalLikes)}</p>
                      <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                        <ArrowUp className="w-3 h-3" /> Real-time
                      </p>
                    </div>
                    <ThumbsUp className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Per-Video Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Video Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {channelVideos.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                      <div className="col-span-5">Video</div>
                      <div className="col-span-2 text-center">Views</div>
                      <div className="col-span-2 text-center">Likes</div>
                      <div className="col-span-3 text-center">Date</div>
                    </div>
                    {[...channelVideos]
                      .sort((a: any, b: any) => (b.views_count || 0) - (a.views_count || 0))
                      .map((video: any) => (
                        <div key={video.id} className="grid grid-cols-12 gap-2 items-center py-2 hover:bg-muted/50 rounded-lg transition-colors">
                          <div className="col-span-5 flex items-center gap-2">
                            <img 
                              src={video.thumbnail_url || 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400'} 
                              alt={video.title}
                              className="w-16 aspect-video object-cover rounded cursor-pointer"
                              onClick={() => navigate(`/movion/watch/${video.id}`)}
                            />
                            <p className="font-medium line-clamp-2 text-sm">{video.title}</p>
                          </div>
                          <div className="col-span-2 text-center">
                            <span className="font-medium">{formatCount(video.views_count || 0)}</span>
                          </div>
                          <div className="col-span-2 text-center">
                            <span className="font-medium">{formatCount(video.likes_count || 0)}</span>
                          </div>
                          <div className="col-span-3 text-center text-sm text-muted-foreground">
                            {video.created_at ? new Date(video.created_at).toLocaleDateString() : 'Recently'}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No videos yet</p>
                )}
              </CardContent>
            </Card>

            {/* Watch Time Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Watch Time Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">{watchHours.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground mt-1">Watch Hours (Total)</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">{Math.round(totalWatchMinutes).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground mt-1">Watch Minutes</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">{channelVideos.length > 0 ? Math.round(totalWatchMinutes / channelVideos.length) : 0}</p>
                    <p className="text-sm text-muted-foreground mt-1">Avg. Watch Time/Video (min)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Monetization Tab - Coming Soon */}
        {activeTab === "monetization" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Monetization</h1>
            
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <DollarSign className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  Monetization is on its way! We're working hard to bring this feature to Movion. Stay tuned and keep creating amazing content.
                </p>

                <div className="w-full max-w-md space-y-4 text-left bg-muted/50 rounded-xl p-6">
                  <h3 className="font-semibold text-sm text-center mb-4">Eligibility Requirements (Preview)</h3>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">7,500 watch hours (in last 12 months)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">2,500 subscribers (in last 12 months)</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-6">
                  We'll notify you when monetization becomes available.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Comments Tab */}
        {activeTab === "comments" && (
          <CommentsTab channelVideos={channelVideos} />
        )}
      </div>

      {/* Dialogs */}
      <VideoEditDialog
        open={!!editVideo}
        onOpenChange={(open) => !open && setEditVideo(null)}
        video={editVideo}
      />
      
      <VideoDeleteDialog
        open={!!deleteVideo}
        onOpenChange={(open) => !open && setDeleteVideo(null)}
        video={deleteVideo}
      />

      <VideoAnalyticsDialog
        open={!!analyticsVideo}
        onOpenChange={(open) => !open && setAnalyticsVideo(null)}
        video={analyticsVideo}
      />

      <ChannelSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        channel={channel}
        videos={channelVideos}
      />
    </div>
  );
};

// Comments Tab Component
const CommentsTab = ({ channelVideos }: { channelVideos: any[] }) => {
  const [expandedVideos, setExpandedVideos] = useState<Record<string, boolean>>({});
  const videoIds = useMemo(() => channelVideos.map((v: any) => v.id), [channelVideos]);

  const toggleVideo = (videoId: string) => {
    setExpandedVideos(prev => ({ ...prev, [videoId]: !prev[videoId] }));
  };

  const { data: allComments, isLoading: commentsLoading } = useQuery({
    queryKey: ['studio-all-comments', videoIds],
    queryFn: async () => {
      if (videoIds.length === 0) return [];
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .in('video_id', videoIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: videoIds.length > 0,
  });

  const commentsByVideo = useMemo(() => {
    if (!allComments) return {};
    const grouped: Record<string, any[]> = {};
    for (const comment of allComments) {
      const vid = comment.video_id;
      if (!grouped[vid]) grouped[vid] = [];
      grouped[vid].push(comment);
    }
    return grouped;
  }, [allComments]);

  const videoMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const v of channelVideos) {
      map[v.id] = v;
    }
    return map;
  }, [channelVideos]);

  const videosWithComments = useMemo(() => {
    return channelVideos.filter((v: any) => commentsByVideo[v.id]?.length > 0);
  }, [channelVideos, commentsByVideo]);

  const totalComments = allComments?.length || 0;

  if (commentsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Comments</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (totalComments === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Comments</h1>
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No comments on your videos yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Comments</h1>
        <span className="text-sm text-muted-foreground">
          {totalComments} comment{totalComments !== 1 ? 's' : ''} total
        </span>
      </div>

      {videosWithComments.map((video: any) => {
        const videoComments = commentsByVideo[video.id] || [];
        const isExpanded = expandedVideos[video.id] ?? false;
        return (
          <Card key={video.id}>
            <CardHeader
              className="pb-3 cursor-pointer select-none hover:bg-muted/30 transition-colors rounded-t-lg"
              onClick={() => toggleVideo(video.id)}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-medium truncate">{video.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {videoComments.length} comment{videoComments.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex-shrink-0 text-muted-foreground">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </div>
            </CardHeader>
            {isExpanded && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                {videoComments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={comment.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {(comment.profiles?.display_name || comment.profiles?.username || '?')[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {comment.profiles?.display_name || comment.profiles?.username || 'User'}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 mt-1 break-words">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default MovionStudio;
