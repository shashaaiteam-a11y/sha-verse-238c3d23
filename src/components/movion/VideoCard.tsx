import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnail_url?: string | null;
    views_count?: number | null;
    created_at?: string | null;
    duration?: number | null;
    channels?: {
      id: string;
      name: string;
      avatar_url?: string | null;
    } | null;
  };
  layout?: 'grid' | 'list';
}

const formatViews = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const VideoCard = ({ video, layout = 'grid' }: VideoCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/movion/watch/${video.id}`);
  };

  const handleChannelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (video.channels?.id) {
      navigate(`/movion/channel/${video.channels.id}`);
    }
  };

  if (layout === 'list') {
    return (
      <div 
        onClick={handleClick}
        className="flex gap-4 cursor-pointer group"
      >
        {/* Thumbnail */}
        <div className="relative w-40 md:w-64 aspect-video rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {video.thumbnail_url ? (
            <img 
              src={video.thumbnail_url} 
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
              <Play className="w-12 h-12 text-primary-foreground" />
            </div>
          )}
          {video.duration && (
            <div className="absolute bottom-1 right-1 bg-background/90 text-foreground text-xs px-1 rounded">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          {video.channels && (
            <p 
              onClick={handleChannelClick}
              className="text-xs text-muted-foreground mt-1 hover:text-foreground cursor-pointer"
            >
              {video.channels.name}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <span>{formatViews(video.views_count || 0)} views</span>
            {video.created_at && (
              <>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card 
      onClick={handleClick}
      className="overflow-hidden cursor-pointer group border-0 bg-transparent shadow-none"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
        {video.thumbnail_url ? (
          <img 
            src={video.thumbnail_url} 
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
            <Play className="w-16 h-16 text-primary-foreground opacity-80 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-background/90 text-foreground text-xs px-1.5 py-0.5 rounded font-medium">
            {formatDuration(video.duration)}
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="flex gap-3 mt-3">
        {video.channels && (
          <Avatar 
            className="h-9 w-9 cursor-pointer flex-shrink-0" 
            onClick={handleChannelClick}
          >
            <AvatarImage src={video.channels.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {video.channels.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
            {video.title}
          </h3>
          {video.channels && (
            <p 
              onClick={handleChannelClick}
              className="text-xs text-muted-foreground mt-1 hover:text-foreground cursor-pointer"
            >
              {video.channels.name}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{formatViews(video.views_count || 0)} views</span>
            {video.created_at && (
              <>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
