// Movion Shorts Card Component
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { MovionVideo } from '../types';
import { cn } from '@/lib/utils';

interface ShortsCardProps {
  video: MovionVideo;
  basePath?: string;
  className?: string;
}

export const ShortsCard: React.FC<ShortsCardProps> = ({ video, basePath = '/movion', className }) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`${basePath}/shorts/${video.id}`)}
      className={cn(
        "group relative aspect-[9/16] overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 active:scale-95 snap-start shrink-0 select-none shadow-xl border border-white/5",
        className
      )}
    >
      {/* Background Media */}
      <img 
        src={video.thumbnail} 
        alt={video.title} 
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        loading="lazy"
      />
      
      {/* Overlays */}
      <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Top Badge */}
      <div className="absolute top-3 left-3 z-10">
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-pink-600 to-red-600 px-2 py-1 rounded-full shadow-lg">
          <Zap size={12} className="text-white" fill="currentColor" />
          <span className="text-[10px] font-black uppercase tracking-wider text-white">Pulse</span>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <p className="text-white text-sm font-bold line-clamp-2 leading-snug mb-2 drop-shadow-lg">
          {video.title}
        </p>
        <div className="flex items-center gap-2">
          <img src={video.channelAvatar} className="w-6 h-6 rounded-full border border-white/30" alt="" />
          <span className="text-white/80 text-xs font-medium truncate">{video.channelName}</span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-white/70 text-[10px] font-bold">
          <span>{Intl.NumberFormat('en', { notation: 'compact' }).format(video.views)} views</span>
        </div>
      </div>

      {/* Hover Play Icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
          <Zap size={24} className="text-white ml-0.5" fill="currentColor" />
        </div>
      </div>
    </div>
  );
};

export default ShortsCard;
