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

  const postUrl = `${window.location.origin}/${
    postType === 'video'
      ? 'movion/watch'
      : postType === 'book'
      ? 'bookshelf/book'
      : 'post'
  }/${postId}`;

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
      if (shareTarget === 'timeline') {
        // Share to own timeline
        if (postType === 'post') {
          await sharePost.mutateAsync({ postId, comment: shareComment.trim() || undefined });
        } else if (postType === 'group_post') {
          await shareGroupPost.mutateAsync({ groupPostId: postId, comment: shareComment.trim() || undefined });
        } else {
          // For videos and books, create a share entry
          const { error } = await supabase
            .from('shares')
            .insert({
              user_id: user.id,
              comment: shareComment.trim() || null
            });
          if (error) throw error;
          toast({ title: 'Shared to your timeline!' });
        }
      } else if (shareTarget === 'group' && selectedGroupId) {
        await shareToGroup.mutateAsync({
          groupId: selectedGroupId,
          originalPostId: postId,
          originalPostType: postType,
          comment: shareComment.trim() || undefined
        });
      } else if (shareTarget === 'page' && selectedPageId) {
        await shareToPage.mutateAsync({
          pageId: selectedPageId,
          originalPostId: postId,
          originalPostType: postType,
          comment: shareComment.trim() || undefined
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
      
      await createStory.mutateAsync({
        mediaFile: file,
        caption: shareComment || postContent?.slice(0, 100) || 'Shared post'
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Share
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground font-normal">
              {getVisibilityIcon()}
              {postVisibility}
            </span>
          </DialogTitle>
        </DialogHeader>

        {!canShare ? (
          <div className="py-8 text-center text-muted-foreground">
            <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">{shareRestriction}</p>
          </div>
        ) : (
          <Tabs defaultValue="timeline" className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="timeline" className="text-xs sm:text-sm">Timeline</TabsTrigger>
              <TabsTrigger value="story" className="text-xs sm:text-sm">Story</TabsTrigger>
              <TabsTrigger value="external" className="text-xs sm:text-sm">External</TabsTrigger>
            </TabsList>
            
            {/* Share to Timeline */}
            <TabsContent value="timeline" className="flex-1 overflow-hidden flex flex-col mt-4">
              <ScrollArea className="flex-1 pr-2">
                {/* Share Target Selection */}
                <div className="space-y-4 mb-4">
                  <Label className="text-sm font-medium">Share to Timeline</Label>
                  <RadioGroup 
                    value={shareTarget} 
                    onValueChange={(v) => setShareTarget(v as ShareTargetType)}
                    className="space-y-3"
                  >
                    {/* My Timeline - Prominent Option */}
                    <div className="flex items-center space-x-3 p-4 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-all">
                      <RadioGroupItem value="timeline" id="timeline" />
                      <Label htmlFor="timeline" className="flex items-center gap-3 cursor-pointer flex-1">
                        <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                          <AvatarImage src={user?.user_metadata?.avatar_url} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <FileText className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">My Timeline</div>
                          <div className="text-xs text-muted-foreground">Share with your followers</div>
                        </div>
                      </Label>
                    </div>

                    {/* Groups */}
                    {groups.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                          <RadioGroupItem value="group" id="group" />
                          <Label htmlFor="group" className="flex items-center gap-3 cursor-pointer flex-1">
                            <Users className="w-8 h-8 p-1.5 bg-primary/10 rounded-full text-primary" />
                            <span>Group</span>
                          </Label>
                        </div>
                        
                        {shareTarget === 'group' && (
                          <div className="ml-8 space-y-1">
                            {groups.map((group: any) => (
                              <div 
                                key={group.id}
                                onClick={() => setSelectedGroupId(group.id)}
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                  selectedGroupId === group.id 
                                    ? 'bg-primary/10 border-primary border' 
                                    : 'hover:bg-accent border border-transparent'
                                }`}
                              >
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={group.avatar_url} />
                                  <AvatarFallback>{group.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm truncate">{group.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pages */}
                    {myPages && myPages.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                          <RadioGroupItem value="page" id="page" />
                          <Label htmlFor="page" className="flex items-center gap-3 cursor-pointer flex-1">
                            <FileText className="w-8 h-8 p-1.5 bg-blue-500/10 rounded-full text-blue-500" />
                            <span>Page</span>
                          </Label>
                        </div>
                        
                        {shareTarget === 'page' && (
                          <div className="ml-8 space-y-1">
                            {myPages.map((page) => (
                              <div 
                                key={page.id}
                                onClick={() => setSelectedPageId(page.id)}
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                  selectedPageId === page.id 
                                    ? 'bg-primary/10 border-primary border' 
                                    : 'hover:bg-accent border border-transparent'
                                }`}
                              >
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={page.avatar_url || undefined} />
                                  <AvatarFallback>{page.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm truncate">{page.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </RadioGroup>
                </div>

                {/* Comment */}
                <Textarea
                  value={shareComment}
                  onChange={(e) => setShareComment(e.target.value)}
                  placeholder="Add a comment (optional)..."
                  className="min-h-[80px] resize-none"
                />
              </ScrollArea>
              
              <Button 
                onClick={handleShareToTimeline} 
                disabled={isSharing || (shareTarget === 'group' && !selectedGroupId) || (shareTarget === 'page' && !selectedPageId)}
                className="w-full gap-2 mt-4"
              >
                <Send className="w-4 h-4" />
                {shareTarget === 'timeline' ? 'Share to Timeline' : 
                 shareTarget === 'group' ? 'Share to Group' : 'Share to Page'}
              </Button>
            </TabsContent>

            {/* Share to Story */}
            <TabsContent value="story" className="space-y-4 mt-4">
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 rounded-xl border border-purple-500/20 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookImage className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-purple-700 dark:text-purple-300">Share to Story</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add this book to your story for 24-hour visibility
                </p>
              </div>
              
              {postVisibility !== 'public' && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Only public posts can be shared to stories
                </div>
              )}
              
              <Textarea
                value={shareComment}
                onChange={(e) => setShareComment(e.target.value)}
                placeholder="Add caption..."
                className="min-h-[60px] resize-none"
                disabled={postVisibility !== 'public'}
              />
              
              <Button 
                onClick={handleShareToStory} 
                disabled={isSharing || !postImage || postVisibility !== 'public'}
                className="w-full gap-2"
              >
                <BookImage className="w-4 h-4" />
                Share to Story
              </Button>
              
              {!postImage && postVisibility === 'public' && (
                <p className="text-xs text-muted-foreground text-center">
                  Only posts with images can be shared to stories
                </p>
              )}
            </TabsContent>

            {/* External Share */}
            <TabsContent value="external" className="space-y-4 mt-4">
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-4 rounded-xl border border-blue-500/20 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-blue-700 dark:text-blue-300">Share Externally</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this book on external platforms and social media
                </p>
              </div>
              
              {postVisibility === 'private' && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm mb-4">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Private content cannot be shared externally
                </div>
              )}
              
              {/* Copy Link */}
              <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                <input
                  type="text"
                  value={postUrl}
                  readOnly
                  className="flex-1 text-sm bg-transparent outline-none truncate"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCopyLink}
                  className="shrink-0 gap-2"
                  disabled={postVisibility === 'private'}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>

              {/* Share Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleShareToMessenger}
                  className="gap-2"
                  disabled={postVisibility === 'private'}
                >
                  <MessageCircle className="w-4 h-4" />
                  Messenger
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleExternalShare('whatsapp')}
                  className="gap-2 text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                  disabled={postVisibility === 'private'}
                >
                  <ExternalLink className="w-4 h-4" />
                  WhatsApp
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleExternalShare('facebook')}
                  className="gap-2 text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                  disabled={postVisibility === 'private'}
                >
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleExternalShare('twitter')}
                  className="gap-2 text-sky-500 border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950"
                  disabled={postVisibility === 'private'}
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleExternalShare('email')}
                  className="gap-2 col-span-2"
                  disabled={postVisibility === 'private'}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
