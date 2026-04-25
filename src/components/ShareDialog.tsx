import { useState, useEffect } from 'react';
import { 
  Link, Copy, MessageCircle, BookImage, Send, Check, ExternalLink,
  Facebook, Twitter, Mail, Users, FileText, Globe, Lock, UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useStories } from "@/hooks/useStories";
import { useGroups } from "@/hooks/useGroups";
import { usePages } from "@/hooks/usePages";
import { useShares } from "@/hooks/useShares";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postType?: 'post' | 'group_post' | 'video' | 'book';
  postContent?: string;
  postImage?: string;
  postVisibility?: string;
}

type ShareTargetType = 'timeline' | 'group' | 'page';

export const ShareDialog = ({ 
  open, 
  onOpenChange, 
  postId, 
  postType = 'post',
  postContent,
  postImage,
  postVisibility = 'public'
}: ShareDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { createStory } = useStories();
  const { myGroups } = useGroups();
  const { myPages } = usePages();
  const { sharePost, shareGroupPost, shareToGroup, shareToPage, checkSharePermission } = useShares();
  
  const [shareComment, setShareComment] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareTarget, setShareTarget] = useState<ShareTargetType>('timeline');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [canShare, setCanShare] = useState(true);
  const [shareRestriction, setShareRestriction] = useState<string>('');

  const getPostPath = () => {
    switch (postType) {
      case 'video':
        return `movion/watch/${postId}`;
      case 'book':
        return `bookshelf/book/${postId}`;
      case 'group_post':
        return `post/${postId}`;
      default:
        return `post/${postId}`;
    }
  };
  const postUrl = `${window.location.origin}/${getPostPath()}`;

  // Check share permissions when dialog opens
  useEffect(() => {
    if (open && user) {
      checkSharePermission(postId, postType).then(result => {
        setCanShare(result.canShare);
        if (!result.canShare) {
          setShareRestriction(result.reason || 'Cannot share this content');
        }
      });
    }
  }, [open, postId, postType, user]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      toast({ title: 'Link copied!' });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ 
        title: 'Failed to copy', 
        description: 'Please copy the link manually',
        variant: 'destructive' 
      });
    }
  };

  const handleShareToTimeline = async () => {
    if (!user || !canShare) return;
    
    setIsSharing(true);
    try {
      // Build a share line that always carries the link so it's clickable
      const linkLine = `\n\n🔗 ${postUrl}`;
      const userComment = shareComment.trim();

      if (shareTarget === 'timeline') {
        // Compose human-readable content with the link so it's auto-linkified in feeds
        const typeLabel =
          postType === 'video' ? '🎬 Shared a video'
          : postType === 'book' ? '📚 Shared a book'
          : postType === 'group_post' ? '💬 Shared a group post'
          : '🔗 Shared a post';
        const composedContent =
          (userComment ? userComment + '\n\n' : '') +
          typeLabel +
          (postContent ? `: ${postContent.slice(0, 140)}` : '') +
          `\n\n${postUrl}`;

        // Always create a real visible post on the user's timeline with the thumbnail
        const { error: postErr } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            content: composedContent,
            image_url: postImage || null,
            visibility: 'public',
          });
        if (postErr) throw postErr;

        // Also record the share relation for analytics/counters when applicable
        if (postType === 'post') {
          await sharePost.mutateAsync({ postId, comment: userComment || undefined }).catch(() => {});
        } else if (postType === 'group_post') {
          await shareGroupPost.mutateAsync({ groupPostId: postId, comment: userComment || undefined }).catch(() => {});
        }

        queryClient.invalidateQueries({ queryKey: ['posts'] });
        queryClient.invalidateQueries({ queryKey: ['user-posts'] });
        toast({ title: 'Shared to your timeline!' });
      } else if (shareTarget === 'group' && selectedGroupId) {
        await shareToGroup.mutateAsync({
          groupId: selectedGroupId,
          originalPostId: postId,
          originalPostType: postType,
          comment: (userComment ? userComment : '') + linkLine,
          imageUrl: postImage,
        });
      } else if (shareTarget === 'page' && selectedPageId) {
        await shareToPage.mutateAsync({
          pageId: selectedPageId,
          originalPostId: postId,
          originalPostType: postType,
          comment: (userComment ? userComment : '') + linkLine,
          imageUrl: postImage,
        });
      }

      onOpenChange(false);
      setShareComment('');
      setShareTarget('timeline');
      setSelectedGroupId('');
      setSelectedPageId('');
    } catch (error: any) {
      toast({
        title: 'Error sharing',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareToStory = async () => {
    if (!user) {
      toast({ 
        title: 'Cannot share to story', 
        description: 'Please log in to share',
        variant: 'destructive'
      });
      return;
    }

    // Only public posts can be shared to story
    if (postVisibility !== 'public') {
      toast({ 
        title: 'Cannot share to story', 
        description: 'Only public posts can be shared to stories',
        variant: 'destructive'
      });
      return;
    }

    if (!postImage) {
      toast({ 
        title: 'Cannot share to story', 
        description: 'This post has no image to share',
        variant: 'destructive'
      });
      return;
    }

    setIsSharing(true);
    try {
      const response = await fetch(postImage);
      const blob = await response.blob();
      const file = new File([blob], 'shared-story.jpg', { type: 'image/jpeg' });
      
      const baseCaption = shareComment.trim() || postContent?.slice(0, 100) || 'Shared post';
      const captionWithLink = `${baseCaption}\n\n🔗 ${postUrl}`;

      await createStory.mutateAsync({
        mediaFile: file,
        caption: captionWithLink,
      });

      toast({ title: 'Shared to your story!' });
      onOpenChange(false);
      setShareComment('');
    } catch (error: any) {
      toast({
        title: 'Error sharing to story',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareToMessenger = () => {
    toast({ 
      title: 'Share via Messenger', 
      description: 'Open a conversation and paste the link' 
    });
    handleCopyLink();
  };

  const handleExternalShare = (platform: 'facebook' | 'twitter' | 'whatsapp' | 'email') => {
    // Private content cannot be shared externally
    if (postVisibility === 'private') {
      toast({
        title: 'Cannot share externally',
        description: 'Private content cannot be shared outside the app',
        variant: 'destructive'
      });
      return;
    }

    const text = postContent?.slice(0, 100) || 'Check this out!';
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(text);
    
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodedText}&body=${encodedUrl}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  const getVisibilityIcon = () => {
    switch (postVisibility) {
      case 'private': return <Lock className="w-4 h-4" />;
      case 'friends': return <UserCheck className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const groups = myGroups?.map(m => m.groups).filter(Boolean) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[90vw] md:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col z-[70]">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Send className="w-4 h-4 text-primary" />
            </div>
            Share Post
            <span className="ml-auto mr-10 flex items-center gap-1.5 text-xs text-muted-foreground font-normal bg-secondary px-2.5 py-1 rounded-full">
              {getVisibilityIcon()}
              {postVisibility}
            </span>
          </DialogTitle>
        </DialogHeader>

        {!canShare ? (
          <div className="py-12 text-center text-muted-foreground px-6">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Lock className="w-7 h-7 opacity-40" />
            </div>
            <p className="font-semibold text-foreground mb-1">Sharing Restricted</p>
            <p className="text-sm">{shareRestriction}</p>
          </div>
        ) : (
          <Tabs defaultValue="timeline" className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-5 mt-4 shrink-0 grid grid-cols-3 bg-secondary rounded-xl h-9">
              <TabsTrigger value="timeline" className="rounded-lg text-xs font-medium gap-1.5">
                <Send className="w-3 h-3" />Timeline
              </TabsTrigger>
              <TabsTrigger value="story" className="rounded-lg text-xs font-medium gap-1.5">
                <BookImage className="w-3 h-3" />Story
              </TabsTrigger>
              <TabsTrigger value="external" className="rounded-lg text-xs font-medium gap-1.5">
                <ExternalLink className="w-3 h-3" />External
              </TabsTrigger>
            </TabsList>

            {/* ── Timeline Tab ── */}
            <TabsContent value="timeline" className="flex-1 overflow-hidden flex flex-col mt-0 px-5 pt-4">
              <ScrollArea className="h-[calc(90vh-255px)]">
                <RadioGroup
                  value={shareTarget}
                  onValueChange={(v) => setShareTarget(v as ShareTargetType)}
                  className="space-y-2 mb-4"
                >
                  {/* My Timeline */}
                  <label
                    htmlFor="timeline"
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      shareTarget === 'timeline'
                        ? 'border-primary bg-primary/8 shadow-sm'
                        : 'border-border hover:border-primary/40 hover:bg-accent'
                    }`}
                  >
                    <RadioGroupItem value="timeline" id="timeline" className="shrink-0" />
                    <Avatar className="w-10 h-10 ring-2 ring-primary/20 shrink-0">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {user?.user_metadata?.full_name?.[0] || 'M'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight">My Timeline</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Share with your followers</p>
                    </div>
                  </label>

                  {/* Groups */}
                  {groups.length > 0 && (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="group"
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          shareTarget === 'group'
                            ? 'border-primary bg-primary/8'
                            : 'border-border hover:border-primary/40 hover:bg-accent'
                        }`}
                      >
                        <RadioGroupItem value="group" id="group" className="shrink-0" />
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">Group</p>
                          <p className="text-xs text-muted-foreground">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
                        </div>
                      </label>
                      {shareTarget === 'group' && (
                        <div className="ml-4 pl-3 border-l-2 border-primary/20 space-y-1">
                          {groups.map((group: any) => (
                            <div
                              key={group.id}
                              onClick={() => setSelectedGroupId(group.id)}
                              className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                                selectedGroupId === group.id
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'hover:bg-accent'
                              }`}
                            >
                              <Avatar className="w-6 h-6 shrink-0">
                                <AvatarImage src={group.avatar_url} />
                                <AvatarFallback className="text-xs">{group.name?.[0]}</AvatarFallback>
                              </Avatar>
                              <span className="truncate">{group.name}</span>
                              {selectedGroupId === group.id && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pages */}
                  {myPages && myPages.length > 0 && (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="page"
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          shareTarget === 'page'
                            ? 'border-primary bg-primary/8'
                            : 'border-border hover:border-primary/40 hover:bg-accent'
                        }`}
                      >
                        <RadioGroupItem value="page" id="page" className="shrink-0" />
                        <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                          <FileText className="w-4.5 h-4.5 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">Page</p>
                          <p className="text-xs text-muted-foreground">{myPages.length} page{myPages.length !== 1 ? 's' : ''}</p>
                        </div>
                      </label>
                      {shareTarget === 'page' && (
                        <div className="ml-4 pl-3 border-l-2 border-blue-500/20 space-y-1">
                          {myPages.map((page) => (
                            <div
                              key={page.id}
                              onClick={() => setSelectedPageId(page.id)}
                              className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                                selectedPageId === page.id
                                  ? 'bg-blue-500/10 text-blue-600 font-medium'
                                  : 'hover:bg-accent'
                              }`}
                            >
                              <Avatar className="w-6 h-6 shrink-0">
                                <AvatarImage src={page.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">{page.name?.[0]}</AvatarFallback>
                              </Avatar>
                              <span className="truncate">{page.name}</span>
                              {selectedPageId === page.id && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </RadioGroup>

                {/* Comment box */}
                <Textarea
                  value={shareComment}
                  onChange={(e) => setShareComment(e.target.value)}
                  placeholder="Write something about this post..."
                  className="min-h-[80px] resize-none text-sm bg-secondary border-0 focus-visible:ring-1 rounded-xl placeholder:text-muted-foreground/60"
                />
              </ScrollArea>

              {/* Action button */}
              <div className="pt-3 pb-2 shrink-0">
                <Button
                  onClick={handleShareToTimeline}
                  disabled={isSharing || (shareTarget === 'group' && !selectedGroupId) || (shareTarget === 'page' && !selectedPageId)}
                  className="w-full gap-2 h-11 text-sm font-semibold rounded-xl bg-gradient-primary shadow-glow"
                >
                  <Send className="w-4 h-4" />
                  {isSharing ? 'Sharing...' : shareTarget === 'timeline' ? 'Share to Timeline' : shareTarget === 'group' ? 'Share to Group' : 'Share to Page'}
                </Button>
              </div>
            </TabsContent>

            {/* ── Story Tab ── */}
            <TabsContent value="story" className="flex flex-col gap-4 mt-0 px-5 pt-4 pb-2 overflow-y-auto max-h-[calc(90vh-130px)]">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                <div className="w-9 h-9 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <BookImage className="w-4.5 h-4.5 text-purple-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-purple-700 dark:text-purple-300">Share to Story</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Visible to your followers for 24 hours</p>
                </div>
              </div>

              {postVisibility !== 'public' && (
                <div className="flex items-center gap-2 p-3 bg-destructive/8 text-destructive rounded-xl text-sm border border-destructive/20">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>Only public posts can be shared to stories</span>
                </div>
              )}

              <Textarea
                value={shareComment}
                onChange={(e) => setShareComment(e.target.value)}
                placeholder="Add a caption to your story..."
                className="min-h-[80px] resize-none bg-secondary border-0 focus-visible:ring-1 rounded-xl text-sm"
                disabled={postVisibility !== 'public'}
              />

              <Button
                onClick={handleShareToStory}
                disabled={isSharing || !postImage || postVisibility !== 'public'}
                className="w-full gap-2 h-11 font-semibold rounded-xl"
              >
                <BookImage className="w-4 h-4" />
                {isSharing ? 'Sharing...' : 'Share to Story'}
              </Button>

              {!postImage && postVisibility === 'public' && (
                <p className="text-xs text-muted-foreground text-center -mt-1">
                  Only posts with images can be shared to stories
                </p>
              )}
            </TabsContent>

            {/* ── External Tab ── */}
            <TabsContent value="external" className="flex flex-col gap-4 mt-0 px-5 pt-4 pb-2 overflow-y-auto max-h-[calc(90vh-130px)]">
              {postVisibility === 'private' ? (
                <div className="flex items-center gap-2 p-3 bg-destructive/8 text-destructive rounded-xl text-sm border border-destructive/20">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>Private content cannot be shared externally</span>
                </div>
              ) : null}

              {/* Copy Link */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-secondary rounded-xl border border-border">
                <Link className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={postUrl}
                  readOnly
                  className="flex-1 text-xs bg-transparent outline-none truncate text-muted-foreground"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className={`shrink-0 h-7 px-2.5 text-xs gap-1 rounded-lg font-medium transition-colors ${copied ? 'text-green-600 bg-green-500/10' : ''}`}
                  disabled={postVisibility === 'private'}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>

              {/* Share platform buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Messenger', icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-500/10', action: handleShareToMessenger },
                  { label: 'WhatsApp', icon: ExternalLink, color: 'text-green-500', bg: 'bg-green-500/10', action: () => handleExternalShare('whatsapp') },
                  { label: 'Facebook', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-600/10', action: () => handleExternalShare('facebook') },
                  { label: 'Twitter', icon: Twitter, color: 'text-sky-500', bg: 'bg-sky-500/10', action: () => handleExternalShare('twitter') },
                ].map(({ label, icon: Icon, color, bg, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    disabled={postVisibility === 'private'}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground leading-tight">{label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleExternalShare('email')}
                disabled={postVisibility === 'private'}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Mail className="w-4.5 h-4.5 text-orange-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-xs text-muted-foreground">Share via email</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
