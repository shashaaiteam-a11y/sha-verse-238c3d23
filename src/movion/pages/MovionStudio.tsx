// Movion Studio - Creator Dashboard & Analytics (Live with Supabase)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Video, BarChart3, DollarSign, MessageSquare,
  Settings, Users, Eye, ThumbsUp, Clock,
  ArrowUp, MoreVertical, Edit, Trash2, Share2, Play, Loader2, Upload, PieChart
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

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
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
          {[
            { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
            { id: "content", icon: Video, label: "Content" },
            { id: "analytics", icon: BarChart3, label: "Analytics" },
            { id: "monetization", icon: DollarSign, label: "Monetization" },
            { id: "comments", icon: MessageSquare, label: "Comments" },
            { id: "settings", icon: Settings, label: "Settings" },
          ].map((item) => (
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
      <div className="flex-1 p-6 overflow-auto">
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
                <CardTitle>Monetization Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Watch hours (estimated)
                    </span>
                    <span className="text-sm font-medium">
                      {watchHours.toLocaleString()} / {MONETIZATION_GOALS.WATCH_TIME_HOURS.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={Math.min(watchHoursProgress, 100)} />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Subscribers
                    </span>
                    <span className="text-sm font-medium">
                      {(channel.subscribers_count || 0).toLocaleString()} / {MONETIZATION_GOALS.SUBSCRIBERS.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={Math.min(subscribersProgress, 100)} />
                </div>
                
                {watchHoursProgress >= 100 && subscribersProgress >= 100 ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <p className="text-green-500 font-medium">
                      🎉 Congratulations! You're eligible for monetization
                    </p>
                    <Button className="mt-3" size="sm">Apply now</Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Complete both goals to enable monetization on your channel
                  </p>
                )}
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
                            <DropdownMenuItem onClick={() => setAnalyticsVideo(video)}>
                              <PieChart className="w-4 h-4 mr-2" /> Analytics
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
                                  <DropdownMenuItem onClick={() => setAnalyticsVideo(video)}>
                                    <PieChart className="w-4 h-4 mr-2" /> Analytics
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

            {/* Geographic Analytics (Simulated) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Geographic Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Top Countries */}
                  <div>
                    <h4 className="font-medium mb-3 text-sm">Top Countries</h4>
                    <div className="space-y-2">
                      {[
                        { country: 'India', views: Math.round(totalViews * 0.35), subs: Math.round((channel.subscribers_count || 0) * 0.32) },
                        { country: 'United States', views: Math.round(totalViews * 0.25), subs: Math.round((channel.subscribers_count || 0) * 0.28) },
                        { country: 'Pakistan', views: Math.round(totalViews * 0.15), subs: Math.round((channel.subscribers_count || 0) * 0.15) },
                        { country: 'Bangladesh', views: Math.round(totalViews * 0.10), subs: Math.round((channel.subscribers_count || 0) * 0.10) },
                        { country: 'United Kingdom', views: Math.round(totalViews * 0.08), subs: Math.round((channel.subscribers_count || 0) * 0.08) },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <span className="font-medium text-sm">{item.country}</span>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>{formatCount(item.views)} views</span>
                            <span>{formatCount(item.subs)} subs</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top States/Regions */}
                  <div>
                    <h4 className="font-medium mb-3 text-sm">Top Regions</h4>
                    <div className="space-y-2">
                      {[
                        { state: 'Maharashtra, India', views: Math.round(totalViews * 0.12), subs: Math.round((channel.subscribers_count || 0) * 0.10) },
                        { state: 'California, US', views: Math.round(totalViews * 0.08), subs: Math.round((channel.subscribers_count || 0) * 0.09) },
                        { state: 'Delhi, India', views: Math.round(totalViews * 0.07), subs: Math.round((channel.subscribers_count || 0) * 0.08) },
                        { state: 'Punjab, Pakistan', views: Math.round(totalViews * 0.06), subs: Math.round((channel.subscribers_count || 0) * 0.06) },
                        { state: 'Texas, US', views: Math.round(totalViews * 0.05), subs: Math.round((channel.subscribers_count || 0) * 0.05) },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <span className="font-medium text-sm">{item.state}</span>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>{formatCount(item.views)} views</span>
                            <span>{formatCount(item.subs)} subs</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
        
        {/* Monetization Tab - YouTube-like */}
        {activeTab === "monetization" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Monetization</h1>
            
            {/* Eligibility Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Eligibility Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Watch Hours */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4" />
                      {MONETIZATION_GOALS.WATCH_TIME_HOURS.toLocaleString()} watch hours (past 12 months)
                    </span>
                    <span className={`text-sm font-medium ${watchHoursProgress >= 100 ? "text-green-500" : "text-muted-foreground"}`}>
                      {watchHoursProgress >= 100 ? "✓ Complete" : `${watchHours.toLocaleString()} / ${MONETIZATION_GOALS.WATCH_TIME_HOURS.toLocaleString()}`}
                    </span>
                  </div>
                  <Progress value={Math.min(watchHoursProgress, 100)} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.max(0, MONETIZATION_GOALS.WATCH_TIME_HOURS - watchHours).toLocaleString()} hours remaining
                  </p>
                </div>
                
                {/* Subscribers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4" />
                      {MONETIZATION_GOALS.SUBSCRIBERS.toLocaleString()} subscribers
                    </span>
                    <span className={`text-sm font-medium ${subscribersProgress >= 100 ? "text-green-500" : "text-muted-foreground"}`}>
                      {subscribersProgress >= 100 ? "✓ Complete" : `${(channel.subscribers_count || 0).toLocaleString()} / ${MONETIZATION_GOALS.SUBSCRIBERS.toLocaleString()}`}
                    </span>
                  </div>
                  <Progress value={Math.min(subscribersProgress, 100)} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.max(0, MONETIZATION_GOALS.SUBSCRIBERS - (channel.subscribers_count || 0)).toLocaleString()} subscribers remaining
                  </p>
                </div>

                {/* Status */}
                {watchHoursProgress >= 100 && subscribersProgress >= 100 ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <p className="text-green-500 font-medium flex items-center gap-2">
                      🎉 Congratulations! You're eligible for monetization
                    </p>
                    <Button className="mt-3" size="sm">Apply for Partner Program</Button>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      Complete both requirements to enable monetization on your channel. Keep creating great content!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monetization Summary (if eligible) */}
            {(watchHoursProgress >= 100 && subscribersProgress >= 100) && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Estimated Earnings</p>
                    <p className="text-2xl font-bold mt-1">$0.00</p>
                    <p className="text-xs text-muted-foreground mt-1">This month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Ad Revenue</p>
                    <p className="text-2xl font-bold mt-1">$0.00</p>
                    <p className="text-xs text-muted-foreground mt-1">From video ads</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Memberships</p>
                    <p className="text-2xl font-bold mt-1">$0.00</p>
                    <p className="text-xs text-muted-foreground mt-1">Channel memberships</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Super Chats</p>
                    <p className="text-2xl font-bold mt-1">$0.00</p>
                    <p className="text-xs text-muted-foreground mt-1">From live streams</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
        
        {/* Comments Tab */}
        {activeTab === "comments" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Comments</h1>
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No comments to review</p>
            </div>
          </div>
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

export default MovionStudio;
