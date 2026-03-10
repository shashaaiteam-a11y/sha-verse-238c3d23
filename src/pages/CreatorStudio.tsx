import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyChannel } from "@/hooks/useChannels";
import { useChannelVideos } from "@/hooks/useChannels";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Eye, 
  Clock, 
  ThumbsUp, 
  MessageSquare, 
  DollarSign,
  TrendingUp,
  Video,
  Users,
  Play,
  ArrowLeft,
  Upload
} from "lucide-react";
import { UploadVideoDialog } from "@/components/movion/UploadVideoDialog";
import { CreatorEarningsDashboard } from "@/components/movion/CreatorEarningsDashboard";
import { format, subDays } from "date-fns";

const CreatorStudio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { channel, isLoading: channelLoading } = useMyChannel();
  const { videos } = useChannelVideos(channel?.id);
  const [selectedTab, setSelectedTab] = useState("dashboard");

  // Fetch analytics data
  const { data: analytics } = useQuery({
    queryKey: ['channel-analytics', channel?.id],
    queryFn: async () => {
      if (!channel?.id) return null;
      
      // Get video IDs for this channel
      const { data: channelVideos } = await supabase
        .from('videos')
        .select('id')
        .eq('channel_id', channel.id);
      
      if (!channelVideos?.length) return null;
      
      const videoIds = channelVideos.map(v => v.id);
      
      // Get analytics for last 28 days
      const { data } = await supabase
        .from('video_analytics')
        .select('*')
        .in('video_id', videoIds)
        .gte('date', format(subDays(new Date(), 28), 'yyyy-MM-dd'));
      
      return data || [];
    },
    enabled: !!channel?.id,
  });

  // Calculate totals
  const totalViews = videos?.reduce((sum, v) => sum + (v.views_count || 0), 0) || 0;
  const totalLikes = videos?.reduce((sum, v) => sum + (v.likes_count || 0), 0) || 0;
  const totalComments = videos?.reduce((sum, v) => sum + (v.comments_count || 0), 0) || 0;
  const totalWatchTime = analytics?.reduce((sum, a) => sum + (a.watch_time_seconds || 0), 0) || 0;
  const totalRevenue = analytics?.reduce((sum, a) => sum + (a.estimated_revenue_cents || 0), 0) || 0;

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const formatWatchTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    if (hours >= 1000) return `${(hours / 1000).toFixed(1)}K hours`;
    return `${hours} hours`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to access Creator Studio</p>
      </div>
    );
  }

  if (channelLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Video className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Create Your Channel</h2>
            <p className="text-muted-foreground mb-4">
              You need a channel to access Creator Studio
            </p>
            <Button onClick={() => navigate('/movion')}>Go to Movion</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/movion')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              <span className="font-semibold text-lg">Creator Studio</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UploadVideoDialog 
              trigger={
                <Button size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              }
            />
            <Avatar className="h-8 w-8">
              <AvatarImage src={channel.avatar_url || ''} />
              <AvatarFallback>{channel.name[0]}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Channel Overview */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={channel.avatar_url || ''} />
            <AvatarFallback className="text-xl">{channel.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{channel.name}</h1>
            <p className="text-muted-foreground">
              {channel.subscribers_count || 0} subscribers · {videos?.length || 0} videos
            </p>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="earn">Earn</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">Total Views</span>
                  </div>
                  <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Watch Time</span>
                  </div>
                  <p className="text-2xl font-bold">{formatWatchTime(totalWatchTime)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Subscribers</span>
                  </div>
                  <p className="text-2xl font-bold">{(channel.subscribers_count || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Revenue (Est.)</span>
                  </div>
                  <p className="text-2xl font-bold">${(totalRevenue / 100).toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Videos Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Latest Video Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {videos && videos.length > 0 ? (
                  <div className="space-y-4">
                    {videos.slice(0, 5).map((video) => (
                      <div key={video.id} className="flex items-center gap-4">
                        <div className="relative w-24 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                          {video.thumbnail_url ? (
                            <img 
                              src={video.thumbnail_url} 
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          {video.duration && (
                            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                              {formatDuration(video.duration)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{video.title}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {video.views_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" />
                              {video.likes_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {video.comments_count || 0}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded ${
                            video.transcoding_status === 'completed' 
                              ? 'bg-green-500/10 text-green-500' 
                              : video.transcoding_status === 'processing'
                              ? 'bg-yellow-500/10 text-yellow-500'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {video.transcoding_status || 'pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No videos uploaded yet</p>
                    <UploadVideoDialog 
                      trigger={<Button className="mt-4">Upload your first video</Button>}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Channel Content</CardTitle>
                <UploadVideoDialog trigger={<Button size="sm"><Upload className="w-4 h-4 mr-2" />Upload</Button>} />
              </CardHeader>
              <CardContent>
                {videos && videos.length > 0 ? (
                  <div className="space-y-3">
                    {videos.map((video) => (
                      <div 
                        key={video.id} 
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/video/${video.id}`)}
                      >
                        <div className="relative w-32 h-18 rounded overflow-hidden bg-muted flex-shrink-0">
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
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{video.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{video.description}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{video.views_count || 0} views</span>
                            <span>{video.likes_count || 0} likes</span>
                            <span>{format(new Date(video.created_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No content yet</p>
                    <p className="text-sm mb-4">Upload your first video to get started</p>
                    <UploadVideoDialog trigger={<Button>Upload Video</Button>} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Channel Analytics (Last 28 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Views</p>
                      <p className="text-3xl font-bold">{totalViews.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Watch time</p>
                      <p className="text-3xl font-bold">{formatWatchTime(totalWatchTime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Subscribers</p>
                      <p className="text-3xl font-bold">{channel.subscribers_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Engagement</p>
                      <p className="text-3xl font-bold">{totalLikes + totalComments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Videos</CardTitle>
                </CardHeader>
                <CardContent>
                  {videos && videos.length > 0 ? (
                    <div className="space-y-4">
                      {[...videos]
                        .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
                        .slice(0, 5)
                        .map((video, index) => (
                          <div key={video.id} className="flex items-center gap-4">
                            <span className="text-2xl font-bold text-muted-foreground w-8">{index + 1}</span>
                            <div className="w-20 h-12 rounded overflow-hidden bg-muted">
                              {video.thumbnail_url && (
                                <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium truncate">{video.title}</p>
                              <p className="text-sm text-muted-foreground">{video.views_count || 0} views</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No videos to analyze</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Earn Tab */}
          <TabsContent value="earn">
            <CreatorEarningsDashboard channelId={channel.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CreatorStudio;
