import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Heart, MessageCircle, Share2, Users, Globe, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { usePage, usePages } from '@/hooks/usePages';
import PagePostCard from '@/components/pages/PagePostCard';
import CreatePagePost from '@/components/pages/CreatePagePost';
import { ShareDialog } from '@/components/ShareDialog';
import { useState } from 'react';

const PageDetail = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { followPage, unfollowPage } = usePages();
  const { 
    page, 
    pageLoading, 
    isFollowing, 
    userRole, 
    pagePosts, 
    postsLoading,
    isEditor 
  } = usePage(pageId);
  const [showShareDialog, setShowShareDialog] = useState(false);

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Skeleton className="h-48 w-full" />
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Page not found</h2>
            <Button onClick={() => navigate('/pages')}>Browse Pages</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleFollowToggle = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (isFollowing) {
      unfollowPage.mutate(page.id);
    } else {
      followPage.mutate(page.id);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Cover Photo */}
      <div 
        className="h-48 md:h-64 bg-gradient-to-r from-primary/30 to-primary/10 relative"
        style={page.cover_url ? { 
          backgroundImage: `url(${page.cover_url})`, 
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : undefined}
      >
        {userRole === 'admin' && (
          <Button 
            size="sm" 
            variant="secondary" 
            className="absolute bottom-4 right-4"
            onClick={() => navigate(`/page/${page.id}/admin`)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Page
          </Button>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row gap-4 -mt-16 md:-mt-12 relative z-10">
          <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
            <AvatarImage src={page.avatar_url || ''} />
            <AvatarFallback className="text-4xl">{page.name[0]}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 pt-4 md:pt-16">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold">{page.name}</h1>
                  {page.verified && (
                    <Badge variant="secondary">✓ Verified</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{page.category}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <Users className="h-3 w-3 inline mr-1" />
                  {page.followers_count || 0} followers
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant={isFollowing ? "outline" : "default"}
                  onClick={handleFollowToggle}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                {userRole && (
                  <Button variant="outline" onClick={() => navigate(`/page/${page.id}/admin`)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid md:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="space-y-4">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {page.about && (
                  <p className="text-sm">{page.about}</p>
                )}
                
                {page.website && (() => {
                  const raw = String(page.website).trim();
                  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
                  // Only allow http/https to prevent javascript:/data: URI injection
                  const safeHref = /^https?:\/\//i.test(candidate) ? candidate : null;
                  if (!safeHref) return null;
                  return (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={safeHref} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {page.website}
                      </a>
                    </div>
                  );
                })()}
                
                {page.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${page.email}`} className="text-primary hover:underline">
                      {page.email}
                    </a>
                  </div>
                )}
                
                {page.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{page.phone}</span>
                  </div>
                )}
                
                {page.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{page.location}</span>
                  </div>
                )}
                
                {page.hours && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{page.hours}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="py-4 space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setShowShareDialog(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Page
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Posts */}
          <div className="md:col-span-2 space-y-4">
            {/* Create Post (for editors) */}
            {isEditor && (
              <CreatePagePost pageId={page.id} />
            )}

            {/* Posts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Posts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {postsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-32" />
                    ))}
                  </div>
                ) : pagePosts?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No posts yet
                  </p>
                ) : (
                  pagePosts?.map(post => (
                    <PagePostCard 
                      key={post.id} 
                      post={post} 
                      page={page}
                      canDelete={userRole === 'admin'}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        postId={pageId || ''}
        postType="post"
        postContent={page.name}
        postImage={page.avatar_url}
      />
    </div>
  );
};

export default PageDetail;
