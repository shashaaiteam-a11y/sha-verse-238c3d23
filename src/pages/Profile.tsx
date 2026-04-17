import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  MapPin, Link as LinkIcon, Calendar, Heart, MessageCircle, 
  Share2, Briefcase, GraduationCap, Home as HomeIcon, Phone, Users as UsersIcon, 
  UserPlus, UserMinus, ArrowLeft, Check, X, Send, Camera, Video, Image,
  Lock, Cake, User as UserIcon, Plus, Bookmark
} from "lucide-react";
import { useProfile } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import { useUserPosts } from '@/hooks/useUserPosts';
import { useUserPhotos } from '@/hooks/useUserPhotos';
import { useUserVideos } from '@/hooks/useUserVideos';
import { useMutualFriends } from '@/hooks/useMutualFriends';
import { formatDistanceToNow, format } from 'date-fns';
import { ProfileImageUpload } from '@/components/ProfileImageUpload';
import { EditProfileDialog } from '@/components/EditProfileDialog';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { useShares } from '@/hooks/useShares';
import { ProfileIntroCard } from '@/components/profile/ProfileIntroCard';
import { ProfileMoreMenu } from '@/components/profile/ProfileMoreMenu';
import { FeaturedPhotos } from '@/components/profile/FeaturedPhotos';
import { FriendsPreview } from '@/components/profile/FriendsPreview';
import { SocialLinksSection } from '@/components/profile/SocialLinksSection';
import { ProfilePostCard } from '@/components/profile/ProfilePostCard';
import { ProfileSettingsDialog } from '@/components/profile/ProfileSettingsDialog';
import { CreatePostCard } from '@/components/CreatePostCard';
import AppMenu from '@/components/AppMenu';
import { useQueryClient } from '@tanstack/react-query';
import NotificationBell from '@/components/NotificationBell';
import { useStories } from '@/hooks/useStories';
import { Input } from '@/components/ui/input';
import { Settings } from 'lucide-react';
import { shouldShowInfo } from '@/utils/privacyHelper';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeAdCard } from '@/components/ads';

