// Quick Motion Card - For short-form vertical content (like Shorts but unique)
import { Zap, Eye, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Motion } from "./types";

interface QuickMotionCardProps {
  motion: Motion;
  onClick?: () => void;
}

const formatCount = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export const QuickMotionCard = ({ motion, onClick }: QuickMotionCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/motion/quick/${motion.id}`);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="relative w-36 sm:w-40 aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer group flex-shrink-0 ring-1 ring-border/30 hover:ring-primary/50 transition-all duration-300"
    >
      {/* Background */}
      {motion.thumbnail_url ? (
        <img 
          src={motion.thumbnail_url}
          alt={motion.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary via-accent/50 to-primary/80 flex items-center justify-center">
          <Zap className="w-12 h-12 text-primary-foreground animate-pulse" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />

      {/* Quick badge */}
      <div className="absolute top-3 left-3">
        <div className="bg-accent text-accent-foreground text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
          <Zap className="w-3 h-3 fill-current" />
          Quick
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="text-white text-xs font-semibold line-clamp-2 leading-tight drop-shadow-lg mb-2">
          {motion.title}
        </h3>
        <div className="flex items-center gap-3 text-white/80 text-[10px]">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatCount(motion.views_count || 0)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {formatCount(motion.likes_count || 0)}
          </span>
        </div>
      </div>

      {/* Hover play indicator */}
      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-primary/30 transform scale-90 group-hover:scale-100 transition-transform">
          <Zap className="w-7 h-7 text-primary-foreground fill-current" />
        </div>
      </div>
    </div>
  );
};
