// Movion VideoCard Component - Fixed with proper menu behavior and Supabase integration
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, CheckCircle2, Clock, ListPlus, MoreVertical } from 'lucide-react';
import { MovionVideo } from '../types';
import { useMovionStore } from '../store';
import { useIsInWatchLater, useToggleWatchLater } from '@/hooks/useWatchLater';
import { useIsSaved, useToggleSave } from '@/hooks/useVideoSave';
import { useHiddenVideos } from '@/hooks/useHiddenVideos';
import { useUndo } from '../contexts/UndoContext';
import { useAuth } from '@/contexts/AuthContext';
import { VideoCardMenu } from './VideoCardMenu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VideoCardProps {
  video: MovionVideo;
  layout?: 'grid' | 'list' | 'list-large';
  basePath?: string;
  activeMenuId?: string | null;
  onMenuToggle?: (id: string | null) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ 
  video, 
  layout = 'grid', 
  basePath = '/movion',
  activeMenuId,
  onMenuToggle 
}) => {
  const { userChannel, deleteVideo } = useMovionStore();
  const { user } = useAuth();
  const { hideVideo, unhideVideo, isHidden: checkIsHidden } = useHiddenVideos();
  const { showUndoSnackbar } = useUndo();
  
  const isInWatchLater = useIsInWatchLater(video.id);
  const toggleWatchLater = useToggleWatchLater();
  const isSaved = useIsSaved(video.id);
  const toggleSave = useToggleSave();
  
  const [isHovered, setIsHovered] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  
  const isOwner = video.channelId === userChannel.id;
  const isHidden = checkIsHidden(video.id);
  const showMenu = activeMenuId === video.id;

  useEffect(() => {
    if (isHidden) return;

    let playTimeout: number;
    if (isHovered && previewVideoRef.current && layout === 'grid') {
      playTimeout = window.setTimeout(() => {
        previewVideoRef.current?.play().catch(() => {});
      }, 600);
    } else {
      previewVideoRef.current?.pause();
      if (previewVideoRef.current) previewVideoRef.current.currentTime = 0;
    }
    return () => clearTimeout(playTimeout);
  }, [isHovered, layout, isHidden]);

  if (isHidden) return null;

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMenuToggle?.(showMenu ? null : video.id);
  };

  const handleMenuClose = () => {
    onMenuToggle?.(null);
  };

  const handleWatchLater = () => {
    if (!user) {
      toast.error('Please sign in to use Watch Later');
      return;
    }
    toggleWatchLater.mutate({ videoId: video.id, isInList: isInWatchLater });
  };

  const handleSave = () => {
    if (!user) {
      toast.error('Please sign in to save videos');
      return;
    }
    toggleSave.mutate({ videoId: video.id, isSaved });
  };

  const handleNotInterested = () => {
    hideVideo(video.id);
    showUndoSnackbar('Video hidden from feed', () => {
      unhideVideo(video.id);
    });
  };

  const handleShare = () => {
    const url = window.location.origin + `${basePath}/watch/${video.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleDelete = () => {
    if (confirm('Delete this video forever?')) {
      deleteVideo(video.id);
    }
  };

  const handleDownload = () => {
    if (video.videoUrl) {
      const a = document.createElement('a');
      a.href = video.videoUrl;
      a.download = `${video.title}.mp4`;
      a.click();
      toast.success('Download started');
    }
  };

  const renderThumbnail = () => (
    <div className={cn(
      "relative aspect-video rounded-xl overflow-hidden bg-muted shadow-sm group-hover:shadow-md transition-all duration-300",
      layout === 'grid' ? '' : (layout === 'list-large' ? 'w-40 sm:w-56 md:w-64' : 'w-32 sm:w-40 md:w-44')
    )}>
      <img 
        src={video.thumbnail} 
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isHovered && layout === 'grid' ? 'opacity-0' : 'opacity-100'
        )} 
        alt={video.title} 
      />
      {layout === 'grid' && (
        <video
          ref={previewVideoRef}
          src={isHovered ? video.videoUrl : undefined}
          muted
          loop
          playsInline
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none",
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
      <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] md:text-[11px] font-bold px-1.5 py-0.5 rounded">
        {video.duration}
      </span>
      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
        <Play size={layout === 'grid' ? 32 : 20} fill="white" className="text-white drop-shadow-lg" />
      </div>
      
      <div className={cn(
        "absolute top-2 right-2 flex flex-col gap-1.5 transition-opacity duration-200 hidden lg:flex",
        isHovered ? 'opacity-100' : 'opacity-0'
      )}>
        <button 
          onClick={(e) => { e.stopPropagation(); handleWatchLater(); }}
          className="p-2 bg-black/70 hover:bg-black rounded-lg text-white shadow-xl transition-all active:scale-90"
        >
          <Clock size={18} className={isInWatchLater ? "fill-primary text-primary" : "text-white"} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); }}
          className="p-2 bg-black/70 hover:bg-black rounded-lg text-white shadow-xl transition-all active:scale-90"
        >
          <ListPlus size={18} />
        </button>
      </div>
    </div>
  );

  if (layout === 'list' || layout === 'list-large') {
    const isLarge = layout === 'list-large';
    return (
      <div className={cn(
        "flex gap-3 md:gap-4 mb-2 group relative hover:bg-muted p-2 rounded-2xl transition-all",
        isLarge ? 'items-start' : 'items-center'
      )}>
        <Link to={`${basePath}/watch/${video.id}`} className="flex-shrink-0">{renderThumbnail()}</Link>
        <div className="flex flex-col flex-1 min-w-0 pr-10 relative">
          <div className="flex justify-between items-start gap-2">
            <Link to={`${basePath}/watch/${video.id}`} className="flex-1 min-w-0">
              <h3 className={cn(
                "font-bold line-clamp-2 leading-tight text-foreground mb-1.5 transition-colors group-hover:text-primary",
                isLarge ? 'text-base md:text-[17px]' : 'text-sm md:text-[15px]'
              )}>{video.title}</h3>
            </Link>
          </div>
          <div className="flex flex-col gap-1">
            <div className={cn("flex items-center gap-1.5", isLarge && 'mt-1 order-last')}>
              {isLarge && <img src={video.channelAvatar} className="w-6 h-6 rounded-full hidden sm:block object-cover border border-border" alt="" />}
              <Link to={`${basePath}/channel/${video.channelId}`} className="text-xs md:text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium">
                {video.channelName} <CheckCircle2 size={12} className="text-muted-foreground" />
              </Link>
            </div>
            <div className="text-[11px] md:text-xs text-muted-foreground">
              <span>{Intl.NumberFormat('en', { notation: 'compact' }).format(video.views)} views • {video.timestamp}</span>
            </div>
            {isLarge && <p className="line-clamp-2 text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-2xl">{video.description}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col gap-3.5 group cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-400 bg-background"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`${basePath}/watch/${video.id}`)}
    >
      {renderThumbnail()}
      <div className="flex gap-3 px-0.5 bg-background">
        <Link to={`${basePath}/channel/${video.channelId}`} className="shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
          <img src={video.channelAvatar} className="w-9 h-9 rounded-full object-cover border border-border" alt="" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-1 relative">
            <h3 className="text-[14px] sm:text-[15px] font-bold line-clamp-2 leading-[1.3] text-foreground group-hover:text-primary transition-colors flex-1 min-h-[2.4rem] pr-2">{video.title}</h3>
            <div className="shrink-0 relative">
              <button 
                ref={menuButtonRef}
                onClick={handleMenuToggle}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  showMenu ? "bg-muted" : "opacity-0 group-hover:opacity-100 hover:bg-muted"
                )}
              >
                <MoreVertical size={18} className="text-foreground" />
              </button>
              
              <VideoCardMenu
                isOpen={showMenu}
                onClose={handleMenuClose}
                isSavedInWatchLater={isInWatchLater}
                isSaved={isSaved}
                isOwner={isOwner}
                onWatchLater={handleWatchLater}
                onNotInterested={handleNotInterested}
                onShare={handleShare}
                onSave={handleSave}
                onDelete={isOwner ? handleDelete : undefined}
                onDownload={handleDownload}
              />
            </div>
          </div>
          <div className="mt-1 flex flex-col gap-0.5">
            <Link to={`${basePath}/channel/${video.channelId}`} className="text-[12px] sm:text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit font-medium" onClick={(e) => e.stopPropagation()}>
              {video.channelName} <CheckCircle2 size={12} className="text-muted-foreground" />
            </Link>
            <div className="text-[12px] sm:text-[13px] text-muted-foreground font-medium">
              <span>{Intl.NumberFormat('en', { notation: 'compact' }).format(video.views)} views • {video.timestamp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
