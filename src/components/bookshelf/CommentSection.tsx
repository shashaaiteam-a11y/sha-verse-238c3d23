import { useState } from "react";
import { MessageCircle, Send, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useBookComments } from "@/hooks/useBookComments";
import Comment from "./Comment";

interface CommentSectionProps {
  bookId: string;
  channelId: string;
  commentsEnabled?: boolean;
}

const CommentSection = ({ 
  bookId, 
  channelId,
  commentsEnabled = true 
}: CommentSectionProps) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [isCommentsOpen, setIsCommentsOpen] = useState(true);
  
  const {
    comments,
    isLoading,
    createComment,
    updateComment,
    deleteComment,
    likeComment,
    useCommentLikeStatus,
  } = useBookComments(bookId);

  const isChannelOwner = user?.id === channelId;

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;
    
    try {
      await createComment.mutateAsync({ content: newComment.trim() });
      setNewComment("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!commentsEnabled) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Comments are disabled for this book</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">
            Comments ({comments.length})
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCommentsOpen(!isCommentsOpen)}
          className="h-6 w-6 p-0"
        >
          {isCommentsOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {!isCommentsOpen && (
        <div className="text-xs text-muted-foreground mb-2">
          Click to expand
        </div>
      )}

      {isCommentsOpen && (
        <>
          {/* Add Comment Form */}
          {user ? (
            <div className="mb-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="min-h-[80px]"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      Press Ctrl+Enter to post
                    </p>
                    <Button
                      onClick={handleSubmit}
                      disabled={!newComment.trim() || createComment.isPending}
                      size="sm"
                    >
                      {createComment.isPending ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3 mr-1" />
                          Post
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-muted rounded-lg text-center">
              <p className="text-muted-foreground">
                Sign in to post comments
              </p>
            </div>
          )}

          {/* Comments List */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
              <p className="text-muted-foreground">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-0">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  user={user}
                  useCommentLikeStatus={useCommentLikeStatus}
                  updateComment={updateComment}
                  deleteComment={deleteComment}
                  likeComment={likeComment}
                  isChannelOwner={isChannelOwner}
                />
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
};

const CommentItem = ({
  comment,
  user,
  useCommentLikeStatus,
  updateComment,
  deleteComment,
  likeComment,
  isChannelOwner,
}: any) => {
  const { data: isLiked } = useCommentLikeStatus(comment.id);
  const isOwner = comment.user_id === user?.id;

  return (
    <Comment
      comment={comment}
      onReply={user ? () => {} : undefined}
      onEdit={isOwner ? (id: string, content: string) => updateComment.mutate({ commentId: id, content }) : undefined}
      onDelete={(isOwner || isChannelOwner) ? (id: string) => deleteComment.mutate(id) : undefined}
      onLike={user ? (id: string) => likeComment.mutate(id) : undefined}
      isLiked={!!isLiked}
      isOwner={isOwner}
      isChannelOwner={isChannelOwner}
    />
  );
};

export default CommentSection;