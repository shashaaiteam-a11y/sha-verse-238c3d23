import { useState, forwardRef, useImperativeHandle } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Trash2, ChevronDown, ChevronUp, Reply } from 'lucide-react';
import { useComments } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface PostCommentsProps {
  postId: string;
  type?: 'post' | 'group_post' | 'video' | 'book';
  commentsCount: number;
}

export interface PostCommentsRef {
  expand: () => void;
  collapse: () => void;
}

export const PostComments = forwardRef<PostCommentsRef, PostCommentsProps>(
  ({ postId, type = 'post', commentsCount }, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const { comments, isLoading, createComment, deleteComment } = useComments(isExpanded ? postId : undefined, type);
  const { user } = useAuth();
  const { profile } = useProfile();

  // Expose expand/collapse methods to parent
  useImperativeHandle(ref, () => ({
    expand: () => setIsExpanded(true),
    collapse: () => setIsExpanded(false),
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    createComment.mutate(
      { content: newComment },
      { onSuccess: () => setNewComment('') }
    );
  };

  const handleReply = (parentCommentId: string) => {
    if (!replyContent.trim()) return;

    createComment.mutate(
      { content: replyContent, parentCommentId },
      { 
        onSuccess: () => {
          setReplyContent('');
          setReplyingTo(null);
        }
      }
    );
  };

  return (
    <div className="pt-3 border-t border-border">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {commentsCount > 0 ? `${commentsCount} comments` : 'Add a comment'}
      </button>

      {isExpanded && (
        <>
          {/* Comment input */}
          <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                {profile?.display_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 h-8 text-sm"
            />
            <Button
              type="submit"
              size="icon"
              className="h-8 w-8"
              disabled={!newComment.trim() || createComment.isPending}
            >
              <Send className="w-3 h-3" />
            </Button>
          </form>

          {/* Comments list */}
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : comments && comments.length > 0 ? (
              comments.map((comment: any) => (
                <div key={comment.id} className="space-y-2">
                  {/* Parent Comment */}
                  <div className="flex gap-2 group">
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      {comment.profiles?.avatar_url && <AvatarImage src={comment.profiles.avatar_url} />}
                      <AvatarFallback className="bg-gradient-accent text-accent-foreground text-xs">
                        {comment.profiles?.display_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="bg-secondary rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold">{comment.profiles?.display_name}</p>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                        <button
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          <Reply className="w-3 h-3" />
                          Reply
                        </button>
                      </div>
                    </div>
                    {comment.user_id === user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteComment.mutate(comment.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {/* Reply Input */}
                  {replyingTo === comment.id && (
                    <div className="flex gap-2 ml-9">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground text-[10px]">
                          {profile?.display_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <Input
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`Reply to ${comment.profiles?.display_name}...`}
                        className="flex-1 h-7 text-xs"
                        onKeyDown={(e) => e.key === 'Enter' && handleReply(comment.id)}
                        autoFocus
                      />
                      <Button
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleReply(comment.id)}
                        disabled={!replyContent.trim() || createComment.isPending}
                      >
                        <Send className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  )}

                  {/* Nested Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-9 space-y-2 border-l-2 border-border pl-3">
                      {comment.replies.map((reply: any) => (
                        <div key={reply.id} className="flex gap-2 group">
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            {reply.profiles?.avatar_url && <AvatarImage src={reply.profiles.avatar_url} />}
                            <AvatarFallback className="bg-gradient-accent text-accent-foreground text-[10px]">
                              {reply.profiles?.display_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="bg-secondary/50 rounded-lg px-2.5 py-1.5">
                              <p className="text-[11px] font-semibold">{reply.profiles?.display_name}</p>
                              <p className="text-xs">{reply.content}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          {reply.user_id === user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteComment.mutate(reply.id)}
                            >
                              <Trash2 className="w-2.5 h-2.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                No comments yet. Be the first!
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
});