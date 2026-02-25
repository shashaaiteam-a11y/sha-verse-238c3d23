import { Card } from "@/components/ui/card";
import { Play, Eye } from "lucide-react";

interface ShortsCardProps {
  short: {
    id: string;
    title: string;
    thumbnail_url?: string | null;
    views_count?: number | null;
  };
  onClick?: () => void;
}

const formatViews = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export const ShortsCard = ({ short, onClick }: ShortsCardProps) => {
  return (
    <Card 
      onClick={onClick}
      className="relative aspect-[9/16] w-full max-w-[180px] rounded-xl overflow-hidden cursor-pointer group border-0"
    >
      {short.thumbnail_url ? (
        <img 
          src={short.thumbnail_url} 
          alt={short.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
          <Play className="w-12 h-12 text-primary-foreground" />
        </div>
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      
      {/* Info */}
      <div className="absolute bottom-2 left-2 right-2">
        <h4 className="text-sm font-semibold text-foreground line-clamp-2">
          {short.title}
        </h4>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Eye className="w-3 h-3" />
          <span>{formatViews(short.views_count || 0)} views</span>
        </div>
      </div>
    </Card>
  );
};
