// Motion Card - Unique video card design for Motion module
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Zap, Eye, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Motion } from "./types";

interface MotionCardProps {
  motion: Motion;
  layout?: 'grid' | 'list' | 'compact';
  showCreator?: boolean;
}

const formatViewCount = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}:${remainMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const MotionCard = ({ motion, layout = 'grid', showCreator = true }: MotionCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/motion/watch/${motion.id}`);
  };

  const handleCreatorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (motion.channels?.id) {
      navigate(`/motion/creator/${motion.channels.id}`);
    }
  };

  if (layout === 'list') {
    return (
      <div 
        onClick={handleClick}
        className="flex gap-4 cursor-pointer group p-2 rounded-xl hover:bg-secondary/50 transition-all duration-300"
      >
        {/* Thumbnail with unique gradient overlay */}
        <div className="relative w-44 md:w-56 aspect-video rounded-xl overflow-hidden bg-muted flex-shrink-0 ring-1 ring-border/50">
          {motion.thumbnail_url ? (
            <img 
              src={motion.thumbnail_url} 
              alt={motion.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20 flex items-center justify-center">
              <Zap className="w-10 h-10 text-primary animate-pulse" />
            </div>
          )}
          {motion.duration && (
            <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm text-foreground text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(motion.duration)}
            </div>
          )}
          {/* Hover play indicator */}
          <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
              <Zap className="w-6 h-6 text-primary-foreground fill-current" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-1">
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {motion.title}
          </h3>
          {showCreator && motion.channels && (
            <p 
              onClick={handleCreatorClick}
              className="text-xs text-muted-foreground mt-1.5 hover:text-primary cursor-pointer transition-colors"
            >
              {motion.channels.name}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatViewCount(motion.views_count || 0)}
            </span>
            {motion.created_at && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span>{formatDistanceToNow(new Date(motion.created_at), { addSuffix: true })}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'compact') {
    return (
      <div 
        onClick={handleClick}
        className="flex gap-3 cursor-pointer group"
      >
        <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {motion.thumbnail_url ? (
            <img 
              src={motion.thumbnail_url} 
              alt={motion.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
          )}
          {motion.duration && (
            <div className="absolute bottom-1 right-1 bg-background/90 text-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">
              {formatDuration(motion.duration)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-xs line-clamp-2 leading-tight">{motion.title}</h3>
          <p className="text-[10px] text-muted-foreground mt-1">
            {formatViewCount(motion.views_count || 0)} views
          </p>
        </div>
      </div>
    );
  }

  // Grid layout (default)
  return (
    <Card 
      onClick={handleClick}
      className="overflow-hidden cursor-pointer group border-0 bg-transparent shadow-none hover:bg-secondary/30 rounded-2xl transition-all duration-300 p-2"
    >
      {/* Thumbnail with unique styling */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted ring-1 ring-border/30 group-hover:ring-primary/50 transition-all">
        {motion.thumbnail_url ? (
          <img 
            src={motion.thumbnail_url} 
            alt={motion.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-background to-accent/30 flex items-center justify-center">
            <div className="relative">
              <Zap className="w-14 h-14 text-primary opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 blur-xl bg-primary/30 -z-10" />
            </div>
          </div>
        )}
        
        {/* Duration badge */}
        {motion.duration && (
          <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm text-foreground text-xs px-2 py-0.5 rounded-lg font-medium">
            {formatDuration(motion.duration)}
          </div>
        )}

        {/* Quick motion indicator */}
        {motion.is_short && (
          <div className="absolute top-2 left-2 bg-accent text-accent-foreground text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Quick
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Zap className="w-6 h-6 text-primary-foreground fill-current" />
          </div>
        </div>
      </div>

      {/* Motion Info */}
      <div className="flex gap-3 mt-3">
        {showCreator && motion.channels && (
          <Avatar 
            className="h-9 w-9 cursor-pointer ring-2 ring-background flex-shrink-0 hover:ring-primary transition-all" 
            onClick={handleCreatorClick}
          >
            <AvatarImage src={motion.channels.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-bold">
              {motion.channels.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {motion.title}
          </h3>
          {showCreator && motion.channels && (
            <p 
              onClick={handleCreatorClick}
              className="text-xs text-muted-foreground mt-1 hover:text-primary cursor-pointer transition-colors"
            >
              {motion.channels.name}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatViewCount(motion.views_count || 0)}
            </span>
            {motion.created_at && (
              <>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(motion.created_at), { addSuffix: true })}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
