// Movion Comment Item with real-time like/dislike/reply
import { useState } from "react";
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  useCommentLikeStatus,
  useCommentLikeCount,
  useToggleCommentReaction,
  useReplyToComment,
  useCommentReplies,
} from "@/hooks/useCommentInteractions";

interface CommentItemProps {
  comment: any;
  videoId: string;
  isReply?: boolean;
}

const CommentItem = ({ comment, videoId, isReply = false }: CommentItemProps) => {
  const { user } = useAuth();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(false);

  const { data: likeStatus } = useCommentLikeStatus(comment.id);
  const { data: likeCount } = useCommentLikeCount(comment.id);
  const toggleReaction = useToggleCommentReaction(videoId);
  const replyMutation = useReplyToComment(videoId);
  const { data: replies, isLoading: repliesLoading } = useCommentReplies(
    showReplies ? comment.id : undefined
  );

  const handleReaction = (type: 'like' | 'dislike') => {
    if (!user) {
      toast.error("Please sign in");
      return;
    }
    toggleReaction.mutate({ commentId: comment.id, type });
  };

  const handleReply = () => {
    if (!user) {
      toast.error("Please sign in to reply");
      return;
    }
    if (replyText.trim()) {
      replyMutation.mutate(
        { parentCommentId: comment.id, content: replyText },
        {
          onSuccess: () => {
            setReplyText("");
            setShowReplyInput(false);
            setShowReplies(true);
          },
        }
      );
    }
  };

  // Count replies (from parent_comment_id)
  const hasReplies = !isReply;

  return (
    <div className={`flex gap-3 ${isReply ? 'ml-12' : ''}`}>
      <Avatar className={isReply ? "w-8 h-8" : "w-10 h-10"}>
        <AvatarImage src={comment.profiles?.avatar_url} />
        <AvatarFallback>{comment.profiles?.display_name?.[0] || 'U'}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">@{comment.profiles?.username || 'user'}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm mt-1">{comment.content}</p>
        
        {/* Action Buttons - Like, Dislike, Reply */}
        <div className="flex items-center gap-4 mt-2">
          <button
            className={`flex items-center gap-1 text-sm transition-colors ${
              likeStatus?.liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => handleReaction('like')}
          >
            <ThumbsUp className={`w-4 h-4 ${likeStatus?.liked ? 'fill-current' : ''}`} />
            {(likeCount || 0) > 0 && <span>{likeCount}</span>}
          </button>
          <button
            className={`transition-colors ${
              likeStatus?.disliked ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => handleReaction('dislike')}
          >
            <ThumbsDown className={`w-4 h-4 ${likeStatus?.disliked ? 'fill-current' : ''}`} />
          </button>
          {!isReply && (
            <button
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowReplyInput(!showReplyInput)}
            >
              Reply
            </button>
          )}
        </div>

        {/* Reply Input */}
        {showReplyInput && (
          <div className="mt-3 flex gap-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback>{user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="Add a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[36px] resize-none text-sm"
                autoFocus
              />
              {replyText && (
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="ghost" size="sm" onClick={() => { setReplyText(""); setShowReplyInput(false); }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleReply} disabled={replyMutation.isPending}>
                    {replyMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reply'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show/Hide Replies Toggle */}
        {hasReplies && !isReply && (
          <button
            className="flex items-center gap-1 mt-2 text-sm text-primary hover:text-primary/80 font-medium"
            onClick={() => setShowReplies(!showReplies)}
          >
            {showReplies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showReplies ? 'Hide replies' : 'View replies'}
          </button>
        )}

        {/* Replies List */}
        {showReplies && (
          <div className="mt-2 space-y-3">
            {repliesLoading ? (
              <div className="text-xs text-muted-foreground">Loading replies...</div>
            ) : (
              (replies || []).map((reply: any) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  videoId={videoId}
                  isReply
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentItem;