const Profile = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { user } = useAuth();
  const isOwnProfile = !userId || userId === user?.id;
  
  const { profile, isLoading } = useProfile(userId);
  const [postsPage, setPostsPage] = useState(0);
  const [photosPage, setPhotosPage] = useState(0);
  const [friendsPage, setFriendsPage] = useState(0);
  
  const { friends: friendsData, friendsHasMore, friendsLoading, sendFriendRequest, removeFriend, acceptFriendRequest, declineFriendRequest, pendingRequests, sentRequests } = useFriends(friendsPage);
  const { posts, hasMore: postsHasMore, isLoading: postsLoading } = useUserPosts(userId || user?.id, postsPage);
  const { photos, hasMore: photosHasMore, isLoading: photosLoading } = useUserPhotos(userId || user?.id, photosPage);
  const { videos, isLoading: videosLoading } = useUserVideos(userId || user?.id);
  const { mutualFriendsCount, mutualFriends } = useMutualFriends(userId);
  const { toggleLike, togglePinPost } = usePosts();
  const { sharePost } = useShares();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  
  // Story creation state
  const [showStoryDialog, setShowStoryDialog] = useState(false);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState<string | null>(null);
  const [storyCaption, setStoryCaption] = useState('');
  const storyFileInputRef = useRef<HTMLInputElement>(null);
  const { createStory } = useStories();
  
  // Create post dialog state
  const [showCreatePostDialog, setShowCreatePostDialog] = useState(false);
  const [postType, setPostType] = useState<'photo' | 'video' | 'life_event' | null>(null);

  // Get friendship status with this user
  const [friendshipStatus, setFriendshipStatus] = useState<{ status: string; friendshipId: string } | null>(null);
  
  useEffect(() => {
    if (!userId || !user || isOwnProfile) {
      setFriendshipStatus(null);
      return;
    }

    // Check if already friends
    const friendship = friendsData?.find((f: any) => 
      f.profiles?.id === userId
    );
    if (friendship) {
      setFriendshipStatus({ status: 'accepted', friendshipId: friendship.id });
      return;
    }

    // Check if pending request (they sent to me)
    const incomingRequest = pendingRequests?.find((r: any) => r.user_id === userId);
    if (incomingRequest) {
      setFriendshipStatus({ status: 'incoming', friendshipId: incomingRequest.id });
      return;
    }

    // Check if I sent request to them
    const outgoingRequest = sentRequests?.find((r: any) => r.friend_id === userId);
    if (outgoingRequest) {
      setFriendshipStatus({ status: 'pending', friendshipId: outgoingRequest.id });
      return;
    }

    setFriendshipStatus(null);
  }, [userId, user, friendsData, pendingRequests, sentRequests, isOwnProfile]);

  const handleAvatarUpload = async (url: string) => {
    if (!isOwnProfile) return;
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });

      toast({
        title: 'Avatar updated!',
        description: 'Your profile picture has been updated',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (url: string) => {
    if (!isOwnProfile) return;
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ cover_url: url })
        .eq('id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });

      toast({
        title: 'Cover photo updated!',
        description: 'Your cover photo has been updated',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleStartChat = () => {
    if (!userId) return;
    // Navigate to Messages page with user ID
    navigate(`/messages?userId=${userId}`);
  };

  const handleAvatarRemove = async () => {
    if (!isOwnProfile) return;
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });

      toast({
        title: 'Profile photo removed',
        description: 'Your profile picture has been removed',
      });
    } catch (error: any) {
      toast({
        title: 'Remove failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCoverRemove = async () => {
    if (!isOwnProfile) return;
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ cover_url: null })
        .eq('id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });

      toast({
        title: 'Cover photo removed',
        description: 'Your cover photo has been removed',
      });
    } catch (error: any) {
      toast({
        title: 'Remove failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Story handlers
  const handleStoryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStoryFile(file);
      setStoryPreview(URL.createObjectURL(file));
      setShowStoryDialog(true);
    }
  };

  const handleCreateStory = async () => {
    if (!storyFile) return;
    
    try {
      await createStory.mutateAsync({
        mediaFile: storyFile,
        caption: storyCaption || undefined,
      });
      
      toast({ title: 'Story created!' });
      setShowStoryDialog(false);
      setStoryFile(null);
      setStoryPreview(null);
      setStoryCaption('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const triggerStoryUpload = () => {
    storyFileInputRef.current?.click();
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
      
      if (error) throw error;
      
      toast({ title: 'Post deleted' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const renderFriendButton = () => {
    if (isOwnProfile) return null;

    if (friendshipStatus?.status === 'accepted') {
      return (
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={() => removeFriend.mutate(friendshipStatus.friendshipId)}
            disabled={removeFriend.isPending}
            className="gap-2"
          >
            <UsersIcon className="w-4 h-4" />
            Friends
          </Button>
          <Button 
            className="bg-gradient-primary gap-2"
            onClick={handleStartChat}
          >
            <Send className="w-4 h-4" />
            Message
          </Button>
          <ProfileMoreMenu 
            userId={userId!} 
            displayName={profile?.display_name || 'User'} 
          />
        </div>
      );
    }

    if (friendshipStatus?.status === 'pending') {
      return (
        <div className="flex gap-2">
          <Button variant="secondary" disabled className="gap-2">
            <UserPlus className="w-4 h-4" />
            Request Sent
          </Button>
          <ProfileMoreMenu 
            userId={userId!} 
            displayName={profile?.display_name || 'User'} 
          />
        </div>
      );
    }

    if (friendshipStatus?.status === 'incoming') {
      return (
        <div className="flex gap-2">
          <Button 
            className="bg-gradient-primary gap-2"
            onClick={() => acceptFriendRequest.mutate(friendshipStatus.friendshipId)}
            disabled={acceptFriendRequest.isPending}
          >
            <Check className="w-4 h-4" />
            Confirm
          </Button>
          <Button 
            variant="secondary"
            onClick={() => declineFriendRequest.mutate(friendshipStatus.friendshipId)}
            disabled={declineFriendRequest.isPending}
          >
            Delete Request
          </Button>
          <ProfileMoreMenu 
            userId={userId!} 
            displayName={profile?.display_name || 'User'} 
          />
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        <Button 
          className="bg-gradient-primary shadow-glow gap-2"
          onClick={() => sendFriendRequest.mutate(userId!)}
          disabled={sendFriendRequest.isPending}
        >
          <UserPlus className="w-4 h-4" />
          Add Friend
        </Button>
        <Button 
          variant="secondary"
          onClick={handleStartChat}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          Message
        </Button>
        <ProfileMoreMenu 
          userId={userId!} 
          displayName={profile?.display_name || 'User'} 
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-subtle">
        <p className="text-muted-foreground mb-4">User not found</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {!isOwnProfile && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <img src="/sha-verse-logo.jpeg" alt="Sha-Verse" className="w-8 h-8 rounded-full object-cover" />
            <h1 className="text-lg sm:text-xl font-bold truncate max-w-[200px]">
              {profile?.display_name}
            </h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {isOwnProfile && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/messages')}
                  className="h-9 w-9 rounded-full"
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/saved')}
                  className="h-9 w-9 rounded-full"
                >
                  <Bookmark className="w-5 h-5" />
                </Button>
                <ProfileSettingsDialog />
                <NotificationBell />
                <AppMenu />
              </>
            )}
          </div>
        </div>
      </header>


      {/* Cover Photo */}
      <div className="relative max-w-5xl mx-auto bg-card">
        <div 
          className="h-48 sm:h-60 md:h-80 bg-gradient-primary relative"
          style={profile?.cover_url ? {
            backgroundImage: `url(${profile.cover_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        >
          {isOwnProfile && (
            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
              <ProfileImageUpload 
                type="cover" 
                onUpload={handleCoverUpload}
                onRemove={handleCoverRemove}
                hasImage={!!profile?.cover_url}
                disabled={uploading}
              />
            </div>
          )}
        </div>

        {/* Profile Picture */}
        <div className="absolute -bottom-16 sm:-bottom-20 left-4 sm:left-6 group">
          <Avatar className="h-32 w-32 sm:h-40 sm:w-40 border-4 border-card shadow-lg ring-4 ring-card">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-4xl sm:text-5xl font-bold">
              {profile?.display_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          {isOwnProfile && (
            <div className="absolute bottom-2 right-2">
              <ProfileImageUpload 
                type="avatar" 
                onUpload={handleAvatarUpload}
                onRemove={handleAvatarRemove}
                hasImage={!!profile?.avatar_url}
                disabled={uploading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Profile Info Section */}
      <div className="max-w-5xl mx-auto bg-card px-4 sm:px-6 pt-20 sm:pt-24 pb-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold">{profile?.display_name}</h2>
            
            {/* Mutual Friends for other profiles */}
            {!isOwnProfile && mutualFriendsCount > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex -space-x-2">
                  {mutualFriends.slice(0, 3).map((friend: any) => (
                    <Avatar key={friend.id} className="h-6 w-6 border-2 border-card">
                      {friend.avatar_url && <AvatarImage src={friend.avatar_url} />}
                      <AvatarFallback className="text-xs bg-muted">
                        {friend.display_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {mutualFriendsCount} mutual friend{mutualFriendsCount !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Friend count for own profile */}
            {isOwnProfile && (
              <p 
                className="text-sm text-primary font-medium mt-1 cursor-pointer hover:underline"
                onClick={() => navigate('/friends')}
              >
                {friendsData?.length || 0} friends
              </p>
            )}

            {profile?.bio && (
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">{profile.bio}</p>
            )}
          </div>
          
          <div className="flex-shrink-0">
            {isOwnProfile ? (
              <div className="flex gap-2">
                <input
                  ref={storyFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleStoryFileSelect}
                />
                <Button className="bg-gradient-primary gap-2" onClick={triggerStoryUpload}>
                  <Plus className="w-4 h-4" />
                  Add to story
                </Button>
                <EditProfileDialog profile={profile} />
              </div>
            ) : (
              renderFriendButton()
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-5xl mx-auto bg-card border-t border-border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 sm:px-6 overflow-x-auto scrollbar-hide">
            <TabsList className="inline-flex h-12 bg-transparent gap-0 min-w-full sm:min-w-0">
              <TabsTrigger 
                value="posts" 
                className="px-4 py-3 text-sm font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger 
                value="about" 
                className="px-4 py-3 text-sm font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
              >
                About
              </TabsTrigger>
              <TabsTrigger 
                value="friends" 
                className="px-4 py-3 text-sm font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
              >
                Friends
              </TabsTrigger>
              <TabsTrigger 
                value="photos" 
                className="px-4 py-3 text-sm font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
              >
                Photos
              </TabsTrigger>
              <TabsTrigger 
                value="videos" 
                className="px-4 py-3 text-sm font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
              >
                Videos
              </TabsTrigger>
              <TabsTrigger 
                value="links" 
                className="px-4 py-3 text-sm font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
              >
                Links
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Posts Tab - Facebook Layout with Sidebar */}
          <TabsContent value="posts" className="mt-0">
            <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Left Sidebar */}
                <div className="lg:col-span-2 space-y-4">
                  <ProfileIntroCard 
                    profile={profile} 
                    friendsCount={friendsData?.length || 0}
                    isOwnProfile={isOwnProfile}
                    isFriend={friendshipStatus?.status === 'accepted'}
                    onEditClick={() => setEditDialogOpen(true)}
                  />
                  <FeaturedPhotos 
                    photos={photos || []} 
                    isOwnProfile={isOwnProfile}
                    userId={userId}
                    onSeeAllClick={() => setActiveTab('photos')}
                  />
                  <FriendsPreview 
                    friends={friendsData || []}
                    friendsCount={friendsData?.length || 0}
                    mutualFriendsCount={mutualFriendsCount}
                    isOwnProfile={isOwnProfile}
                    userId={userId}
                    onSeeAllClick={() => setActiveTab('friends')}
                  />
                </div>

                {/* Posts Feed */}
                <div className="lg:col-span-3 space-y-4">
                  {/* Create Post Box (only on own profile) */}
                  {isOwnProfile && <CreatePostCard />}

                  {/* Posts */}
                  {postsLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : posts && posts.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {posts.flatMap((post: any, idx: number) => {
                          const card = (
                            <ProfilePostCard
                              key={post.id}
                              post={post}
                              isOwnProfile={isOwnProfile}
                              onShare={(postId) => sharePost.mutate({ postId })}
                              onDelete={handleDeletePost}
                              onPin={(postId) => togglePinPost.mutate(postId)}
                            />
                          );
                          if ((idx + 1) % 5 === 0) {
                            return [
                              card,
                              <NativeAdCard
                                key={`ad-${post.id}`}
                                placement="profile_posts"
                              />,
                            ];
                          }
                          return [card];
                        })}
                      </div>
                      {/* Pagination Controls */}
                      <div className="flex justify-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPostsPage(p => Math.max(0, p - 1))}
                          disabled={postsPage === 0}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground self-center px-2">
                          Page {postsPage + 1}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPostsPage(p => p + 1)}
                          disabled={!postsHasMore}
                        >
                          Next
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground">No posts yet</p>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="mt-0">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
              <Card className="p-6">
                <h3 className="font-semibold text-xl mb-6">About</h3>
                
                {/* Overview Section */}
                <div className="space-y-4">
                  {shouldShowInfo((profile?.privacy as any)?.about_me, isOwnProfile, friendshipStatus?.status === 'accepted') && profile?.about_me && (
                    <div className="pb-4 border-b border-border">
                      <p className="text-sm text-muted-foreground">{profile.about_me}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {shouldShowInfo((profile?.privacy as any)?.work, isOwnProfile, friendshipStatus?.status === 'accepted') && profile?.work && (
                      <div className="flex items-start gap-4">
                        <Briefcase className="w-6 h-6 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm">Works at <span className="font-semibold">{profile.work}</span></p>
                        </div>
                      </div>
                    )}

                    {shouldShowInfo((profile?.privacy as any)?.education, isOwnProfile, friendshipStatus?.status === 'accepted') && profile?.education && (
                      <div className="flex items-start gap-4">
                        <GraduationCap className="w-6 h-6 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm">Studied at <span className="font-semibold">{profile.education}</span></p>
                        </div>
                      </div>
                    )}

                    {shouldShowInfo((profile?.privacy as any)?.location, isOwnProfile, friendshipStatus?.status === 'accepted') && profile?.current_city && (
                      <div className="flex items-start gap-4">
                        <MapPin className="w-6 h-6 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm">Lives in <span className="font-semibold">{profile.current_city}</span></p>
                        </div>
                      </div>
                    )}

                    {shouldShowInfo((profile?.privacy as any)?.location, isOwnProfile, friendshipStatus?.status === 'accepted') && profile?.hometown && (
                      <div className="flex items-start gap-4">
                        <HomeIcon className="w-6 h-6 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm">From <span className="font-semibold">{profile.hometown}</span></p>
                        </div>
                      </div>
                    )}

                    {shouldShowInfo((profile?.privacy as any)?.relationship, isOwnProfile, friendshipStatus?.status === 'accepted') && profile?.relationship_status && (
                      <div className="flex items-start gap-4">
                        <Heart className="w-6 h-6 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold">{profile.relationship_status}</p>
                        </div>
                      </div>
                    )}

                    {profile?.gender && (
                      <div className="flex items-start gap-4">
                        <UserIcon className="w-6 h-6 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm">{profile.gender}</p>
                        </div>
                      </div>
                    )}

                    {shouldShowInfo((profile?.privacy as any)?.birthdate, isOwnProfile, friendshipStatus?.status === 'accepted') && profile?.birthdate && (
                      <div className="flex items-start gap-4">
                        <Cake className="w-6 h-6 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm">Born on <span className="font-semibold">{format(new Date(profile.birthdate), 'MMMM d, yyyy')}</span></p>
                        </div>
                      </div>
                    )}

                    {shouldShowInfo((profile?.privacy as any)?.phone, isOwnProfile, friendshipStatus?.status === 'accepted') && profile?.phone && (
                      <div className="flex items-start gap-4">
                        <Phone className="w-6 h-6 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm">{profile.phone}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      <Calendar className="w-6 h-6 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm">
                          Joined {profile?.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : 'recently'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends" className="mt-0">
            <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-xl">Friends</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {friendsData?.length || 0} friends
                      {!isOwnProfile && mutualFriendsCount > 0 && (
                        <span> · {mutualFriendsCount} mutual</span>
                      )}
                      {friendsData && friendsData.length > 0 && (
                        <span> · Page {friendsPage + 1}</span>
                      )}
                    </p>
                  </div>
                  {isOwnProfile && (
                    <Button variant="ghost" size="sm" onClick={() => navigate('/friends')}>
                      Friend requests
                    </Button>
                  )}
                </div>

                {friendsData && friendsData.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {friendsData.map((friendship: any) => (
                        <Card 
                          key={friendship.id} 
                          className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => navigate(`/profile/${friendship.profiles?.id}`)}
                        >
                          <div className="aspect-square">
                            <Avatar className="w-full h-full rounded-none">
                              {friendship.profiles?.avatar_url && (
                                <AvatarImage src={friendship.profiles.avatar_url} className="object-cover" />
                              )}
                              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl rounded-none">
                                {friendship.profiles?.display_name?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="p-3">
                            <h4 className="font-semibold text-sm truncate">{friendship.profiles?.display_name}</h4>
                          </div>
                        </Card>
                      ))}
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex justify-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFriendsPage(p => Math.max(0, p - 1))}
                        disabled={friendsPage === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFriendsPage(p => p + 1)}
                        disabled={!friendsHasMore}
                      >
                        Next
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <UsersIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No friends yet</p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="mt-0">
            <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-xl">Photos</h3>
                  {photos && photos.length > 0 && (
                    <span className="text-sm text-muted-foreground">Page {photosPage + 1}</span>
                  )}
                </div>
                
                {photosLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : photos && photos.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 sm:gap-2">
                      {photos.map((photo: any) => (
                        <div key={photo.id} className="aspect-square cursor-pointer hover:opacity-90 transition-opacity">
                          <img 
                            src={photo.image_url} 
                            alt={photo.content || 'Photo'} 
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex justify-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPhotosPage(p => Math.max(0, p - 1))}
                        disabled={photosPage === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPhotosPage(p => p + 1)}
                        disabled={!photosHasMore}
                      >
                        Next
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No photos yet</p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="mt-0">
            <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
              <Card className="p-4 sm:p-6">
                <h3 className="font-semibold text-xl mb-4">Videos</h3>
                
                {videosLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : videos && videos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {videos.map((video: any) => (
                      <Card 
                        key={video.id} 
                        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => navigate(`/video/${video.id}`)}
                      >
                        <div className="aspect-video relative">
                          {video.thumbnail_url ? (
                            <img 
                              src={video.thumbnail_url} 
                              alt={video.title} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Video className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          {video.duration && (
                            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                              {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                            </span>
                          )}
                        </div>
                        <div className="p-2">
                          <h4 className="font-medium text-sm truncate">{video.title}</h4>
                          <p className="text-xs text-muted-foreground">{video.views_count || 0} views</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No videos yet</p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links" className="mt-0">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
              <SocialLinksSection 
                profile={profile} 
                isOwnProfile={isOwnProfile} 
                friendshipStatus={friendshipStatus} 
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Story Creation Dialog */}
      <Dialog open={showStoryDialog} onOpenChange={setShowStoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {storyPreview && (
              <div className="relative aspect-[9/16] max-h-[400px] rounded-lg overflow-hidden bg-black">
                {storyFile?.type.startsWith("video") ? (
                  <video
                    src={storyPreview}
                    className="w-full h-full object-contain"
                    controls
                  />
                ) : (
                  <img
                    src={storyPreview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            )}
            <Input
              placeholder="Add a caption..."
              value={storyCaption}
              onChange={(e) => setStoryCaption(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowStoryDialog(false);
                  setStoryFile(null);
                  setStoryPreview(null);
                  setStoryCaption('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gradient-primary"
                onClick={handleCreateStory}
                disabled={createStory.isPending}
              >
                {createStory.isPending ? "Posting..." : "Share Story"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
