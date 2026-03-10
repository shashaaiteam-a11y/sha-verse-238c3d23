// Pulse Card - Short-form vertical video card (YouTube Shorts alternative)
import { Card } from "@/components/ui/card";
import { Zap, Eye, Heart, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PulseCardProps {
  video: {
    id: string;
    title: string;
    thumbnail_url?: string | null;
    views_count?: number | null;
    likes_count?: number | null;
    comments_count?: number | null;
    channels?: {
      name: string;
      avatar_url?: string | null;
    } | null;
  };
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const formatCount = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export const PulseCard = ({ video, onClick, size = 'medium' }: PulseCardProps) => {
  const sizeClasses = {
    small: 'w-28 sm:w-32',
    medium: 'w-36 sm:w-44',
    large: 'w-44 sm:w-52'
  };

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer group border-0 flex-shrink-0",
        "ring-1 ring-border/30 hover:ring-accent/50 transition-all duration-300",
        sizeClasses[size]
      )}
    >
      {/* Background */}
      {video.thumbnail_url ? (
        <img 
          src={video.thumbnail_url} 
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-accent via-primary/50 to-accent/80 flex items-center justify-center">
          <Zap className="w-12 h-12 text-accent-foreground animate-pulse" />
        </div>
      )}
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
      
      {/* Pulse badge */}
      <div className="absolute top-2 left-2">
        <div className="bg-accent text-accent-foreground text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
          <Zap className="w-3 h-3 fill-current" />
          Pulse
        </div>
      </div>

      {/* Stats on right side (vertical) */}
      <div className="absolute right-2 bottom-16 flex flex-col items-center gap-3">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-[10px] mt-0.5 font-medium">
            {formatCount(video.likes_count || 0)}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-[10px] mt-0.5 font-medium">
            {formatCount(video.comments_count || 0)}
          </span>
        </div>
      </div>

      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {video.channels && (
          <p className="text-white/70 text-[10px] mb-1 truncate">
            @{video.channels.name}
          </p>
        )}
        <h4 className="text-white text-xs font-semibold line-clamp-2 leading-tight drop-shadow-lg">
          {video.title}
        </h4>
        <div className="flex items-center gap-1 text-white/60 text-[10px] mt-1">
          <Eye className="w-3 h-3" />
          <span>{formatCount(video.views_count || 0)} views</span>
        </div>
      </div>

      {/* Hover play indicator */}
      <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-accent/90 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-accent/30 transform scale-90 group-hover:scale-100 transition-transform">
          <Zap className="w-8 h-8 text-accent-foreground fill-current" />
        </div>
      </div>
    </Card>
  );
};
