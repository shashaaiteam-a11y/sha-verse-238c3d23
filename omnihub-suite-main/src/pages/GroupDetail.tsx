import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Users, Send, MessageCircle, Lock, Globe, Share2,
  Bookmark, MoreHorizontal, Settings, ImagePlus, Film, FileText,
  Paperclip, X, Download, Pin, Pin as PinIcon,
} from 'lucide-react';
import { useGroupPosts } from '@/hooks/useGroupPosts';
import { useGroups } from '@/hooks/useGroups';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { PostComments } from '@/components/PostComments';
import { useShares } from '@/hooks/useShares';
import { EmojiReactionPicker } from '@/components/EmojiReactionPicker';
import { useReactions } from '@/hooks/useReactions';
import { useSavedPosts } from '@/hooks/useSavedPosts';
import { ShareDialog } from '@/components/ShareDialog';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Component for group post reactions - Now uses full emoji chart
const GroupPostReactions = ({ postId }: { postId: string }) => {
  const { userReaction, reactionCounts, toggleReaction } = useReactions(postId, 'group_post');
  
  return (
    <EmojiReactionPicker
      currentReaction={userReaction}
      onReact={(emoji) => toggleReaction.mutate(emoji)}
      reactionCounts={reactionCounts}
      disabled={toggleReaction.isPending}
    />
  );
};
// ── Helper: upload any file to Supabase Storage ──────────────────────────
async function uploadToStorage(bucket: string, file: File, folder = ''): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${folder}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const sb = supabase as any;
  console.log('Uploading to bucket:', bucket, 'path:', path, 'file:', file.name, 'size:', file.size);
  const { error, data: uploadData } = await sb.storage.from(bucket).upload(path, file);
  if (error) {
    console.error('Upload error:', error.message, error);
    throw error;
  }
  console.log('Upload success:', uploadData);
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ── Post type icon ─────────────────────────────────────────────────────────
const PostTypeIcon = ({ type }: { type: string }) => {
  if (type === 'video') return <Film className="w-4 h-4 text-purple-500" />;
  if (type === 'document' || type === 'file') return <FileText className="w-4 h-4 text-blue-500" />;
  return null;
};

