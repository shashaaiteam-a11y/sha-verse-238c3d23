import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Link2, Settings, Play, Users, Share2 } from "lucide-react";
import { useChannel } from "@/hooks/useChannels";
import { useIsSubscribed, useToggleSubscription } from "@/hooks/useSubscriptions";
import { useAuth } from "@/contexts/AuthContext";
import { VideoCard } from "@/components/movion/VideoCard";
import { UploadVideoDialog } from "@/components/movion/UploadVideoDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareDialog } from "@/components/ShareDialog";
import { ChannelSettingsDialog } from "@/components/movion/ChannelSettingsDialog";
import { toast } from "sonner";

const formatSubscribers = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M subscribers`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K subscribers`;
  return `${count} subscribers`;
};
const ChannelPage = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  const { channel, videos, isLoading } = useChannel(channelId);
  const isSubscribed = useIsSubscribed(channelId);
  const toggleSubscription = useToggleSubscription();

  const isOwner = channel?.user_id === user?.id;

  const handleSubscribe = () => {
    // Prevent self-subscription
    if (isOwner) {
      toast.error("You cannot link-up with your own channel");
      return;
    }
    if (channelId) {
      toggleSubscription.mutate({
        channelId,
        isSubscribed,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <Button variant="ghost" size="icon" onClick={() => navigate('/movion')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Skeleton className="h-5 w-32" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="w-full h-32 rounded-xl" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Channel not found</p>
        <Button onClick={() => navigate('/movion')}>Back to Movion</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/movion')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold">{channel.name}</span>
          </div>
          {isOwner && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowSettingsDialog(true)}
            >
              <Settings className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Banner */}
      <div className="w-full h-24 md:h-36 bg-gradient-primary">
        {channel.banner_url && (
          <img 
            src={channel.banner_url} 
            alt="Banner"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Channel Info */}
      <div className="px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <Avatar className="h-20 w-20 md:h-28 md:w-28 border-4 border-background -mt-10 md:-mt-14">
            <AvatarImage src={channel.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {channel.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold">{channel.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>@{channel.name.toLowerCase().replace(/\s+/g, '')}</span>
              <span>•</span>
              <span>{formatSubscribers(channel.subscribers_count || 0)}</span>
              <span>•</span>
              <span>{videos?.length || 0} videos</span>
            </div>
            {channel.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {channel.description}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {isOwner ? (
              <UploadVideoDialog 
                trigger={
                  <Button className="gap-2">
                    <Play className="w-4 h-4" />
                    Upload Video
                  </Button>
                }
              />
            ) : (
              <>
                <Button
                  variant={isSubscribed ? "secondary" : "destructive"}
                  className="rounded-full gap-2"
                  onClick={handleSubscribe}
                  disabled={toggleSubscription.isPending}
                >
                  <Link2 className="w-4 h-4" />
                  {isSubscribed ? 'Linked' : 'Links-up'}
                </Button>
              </>
            )}
            <Button variant="secondary" className="rounded-full gap-2" onClick={() => setShowShareDialog(true)}>
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="w-full justify-start px-4 h-12 bg-transparent border-b border-border rounded-none">
          <TabsTrigger 
            value="videos" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none"
          >
            Videos
          </TabsTrigger>
          <TabsTrigger 
            value="about" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none"
          >
            About
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-0 p-4">
          {videos && videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => (
                <VideoCard 
                  key={video.id} 
                  video={{
                    ...video,
                    channels: channel
                  }} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No videos uploaded yet</p>
              {isOwner && (
                <p className="text-sm mt-2">Upload your first video to get started!</p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="about" className="mt-0 p-4">
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {channel.description || 'No description available.'}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Subscribers</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {channel.subscribers_count || 0}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Play className="w-4 h-4" />
                    <span className="text-sm">Videos</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {videos?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        postId={channelId || ''}
        postType="channel"
        postContent={channel.name}
        postImage={channel.avatar_url}
      />

      {/* Channel Settings Dialog */}
      {isOwner && (
        <ChannelSettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          channel={channel}
          videos={videos}
        />
      )}
    </div>
  );
};

export default ChannelPage;
