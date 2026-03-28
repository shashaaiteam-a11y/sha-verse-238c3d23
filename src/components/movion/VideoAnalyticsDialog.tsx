import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Eye, ThumbsUp, MessageSquare, Share2, Clock, 
  TrendingUp, Users, Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface VideoAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    id: string;
    title: string;
    thumbnail_url?: string;
    views_count?: number;
    likes_count?: number;
    comments_count?: number;
    shares_count?: number;
    duration?: number;
    created_at?: string;
  } | null;
}



export function VideoAnalyticsDialog({ open, onOpenChange, video }: VideoAnalyticsDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch real-time video stats
  const { data: liveStats, isLoading } = useQuery({
    queryKey: ['video-analytics', video?.id],
    queryFn: async () => {
      if (!video?.id) return null;
      
      const { data, error } = await (supabase
        .from('videos') as any)
        .select('views_count, likes_count, comments_count, duration, created_at')
        .eq('id', video.id)
        .single();
        
      if (error) throw error;
      return data as {
        views_count?: number;
        likes_count?: number;
        comments_count?: number;
        duration?: number;
        created_at?: string;
      };
    },
    enabled: !!video?.id && open,
    refetchInterval: 5000, // Real-time updates every 5 seconds
  });

  // Fetch comments count
  const { data: commentsData } = useQuery({
    queryKey: ['video-comments-count', video?.id],
    queryFn: async () => {
      if (!video?.id) return { count: 0 };
      
      const { count, error } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', video.id);
        
      if (error) throw error;
      return { count: count || 0 };
    },
    enabled: !!video?.id && open,
    refetchInterval: 5000,
  });

  // Fetch likes count
  const { data: likesData } = useQuery({
    queryKey: ['video-likes-count', video?.id],
    queryFn: async () => {
      if (!video?.id) return { count: 0 };
      
      const { count, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', video.id);
        
      if (error) throw error;
      return { count: count || 0 };
    },
    enabled: !!video?.id && open,
    refetchInterval: 5000,
  });

  const stats = liveStats || video;
  const views = (stats as any)?.views_count || 0;
  const likes = likesData?.count || (stats as any)?.likes_count || 0;
  const comments = commentsData?.count || (stats as any)?.comments_count || 0;
  const shares = (stats as any)?.shares_count || 0;
  
  const geoData = generateGeoData(views);
  const indiaViews = geoData.find(g => g.code === 'IN')?.views || 0;
  const stateData = generateStateData(indiaViews);

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

  const formatDate = (date?: string) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate estimated watch time
  const avgWatchPercentage = 0.65; // Assume 65% average watch time
  const videoDuration = (stats as any)?.duration || 60;
  const totalWatchMinutes = Math.round((views * videoDuration * avgWatchPercentage) / 60);
  const watchHours = Math.floor(totalWatchMinutes / 60);
  const watchMins = totalWatchMinutes % 60;

  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <img 
              src={video.thumbnail_url || 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400'} 
              alt={video.title}
              className="w-16 aspect-video object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <p className="line-clamp-1">{video.title}</p>
              <p className="text-sm text-muted-foreground font-normal">Video Analytics</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                {/* Main Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs">Views</span>
                      </div>
                      <p className="text-2xl font-bold">{formatCount(views)}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <ThumbsUp className="w-4 h-4" />
                        <span className="text-xs">Likes</span>
                      </div>
                      <p className="text-2xl font-bold">{formatCount(likes)}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs">Comments</span>
                      </div>
                      <p className="text-2xl font-bold">{formatCount(comments)}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Share2 className="w-4 h-4" />
                        <span className="text-xs">Shares</span>
                      </div>
                      <p className="text-2xl font-bold">{formatCount(shares)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Watch Time */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Watch Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl font-bold">{watchHours}</span>
                      <span className="text-muted-foreground">hours</span>
                      <span className="text-xl font-bold">{watchMins}</span>
                      <span className="text-muted-foreground">minutes</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Video duration: {formatDuration(videoDuration)}
                    </p>
                  </CardContent>
                </Card>

                {/* Video Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Video Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Published</p>
                        <p className="font-medium">{formatDate((stats as any)?.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-medium">{formatDuration(videoDuration)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Engagement Rate</p>
                        <p className="font-medium">
                          {views > 0 ? ((likes + comments) / views * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Like Ratio</p>
                        <p className="font-medium">
                          {views > 0 ? (likes / views * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4 mt-4">
            {/* Engagement Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Engagement Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-secondary rounded-lg">
                    <ThumbsUp className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold">{formatCount(likes)}</p>
                    <p className="text-xs text-muted-foreground">Likes</p>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-bold">{formatCount(comments)}</p>
                    <p className="text-xs text-muted-foreground">Comments</p>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg">
                    <Share2 className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl font-bold">{formatCount(shares)}</p>
                    <p className="text-xs text-muted-foreground">Shares</p>
                  </div>
                </div>

                {/* Engagement ratios */}
                <div className="space-y-3 pt-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Like Rate</span>
                      <span className="text-sm font-medium">
                        {views > 0 ? (likes / views * 100).toFixed(2) : 0}%
                      </span>
                    </div>
                    <Progress value={views > 0 ? Math.min((likes / views * 100) * 10, 100) : 0} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Comment Rate</span>
                      <span className="text-sm font-medium">
                        {views > 0 ? (comments / views * 100).toFixed(2) : 0}%
                      </span>
                    </div>
                    <Progress value={views > 0 ? Math.min((comments / views * 100) * 50, 100) : 0} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Share Rate</span>
                      <span className="text-sm font-medium">
                        {views > 0 ? (shares / views * 100).toFixed(2) : 0}%
                      </span>
                    </div>
                    <Progress value={views > 0 ? Math.min((shares / views * 100) * 100, 100) : 0} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audience Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Audience Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-secondary rounded-lg">
                    <p className="text-3xl font-bold text-primary">{formatCount(views)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Reach</p>
                  </div>
                  <div className="text-center p-4 bg-secondary rounded-lg">
                    <p className="text-3xl font-bold text-primary">
                      {views > 0 ? Math.round((likes + comments + shares) / views * 1000) / 10 : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Interaction Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
