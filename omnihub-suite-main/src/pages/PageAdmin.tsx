import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Settings, Users, BarChart3, FileText, 
  Shield, Camera, Save, Plus, Trash2, UserPlus 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePage, usePages, PageRole } from '@/hooks/usePages';
import { useUserSearch } from '@/hooks/useUserSearch';
import { toast } from 'sonner';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const PageAdmin = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updatePage } = usePages();
  const { 
    page, 
    pageLoading, 
    userRole, 
    pageTeam, 
    teamLoading,
    pagePosts,
    postsLoading,
    pageInsights,
    insightsLoading,
    addTeamMember,
    removeTeamMember,
    isAdmin,
    canViewInsights
  } = usePage(pageId);

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    about: '',
    category: '',
    website: '',
    email: '',
    phone: '',
    location: '',
    hours: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberRole, setNewMemberRole] = useState<PageRole['role']>('editor');
  const { searchTerm: searchQuery, setSearchTerm: setSearchQuery, results: searchResults, isLoading: isSearching } = useUserSearch();

  // Contact details are protected by column-level security; fetch via secure RPC.
  const [contactInfo, setContactInfo] = useState<{ email: string | null; phone: string | null }>({ email: null, phone: null });
  useEffect(() => {
    if (!pageId) return;
    let active = true;
    (supabase as any)
      .rpc('get_page_contact', { _page_id: pageId })
      .then(({ data }: { data: Array<{ email: string | null; phone: string | null }> | null }) => {
        if (active && data && data.length) {
          setContactInfo({ email: data[0].email ?? null, phone: data[0].phone ?? null });
          setFormData(prev => ({ ...prev, email: data[0].email ?? '', phone: data[0].phone ?? '' }));
        }
      });
    return () => { active = false; };
  }, [pageId]);

  // Initialize form data when page loads
  useState(() => {
    if (page) {
      setFormData({
        name: page.name || '',
        about: page.about || '',
        category: page.category || '',
        website: page.website || '',
        email: page.email || '',
        phone: page.phone || '',
        location: page.location || '',
        hours: page.hours || ''
      });
    }
  });

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-48 mb-4" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!page || (userRole !== 'admin' && userRole !== 'editor')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to manage this page
            </p>
            <Button onClick={() => navigate('/pages')}>Back to Pages</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updatePage.mutateAsync({
        pageId: page.id,
        updates: formData
      });
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update page:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTeamMember = async (userId: string) => {
    await addTeamMember.mutateAsync({ userId, role: newMemberRole });
    setShowAddMember(false);
    setSearchQuery('');
  };

  const handleRemoveTeamMember = async (userId: string) => {
    if (window.confirm('Remove this team member?')) {
      await removeTeamMember.mutateAsync(userId);
    }
  };

  // Calculate insights summary
  const insightsSummary = pageInsights?.reduce((acc, day) => ({
    totalViews: acc.totalViews + day.page_views,
    totalReach: acc.totalReach + day.reach,
    totalEngagement: acc.totalEngagement + day.engagement,
    netFollowers: acc.netFollowers + day.new_followers - day.unfollowers
  }), { totalViews: 0, totalReach: 0, totalEngagement: 0, netFollowers: 0 });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/page/${page.id}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={page.avatar_url || ''} />
                <AvatarFallback>{page.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold">{page.name}</h1>
                <p className="text-sm text-muted-foreground">Page Admin</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            {isAdmin && <TabsTrigger value="team">Team</TabsTrigger>}
            {canViewInsights && <TabsTrigger value="insights">Insights</TabsTrigger>}
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Followers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{page.followers_count || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Posts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pagePosts?.length || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Reach (30d)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{insightsSummary?.totalReach || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Page Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Page Settings</CardTitle>
                  {isAdmin && (
                    <Button 
                      variant={editMode ? "default" : "outline"} 
                      size="sm"
                      onClick={() => editMode ? handleSaveSettings() : setEditMode(true)}
                      disabled={isSaving}
                    >
                      {editMode ? (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </>
                      ) : (
                        <>
                          <Settings className="h-4 w-4 mr-2" />
                          Edit
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Page Name</Label>
                    {editMode ? (
                      <Input 
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm">{page.name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Category</Label>
                    {editMode ? (
                      <Input 
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm">{page.category || 'Not set'}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>About</Label>
                  {editMode ? (
                    <Textarea 
                      value={formData.about}
                      onChange={(e) => setFormData(prev => ({ ...prev, about: e.target.value }))}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm">{page.about || 'No description'}</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Website</Label>
                    {editMode ? (
                      <Input 
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        type="url"
                      />
                    ) : (
                      <p className="text-sm">{page.website || 'Not set'}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email</Label>
                    {editMode ? (
                      <Input 
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        type="email"
                      />
                    ) : (
                      <p className="text-sm">{contactInfo.email || 'Not set'}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    {editMode ? (
                      <Input 
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        type="tel"
                      />
                    ) : (
                      <p className="text-sm">{contactInfo.phone || 'Not set'}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Location</Label>
                    {editMode ? (
                      <Input 
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm">{page.location || 'Not set'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Posts</CardTitle>
                <CardDescription>Manage your page content</CardDescription>
              </CardHeader>
              <CardContent>
                {postsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : pagePosts?.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No posts yet</p>
                    <Button className="mt-4" onClick={() => navigate(`/page/${page.id}`)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Post
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pagePosts?.slice(0, 10).map(post => (
                      <div key={post.id} className="flex items-start gap-4 p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="line-clamp-2">{post.content}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{post.likes_count} likes</span>
                            <span>{post.comments_count} comments</span>
                            <span>{post.reach_count} reach</span>
                          </div>
                        </div>
                        {post.image_url && (
                          <img 
                            src={post.image_url} 
                            alt="" 
                            className="h-16 w-16 rounded object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          {isAdmin && (
            <TabsContent value="team" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Team Members</CardTitle>
                      <CardDescription>Manage who can access this page</CardDescription>
                    </div>
                    <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Team Member</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Search User</Label>
                            <Input 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search by name..."
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as PageRole['role'])}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="advertiser">Advertiser</SelectItem>
                                <SelectItem value="analyst">Analyst</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {searchResults?.length > 0 && (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {searchResults.map(u => (
                                <div 
                                  key={u.id}
                                  className="flex items-center justify-between p-2 border rounded hover:bg-muted cursor-pointer"
                                  onClick={() => handleAddTeamMember(u.id)}
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={u.avatar_url || ''} />
                                      <AvatarFallback>{u.display_name[0]}</AvatarFallback>
                                    </Avatar>
                                    <span>{u.display_name}</span>
                                  </div>
                                  <Plus className="h-4 w-4" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Page Owner */}
                  <div className="flex items-center justify-between p-3 border rounded-lg mb-4 bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>O</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Page Owner</p>
                        <p className="text-sm text-muted-foreground">Full control</p>
                      </div>
                    </div>
                    <Badge>Owner</Badge>
                  </div>

                  {/* Team Members */}
                  {teamLoading ? (
                    <div className="space-y-3">
                      {[...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  ) : pageTeam?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No team members yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {pageTeam?.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={member.profile?.avatar_url || ''} />
                              <AvatarFallback>
                                {member.profile?.display_name?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.profile?.display_name}</p>
                              <Badge variant="secondary" className="capitalize">
                                {member.role}
                              </Badge>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveTeamMember(member.user_id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Insights Tab */}
          {canViewInsights && (
            <TabsContent value="insights" className="space-y-4">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Page Views
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{insightsSummary?.totalViews || 0}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Reach
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{insightsSummary?.totalReach || 0}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Engagement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{insightsSummary?.totalEngagement || 0}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Net Followers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${(insightsSummary?.netFollowers || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(insightsSummary?.netFollowers || 0) >= 0 ? '+' : ''}{insightsSummary?.netFollowers || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <Card>
                <CardHeader>
                  <CardTitle>Reach Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  {insightsLoading ? (
                    <Skeleton className="h-64" />
                  ) : pageInsights?.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                        <p>No insights data available yet</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={pageInsights}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="reach" stroke="hsl(var(--primary))" strokeWidth={2} />
                        <Line type="monotone" dataKey="engagement" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default PageAdmin;