const GroupDetail = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { posts, isLoading, group, groupLoading, members, createPost } = useGroupPosts(groupId);
  const { leaveGroup, myGroups } = useGroups();
  const { shareGroupPost } = useShares();
  const { isPostSaved, toggleSavePost } = useSavedPosts();
  const { toast } = useToast();

  // Post composer state
  const [newPost, setNewPost] = useState('');
  const [postImage, setPostImage]   = useState<string>();
  const [postVideo, setPostVideo]   = useState<string>();
  const [postFile, setPostFile]     = useState<string>();
  const [postFileName, setPostFileName] = useState<string>();
  const [postFileType, setPostFileType] = useState<string>();
  const [isUploading, setIsUploading]   = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  const [shareDialogPost, setShareDialogPost] = useState<{ id: string; content: string; image?: string } | null>(null);

  const isMember = (myGroups as any[])?.some((m: any) => m.groups?.id === groupId);
  const memberRole = (myGroups as any[])?.find((m: any) => m.groups?.id === groupId)?.role;
  const isAdminOrMod = memberRole === 'admin' || memberRole === 'moderator' || (group as any)?.creator_id === user?.id;

  // ── Upload handlers ────────────────────────────────────────────────────
  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToStorage('post-images', file, 'group-posts/');
      setPostImage(url);
      // clear other media
      setPostVideo(undefined); setPostFile(undefined); setPostFileName(undefined); setPostFileType(undefined);
    } catch (err: any) { console.error('Image upload error:', err); toast({ title: 'Image upload failed', description: err?.message, variant: 'destructive' }); }
    finally { setIsUploading(false); e.target.value = ''; }
  };

  const handleVideoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 200 * 1024 * 1024) { toast({ title: 'Max video size is 200 MB', variant: 'destructive' }); return; }
    setIsUploading(true);
    try {
      const url = await uploadToStorage('videos', file, 'group-posts/');
      setPostVideo(url);
      setPostImage(undefined); setPostFile(undefined); setPostFileName(undefined); setPostFileType(undefined);
    } catch (err: any) { console.error('Video upload error:', err); toast({ title: 'Video upload failed', description: err?.message, variant: 'destructive' }); }
    finally { setIsUploading(false); e.target.value = ''; }
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast({ title: 'Max file size is 50 MB', variant: 'destructive' }); return; }
    setIsUploading(true);
    try {
      const url = await uploadToStorage('post-files', file, 'group-posts/');
      setPostFile(url);
      setPostFileName(file.name);
      setPostFileType(file.type);
      setPostImage(undefined); setPostVideo(undefined);
    } catch (err: any) { console.error('File upload error:', err); toast({ title: 'File upload failed', description: err?.message, variant: 'destructive' }); }
    finally { setIsUploading(false); e.target.value = ''; }
  };

  const clearMedia = () => {
    setPostImage(undefined); setPostVideo(undefined);
    setPostFile(undefined); setPostFileName(undefined); setPostFileType(undefined);
  };

  const handleCreatePost = () => {
    if (!newPost.trim() && !postImage && !postVideo && !postFile) return;
    const postType = postVideo ? 'video' : postFile ? (postFileType?.startsWith('application/pdf') || postFileType?.includes('document') ? 'document' : 'file') : postImage ? 'image' : 'text';
    createPost.mutate(
      {
        content: newPost,
        imageUrl: postImage,
        videoUrl: postVideo,
        fileUrl: postFile,
        fileName: postFileName,
        fileType: postFileType,
        postType,
      },
      {
        onSuccess: () => {
          setNewPost('');
          clearMedia();
        },
      }
    );
  };

  if (groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-subtle">
        <p className="text-muted-foreground mb-4">Group not found</p>
        <Button onClick={() => navigate('/groups')}>Back to Groups</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => navigate('/groups')}>
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <h1 className="text-lg sm:text-xl font-bold truncate flex-1">{(group as any).name}</h1>
          {isAdminOrMod && (
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => navigate(`/groups/${groupId}/admin`)}>
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Cover & Info */}
      <div className="relative max-w-3xl mx-auto">
        <div
          className="h-32 sm:h-40 bg-gradient-primary"
          style={
            (group as any).cover_url
              ? { backgroundImage: `url(${(group as any).cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : {}
          }
        />
        <div className="px-3 sm:px-4 -mt-10 sm:-mt-12 mb-3 sm:mb-4 flex items-end gap-3 sm:gap-4">
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-3 sm:border-4 border-card shadow-lg flex-shrink-0">
            {(group as any).avatar_url && <AvatarImage src={(group as any).avatar_url} />}
            <AvatarFallback className="bg-gradient-accent text-accent-foreground text-xl sm:text-2xl font-bold">
              {(group as any).name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pb-1 sm:pb-2">
            <h2 className="text-xl sm:text-2xl font-bold truncate">{(group as any).name}</h2>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
              {(group as any).is_private ? <Lock className="w-3 h-3 sm:w-4 sm:h-4" /> : <Globe className="w-3 h-3 sm:w-4 sm:h-4" />}
              <span>{(group as any).is_private ? 'Private' : 'Public'}</span>
              <span>•</span>
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{(group as any).members_count} members</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-4">
        {/* Description */}
        {(group as any).description && (
          <Card className="p-3 sm:p-4 mb-3 sm:mb-4">
            <p className="text-xs sm:text-sm text-muted-foreground">{(group as any).description}</p>
          </Card>
        )}

        {/* Leave Button */}
        {isMember && (
          <Button
            variant="outline"
            className="w-full mb-3 sm:mb-4 text-sm"
            onClick={() => {
              leaveGroup.mutate(groupId!);
              navigate('/groups');
            }}
          >
            Leave Group
          </Button>
        )}

        {/* ── Rich Media Post Composer ──────────────────────────────── */}
        {isMember && (
          <Card className="p-2 sm:p-3 mb-3 sm:mb-4 shadow-sm">
            {/* Avatar + Textarea row */}
            <div className="flex gap-2 mb-2">
              <Avatar className="h-8 w-8 flex-shrink-0">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                  {profile?.display_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <Textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's on your mind?"
                rows={1}
                className="flex-1 bg-secondary resize-none text-sm rounded-lg border-0 focus-visible:ring-1 min-h-[36px] py-2"
              />
            </div>

            {/* ── Media Previews ── */}
            {(postImage || postVideo || postFile) && (
              <div className="relative mb-2 rounded-lg overflow-hidden border border-border">
                <button
                  onClick={clearMedia}
                  className="absolute top-1.5 right-1.5 z-10 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                >
                  <X className="w-3 h-3" />
                </button>

                {postImage && (
                  <img src={postImage} alt="Preview" className="w-full max-h-40 object-cover" />
                )}

                {postVideo && (
                  <video
                    src={postVideo}
                    controls
                    className="w-full max-h-40 bg-black"
                  />
                )}

                {postFile && (
                  <div className="flex items-center gap-2 p-2 bg-secondary/60">
                    <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{postFileName}</p>
                      <p className="text-[10px] text-muted-foreground">{postFileType}</p>
                    </div>
                  </div>
                )}

                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}

            {isUploading && !postImage && !postVideo && !postFile && (
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Uploading...
              </div>
            )}

            {/* ── Toolbar + Post button ── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {/* Photo */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Photo</span>
                </button>

                {/* Video */}
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Video</span>
                </button>

                {/* File / Document */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">File</span>
                </button>
              </div>

              <Button
                size="sm"
                onClick={handleCreatePost}
                disabled={(!newPost.trim() && !postImage && !postVideo && !postFile) || createPost.isPending || isUploading}
                className="bg-gradient-primary shadow-glow text-xs h-7 px-3"
              >
                <Send className="w-3 h-3 mr-1" />
                Post
              </Button>
            </div>

            {/* Hidden file inputs */}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoPick} />
            <input ref={fileInputRef}  type="file" accept="*/*"     className="hidden" onChange={handleFilePick} />
          </Card>
        )}

        {/* Members Preview */}
        <Card className="p-3 sm:p-4 mb-4 sm:mb-6">
          <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Members</h3>
          <div className="flex -space-x-1.5 sm:-space-x-2">
            {members?.slice(0, 6).map((member: any) => (
              <Avatar key={member.id} className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-card">
                {member.profiles?.avatar_url && <AvatarImage src={member.profiles.avatar_url} />}
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-[10px] sm:text-xs">
                  {member.profiles?.display_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            ))}
            {(members?.length || 0) > 6 && (
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-secondary flex items-center justify-center text-[10px] sm:text-xs font-medium border-2 border-card">
                +{(members?.length || 0) - 6}
              </div>
            )}
          </div>
        </Card>

        {/* Posts */}
        <div className="space-y-3 sm:space-y-4">
          {isLoading ? (
            <div className="text-center py-6 sm:py-8">
              <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : posts && posts.length > 0 ? (
            posts.map((post: any) => (
              <Card key={post.id} className="p-3 sm:p-4 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                      {post.profiles?.avatar_url && <AvatarImage src={post.profiles.avatar_url} />}
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
                        {post.profiles?.display_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-xs sm:text-sm">{post.profiles?.display_name}</h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Post Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                        <MoreHorizontal className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => toggleSavePost.mutate({ postId: post.id, type: 'group_post' })}
                      >
                        <Bookmark className={`w-4 h-4 mr-2 ${isPostSaved(post.id, 'group_post') ? 'fill-current' : ''}`} />
                        {isPostSaved(post.id, 'group_post') ? 'Unsave' : 'Save'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {post.content && (
                  <p className="text-xs sm:text-sm mb-3 break-words whitespace-pre-wrap">{post.content}</p>
                )}

                {/* Image */}
                {post.image_url && (
                  <div className="mb-3 -mx-3 sm:-mx-4">
                    <img src={post.image_url} alt="Post" className="w-full max-h-[300px] sm:max-h-[400px] object-cover" />
                  </div>
                )}

                {/* Video */}
                {post.video_url && (
                  <div className="mb-3 -mx-3 sm:-mx-4 bg-black">
                    <video
                      src={post.video_url}
                      controls
                      className="w-full max-h-[360px]"
                      preload="metadata"
                    />
                  </div>
                )}

                {/* File / Document */}
                {post.file_url && (
                  <a
                    href={post.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={post.file_name}
                    className="mb-3 flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary">{post.file_name || 'Attachment'}</p>
                      <p className="text-xs text-muted-foreground">{post.file_type || 'File'}</p>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                  </a>
                )}

                <div className="flex items-center gap-4 sm:gap-6 pt-3 border-t border-border">
                  <GroupPostReactions postId={post.id} />
                  <button className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground hover:text-primary transition-colors">
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm">{post.comments_count}</span>
                  </button>
                  <button 
                    onClick={() => setShareDialogPost({ id: post.id, content: post.content, image: post.image_url })}
                    className="text-muted-foreground hover:text-primary transition-colors ml-auto"
                  >
                    <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                <PostComments postId={post.id} type="group_post" commentsCount={post.comments_count || 0} />
              </Card>
            ))
          ) : (
            <Card className="p-6 sm:p-8 text-center">
              <p className="text-sm sm:text-base text-muted-foreground">No posts yet. Be the first to post!</p>
            </Card>
          )}
        </div>
      </div>
      
      {shareDialogPost && (
        <ShareDialog
          open={!!shareDialogPost}
          onOpenChange={(open) => !open && setShareDialogPost(null)}
          postId={shareDialogPost.id}
          postType="group_post"
          postContent={shareDialogPost.content}
          postImage={shareDialogPost.image}
        />
      )}
    </div>
  );
};

export default GroupDetail;
