import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PagePost, Page, usePage } from '@/hooks/usePages';
import { HashtagText } from '@/components/HashtagText';

interface PagePostCardProps {
  post: PagePost;
  page: Page;
  canDelete?: boolean;
}

const PagePostCard = ({ post, page, canDelete }: PagePostCardProps) => {
  const { deletePost } = usePage(page.id);
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      deletePost.mutate(post.id);
    }
  };

  return (
    <div className="border-b last:border-b-0 pb-4 last:pb-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={page.avatar_url || ''} />
            <AvatarFallback>{page.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{page.name}</span>
              {page.verified && (
                <Badge variant="secondary" className="text-xs">✓</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {post.published_at 
                ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true })
                : 'Scheduled'
              }
            </p>
          </div>
        </div>

        {canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      <HashtagText content={post.content} className="mb-3 whitespace-pre-wrap block" />

      {/* Image */}
      {post.image_url && (
        <img 
          src={post.image_url} 
          alt="" 
          className="rounded-lg w-full max-h-96 object-cover mb-3"
        />
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <span>{post.likes_count} likes</span>
        <span>{post.comments_count} comments</span>
        <span>{post.shares_count} shares</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t pt-3">
        <Button 
          variant="ghost" 
          size="sm" 
          className={`flex-1 ${isLiked ? 'text-red-500' : ''}`}
          onClick={handleLike}
        >
          <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
          Like
        </Button>
        <Button variant="ghost" size="sm" className="flex-1">
          <MessageCircle className="h-4 w-4 mr-2" />
          Comment
        </Button>
        <Button variant="ghost" size="sm" className="flex-1">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
};

export default PagePostCard;
