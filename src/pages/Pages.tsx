import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Heart, Settings, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { usePages } from '@/hooks/usePages';
import CreatePageDialog from '@/components/pages/CreatePageDialog';

const Pages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pages, pagesLoading, myPages, myPagesLoading, followedPages, followedLoading, followPage, unfollowPage } = usePages();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const filteredPages = pages?.filter(page => 
    page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFollowing = (pageId: string) => {
    return followedPages?.some(p => p.id === pageId);
  };

  const handleFollowToggle = (pageId: string) => {
    if (isFollowing(pageId)) {
      unfollowPage.mutate(pageId);
    } else {
      followPage.mutate(pageId);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sign in to view Pages</h2>
            <p className="text-muted-foreground mb-4">
              Follow pages to stay updated with your favorite content
            </p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Pages</h1>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Page
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <Tabs defaultValue="discover" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
            <TabsTrigger value="your-pages">Your Pages</TabsTrigger>
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-4">
            {pagesLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : filteredPages?.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No pages found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredPages?.map(page => (
                  <Card key={page.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <div 
                      className="relative h-24 bg-gradient-to-r from-primary/20 to-primary/10"
                      style={page.cover_url ? { backgroundImage: `url(${page.cover_url})`, backgroundSize: 'cover' } : undefined}
                    />
                    <CardContent className="pt-0 -mt-8">
                      <div className="flex items-end gap-3 mb-3">
                        <Avatar className="h-16 w-16 border-4 border-background">
                          <AvatarImage src={page.avatar_url || ''} />
                          <AvatarFallback>{page.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-center gap-2">
                            <h3 
                              className="font-semibold truncate hover:underline"
                              onClick={() => navigate(`/page/${page.id}`)}
                            >
                              {page.name}
                            </h3>
                            {page.verified && (
                              <Badge variant="secondary" className="text-xs">✓</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{page.category}</p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {page.about || 'No description'}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          <Heart className="h-3 w-3 inline mr-1" />
                          {page.followers_count || 0} followers
                        </span>
                        <Button 
                          size="sm"
                          variant={isFollowing(page.id) ? "outline" : "default"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFollowToggle(page.id);
                          }}
                        >
                          {isFollowing(page.id) ? 'Following' : 'Follow'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Following Tab */}
          <TabsContent value="following" className="space-y-4">
            {followedLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : followedPages?.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No pages followed yet</h3>
                  <p className="text-muted-foreground">
                    Discover and follow pages to see their updates
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {followedPages?.map(page => (
                  <Card 
                    key={page.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/page/${page.id}`)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={page.avatar_url || ''} />
                          <AvatarFallback>{page.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{page.name}</h3>
                            {page.verified && (
                              <Badge variant="secondary" className="text-xs">✓</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{page.category}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            unfollowPage.mutate(page.id);
                          }}
                        >
                          Following
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Your Pages Tab */}
          <TabsContent value="your-pages" className="space-y-4">
            {myPagesLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : myPages?.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No pages yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create a page to share content with your audience
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Page
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {myPages?.map(page => (
                  <Card 
                    key={page.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={page.avatar_url || ''} />
                          <AvatarFallback>{page.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{page.name}</h3>
                            {page.verified && (
                              <Badge variant="secondary" className="text-xs">✓</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{page.category}</p>
                          <p className="text-xs text-muted-foreground">
                            {page.followers_count || 0} followers
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/page/${page.id}`)}
                          >
                            View
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => navigate(`/page/${page.id}/admin`)}
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Manage
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreatePageDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog} 
      />
    </div>
  );
};

export default Pages;
