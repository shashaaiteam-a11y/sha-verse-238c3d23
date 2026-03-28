// Movion Shorts Player Component (Full-screen vertical video)
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Share2, Music2, Volume2, VolumeX,
  Pause, Loader2, Heart, ArrowLeft, MoreVertical, AlertCircle, ThumbsDown,
  Send, X, Flag, EyeOff, Download
} from 'lucide-react';
import { MovionVideo } from '../types';
import { useMovionStore } from '../store';
import { cn } from '@/lib/utils';
import SubscribeButton from './SubscribeButton';
import { useVideos } from '@/hooks/useVideos';
import { useVideoLike } from '@/hooks/useVideoLikes';
import { useVideoComments } from '@/hooks/useVideoComments';
import { useAuth } from '@/contexts/AuthContext';
import { ShareDialog } from '@/components/ShareDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ShortsPlayerProps {
  video: MovionVideo;
  isActive: boolean;
  isMuted: boolean;
  onMuteToggle: () => void;
  shouldPreload?: boolean;
  basePath?: string;
}

export const ShortsPlayer: React.FC<ShortsPlayerProps> = ({ 
  video, 
  isActive, 
  isMuted, 
  onMuteToggle, 
  shouldPreload = false,
  basePath = '/movion'
}) => {
  const navigate = useNavigate();
  const { recordEngagement, emitEvent } = useMovionStore();
  const { incrementView } = useVideos();
  const { isLiked, isDisliked, toggleLike, toggleDislike } = useVideoLike(video.id);
  const { comments, addComment } = useVideoComments(video.id);
  const { user } = useAuth();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (isActive) {
      emitEvent({ type: 'watch_started', videoId: video.id });
      incrementView.mutate(video.id);
      if (videoRef.current) {
        setHasError(false);
        videoRef.current.load();
        videoRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch(() => {
            setIsPlaying(false);
            setIsLoading(false);
          });
      }
    } else {
      if (videoRef.current) {
        recordEngagement(video, videoRef.current.currentTime, false);
        videoRef.current.pause();
      }
      setIsPlaying(false);
      setProgress(0);
    }
  }, [isActive, video.id, recordEngagement, emitEvent]);

  const handleVideoClick = (e: React.MouseEvent) => {
    if (e.detail === 2) {
      if (!isLiked) toggleLike.mutate();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    } else {
      if (videoRef.current?.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current?.pause();
        setIsPlaying(false);
      }
    }
  };

  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !user) return;
    addComment.mutate(commentText.trim());
    setCommentText('');
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error('Please login to like'); return; }
    toggleLike.mutate();
  };

  const handleDislike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error('Please login to dislike'); return; }
    toggleDislike.mutate();
  };

  return (
    <div 
      data-short-item 
      data-id={video.id}
      className="h-full w-full snap-start flex items-center justify-center relative bg-black overflow-hidden"
    >
      {/* Blurred Background */}
      <div className="absolute inset-0 z-0 opacity-40 blur-[120px] scale-150 pointer-events-none">
        <img src={video.thumbnail} className="w-full h-full object-cover" alt="" />
      </div>

      <div className="relative h-full w-full md:w-auto md:h-[94%] md:aspect-[9/16] bg-black shadow-2xl overflow-hidden md:rounded-3xl z-10 border-0 md:border border-white/5 group">
        <video
          key={video.id}
          ref={videoRef}
          src={shouldPreload || isActive ? video.videoUrl : ""}
          className="h-full w-full object-cover cursor-pointer"
          loop 
          playsInline 
          muted={isMuted}
          onTimeUpdate={() => setProgress((videoRef.current?.currentTime || 0) / (videoRef.current?.duration || 1) * 100)}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => {
            setIsLoading(false);
            setHasError(false);
          }}
          onEnded={() => emitEvent({ type: 'video_replay', videoId: video.id })}
          onClick={handleVideoClick}
          onCanPlay={() => {
            setIsLoading(false);
            setHasError(false);
          }}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-50 pointer-events-none">
          <button onClick={() => navigate(-1)} className="p-2.5 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white pointer-events-auto transition-all active:scale-90">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-4 pointer-events-auto">
            <button onClick={onMuteToggle} className="p-2.5 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all active:scale-90">
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2.5 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all active:scale-90">
                  <MoreVertical size={24} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => { toast.info('Not interested noted'); }}>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Not interested
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { toast.info('Reported'); }}>
                  <Flag className="w-4 h-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-6 z-30">
          <button 
            onClick={handleLike}
            className="flex flex-col items-center gap-1"
          >
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all",
              isLiked ? "bg-red-500 text-white" : "bg-white/20 backdrop-blur-sm text-white"
            )}>
              <Heart size={28} fill={isLiked ? "currentColor" : "none"} />
            </div>
            <span className="text-white text-xs font-bold drop-shadow-lg">{formatCount(video.likes)}</span>
          </button>

          <button 
            onClick={handleDislike}
            className="flex flex-col items-center gap-1"
          >
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all",
              isDisliked ? "bg-blue-500 text-white" : "bg-white/20 backdrop-blur-sm text-white"
            )}>
              <ThumbsDown size={28} fill={isDisliked ? "currentColor" : "none"} />
            </div>
            <span className="text-white text-xs font-bold drop-shadow-lg">Dislike</span>
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
              <MessageSquare size={28} />
            </div>
            <span className="text-white text-xs font-bold drop-shadow-lg">{formatCount(comments?.length || 0)}</span>
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); setShowShareDialog(true); }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
              <Share2 size={28} />
            </div>
            <span className="text-white text-xs font-bold drop-shadow-lg">Share</span>
          </button>

          <Link to={`${basePath}/channel/${video.channelId}`} className="mt-4 p-[3px] bg-gradient-to-tr from-[#f09433] to-[#bc1888] rounded-full active:scale-90 transition-transform shadow-2xl relative">
            <img src={video.channelAvatar} className="w-12 h-12 rounded-full border-2 border-black object-cover" alt="" />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-black ring-1 ring-black shadow-lg">+</div>
          </Link>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 pb-10 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none z-20">
          <div className="flex flex-col gap-3 pointer-events-auto max-w-[85%]">
            <div className="flex items-center gap-3">
              <Link to={`${basePath}/channel/${video.channelId}`} className="flex items-center gap-2 min-w-0 group/channel overflow-hidden">
                <img src={video.channelAvatar} className="w-9 h-9 rounded-full border border-white/20 shrink-0" alt="" />
                <span className="font-black text-white text-[15px] sm:text-[16px] drop-shadow-md tracking-tight truncate">
                  @{video.channelName.replace(/\s+/g, '').toLowerCase()}
                </span>
              </Link>
              <div className="shrink-0">
                <SubscribeButton channelId={video.channelId} variant="minimal" dropdownPosition="top" />
              </div>
            </div>
            <p className="text-[14px] sm:text-[15px] font-bold text-white leading-relaxed drop-shadow-2xl line-clamp-2 pr-4">{video.title}</p>
            
            {/* Music */}
            <div className="flex items-center gap-2 mt-1">
              <Music2 size={14} className="text-white/80" />
              <p className="text-white/70 text-xs truncate">Original sound - {video.channelName}</p>
            </div>
          </div>
        </div>

        {/* Loading/Error/Pause States */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          {isLoading && isActive && !hasError && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={56} className="text-white animate-spin opacity-50" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 animate-pulse">Loading Pulse</span>
            </div>
          )}
          {hasError && isActive && (
            <div className="flex flex-col items-center gap-3 bg-black/60 p-10 rounded-3xl backdrop-blur-md">
              <AlertCircle size={56} className="text-red-500" />
              <span className="text-xs font-black uppercase text-white/80">Video Unavailable</span>
            </div>
          )}
          {!isPlaying && isActive && !isLoading && !hasError && (
            <div className="bg-black/30 p-8 rounded-full backdrop-blur-md animate-in fade-in zoom-in duration-200">
              <Pause size={56} className="text-white opacity-80" />
            </div>
          )}
          {showHeart && (
            <div className="animate-ping">
              <Heart size={140} fill="currentColor" className="text-red-500" />
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-30">
          <div 
            className="h-full bg-gradient-to-r from-red-700 via-red-500 to-pink-500 transition-all duration-100 ease-linear shadow-[0_0_20px_rgba(239,68,68,0.8)]" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>

      {/* Comments Bottom Sheet */}
      <Sheet open={showComments} onOpenChange={setShowComments}>
        <SheetContent side="bottom" className="h-[70vh] flex flex-col rounded-t-2xl p-0">
          <SheetHeader className="px-4 pt-4 pb-2 border-b">
            <SheetTitle className="text-center">Comments ({comments?.length || 0})</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
            {(!comments || comments.length === 0) ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No comments yet. Be the first!
              </div>
            ) : (
              comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    {comment.profiles?.avatar_url && <AvatarImage src={comment.profiles.avatar_url} />}
                    <AvatarFallback className="text-xs">
                      {comment.profiles?.display_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">
                        {comment.profiles?.display_name || 'User'}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          {user && (
            <div className="border-t px-4 py-3 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Add a comment..."
                className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm outline-none"
              />
              <button 
                onClick={handleAddComment}
                disabled={!commentText.trim() || addComment.isPending}
                className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        postId={video.id}
        postType="video"
        postContent={video.title}
        postImage={video.thumbnail}
      />
    </div>
  );
};

export default ShortsPlayer;
