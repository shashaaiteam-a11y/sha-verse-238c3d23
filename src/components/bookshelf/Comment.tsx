import { useState } from "react";
import { MessageCircle, ThumbsUp, Reply, MoreHorizontal, Edit, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { BookComment } from "@/hooks/useBookComments";

interface CommentProps {
  comment: BookComment;
  onReply?: (parentId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onLike?: (commentId: string) => void;
  isLiked?: boolean;
  isOwner?: boolean;
  isChannelOwner?: boolean;
}

const Comment = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  onLike,
  isLiked = false,
  isOwner = false,
  isChannelOwner = false,
}: CommentProps) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(false);

  const handleEdit = () => {
    if (onEdit) {
      onEdit(comment.id, editContent);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (onDelete && (isOwner || isChannelOwner)) {
      onDelete(comment.id);
    }
  };

  const canEditDelete = isOwner || isChannelOwner;

  return (
    <div className="py-3 border-b border-border last:border-b-0">
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.profile?.avatar_url || ""} />
          <AvatarFallback>
            {comment.profile?.display_name?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {comment.profile?.display_name || "User"}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
              {comment.updated_at !== comment.created_at && (
                <span className="text-xs text-muted-foreground italic">
                  (edited)
                </span>
              )}
            </div>
            
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="w-3 h-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEdit}>
                  <Send className="w-3 h-3 mr-1" />
                  Save
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {comment.content}
            </p>
          )}
          
          {/* Like & Reply buttons — temporarily removed, will be added later */}
        </div>
      </div>
    </div>
  );
};

export default Comment;