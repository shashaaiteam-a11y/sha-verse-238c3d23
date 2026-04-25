import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupAdmin } from '@/hooks/useGroupAdmin';
import { useGroupReports } from '@/hooks/useGroupReports';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, Settings, Users, FileText, Shield, BarChart3, 
  Check, X, Trash2, Ban, UserMinus, Crown, Plus, Edit, Pin, PinOff,
  Flag, AlertTriangle, VolumeX, Volume2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const GroupAdmin = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const {
    userRole,
    isAdmin,
    isModerator,
    groupDetails,
    groupLoading,
    members,
    membersLoading,
    joinRequests,
    rules,
    blockedUsers,
    pendingPosts,
    insights,
    updateGroup,
    approveJoinRequest,
    rejectJoinRequest,
    removeMember,
    blockUser,
    unblockUser,
    updateMemberRole,
    approvePost,
    rejectPost,
    deletePost,
    togglePinPost,
    createRule,
    updateRule,
    deleteRule,
  } = useGroupAdmin(groupId);

  // Settings form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [requireJoinApproval, setRequireJoinApproval] = useState(false);
  const [requirePostApproval, setRequirePostApproval] = useState(false);

  // New rule dialog
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  // Sync form whenever groupDetails loads or changes (e.g. after realtime update)
  useEffect(() => {
    if (groupDetails) {
      setName(groupDetails.name || '');
      setDescription(groupDetails.description || '');
      setIsPrivate(groupDetails.is_private || false);
      setRequireJoinApproval((groupDetails as any).require_join_approval || false);
      setRequirePostApproval((groupDetails as any).require_post_approval || false);
    }
  }, [groupDetails]);

  if (groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isModerator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-subtle p-4">
        <Shield className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground text-center mb-4">You don't have admin or moderator access to this group.</p>
        <Button onClick={() => navigate(`/groups/${groupId}`)}>Back to Group</Button>
      </div>
    );
  }

  const handleSaveSettings = () => {
    updateGroup.mutate({
      name,
      description,
      is_private: isPrivate,
      require_join_approval: requireJoinApproval,
      require_post_approval: requirePostApproval,
    });
  };

  const handleCreateRule = () => {
    if (!newRuleTitle.trim()) return;
    createRule.mutate(
      { title: newRuleTitle, description: newRuleDescription },
      {
        onSuccess: () => {
          setNewRuleTitle('');
          setNewRuleDescription('');
          setRuleDialogOpen(false);
        },
      }
    );
  };

  // Live insights — computed from real tables (via useGroupAdmin)
  const totalMembers  = (insights as any)?.totalMembers  ?? members?.length ?? 0;
  const totalPosts    = (insights as any)?.totalPosts    ?? (groupDetails as any)?.posts_count ?? 0;
  const newToday      = (insights as any)?.newToday      ?? 0;
  const postsToday    = (insights as any)?.postsToday    ?? 0;
  const pendingInsightRequests = (insights as any)?.pendingRequests ?? 0;
  const blockedCount  = (insights as any)?.blockedCount  ?? 0;

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => navigate(`/groups/${groupId}`)}>
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate">Group Admin</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{groupDetails?.name}</p>
          </div>
          <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-xs">
            {userRole}
          </Badge>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="w-full grid grid-cols-5 mb-4 sm:mb-6">
            <TabsTrigger value="settings" className="text-xs sm:text-sm"><Settings className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Settings</span></TabsTrigger>
            <TabsTrigger value="members" className="text-xs sm:text-sm"><Users className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Members</span></TabsTrigger>
            <TabsTrigger value="posts" className="text-xs sm:text-sm"><FileText className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Posts</span></TabsTrigger>
            <TabsTrigger value="rules" className="text-xs sm:text-sm"><Shield className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Rules</span></TabsTrigger>
            <TabsTrigger value="insights" className="text-xs sm:text-sm"><BarChart3 className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Insights</span></TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">Group Settings</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter group name"
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter group description"
                    rows={4}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Private Group</Label>
                    <p className="text-xs text-muted-foreground">Only members can see posts</p>
                  </div>
                  <Switch checked={isPrivate} onCheckedChange={setIsPrivate} disabled={!isAdmin} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Join Approval</Label>
                    <p className="text-xs text-muted-foreground">Admins must approve new members</p>
                  </div>
                  <Switch checked={requireJoinApproval} onCheckedChange={setRequireJoinApproval} disabled={!isAdmin} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Post Approval</Label>
                    <p className="text-xs text-muted-foreground">Admins must approve posts before publishing</p>
                  </div>
                  <Switch checked={requirePostApproval} onCheckedChange={setRequirePostApproval} disabled={!isAdmin} />
                </div>
                {isAdmin && (
                  <Button onClick={handleSaveSettings} disabled={updateGroup.isPending} className="w-full">
                    {updateGroup.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            {/* Join Requests */}
            {joinRequests && joinRequests.length > 0 && (
              <Card className="p-4 sm:p-6 mb-4">
                <h3 className="text-lg font-semibold mb-4">Pending Requests ({joinRequests.length})</h3>
                <div className="space-y-3">
                  {joinRequests.map((request: any) => (
                    <div key={request.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                      <Avatar className="h-10 w-10">
                        {request.profiles?.avatar_url && <AvatarImage src={request.profiles.avatar_url} />}
                        <AvatarFallback>{request.profiles?.display_name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{request.profiles?.display_name}</p>
                        <p className="text-xs text-muted-foreground">@{request.profiles?.username}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="default" onClick={() => approveJoinRequest.mutate(request.id)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectJoinRequest.mutate(request.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Members List */}
            <Card className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">Members ({totalMembers})</h3>
              {membersLoading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <div className="space-y-3">
                  {members?.map((member: any) => (
                    <div key={member.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                      <Avatar className="h-10 w-10">
                        {member.profiles?.avatar_url && <AvatarImage src={member.profiles.avatar_url} />}
                        <AvatarFallback>{member.profiles?.display_name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{member.profiles?.display_name}</p>
                          {member.role === 'admin' && <Crown className="w-4 h-4 text-yellow-500" />}
                          {member.role === 'moderator' && <Shield className="w-4 h-4 text-blue-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground">Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}</p>
                      </div>
                      {isAdmin && member.profiles?.id !== user?.id && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role || 'member'}
                            onValueChange={(value) => updateMemberRole.mutate({ userId: member.user_id, role: value })}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {member.profiles?.display_name} from this group?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeMember.mutate(member.user_id)}>Remove</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                                <Ban className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Block User?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to block {member.profiles?.display_name}? They won't be able to rejoin.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => blockUser.mutate({ userId: member.user_id })}>Block</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Blocked Users */}
            {blockedUsers && blockedUsers.length > 0 && (
              <Card className="p-4 sm:p-6 mt-4">
                <h3 className="text-lg font-semibold mb-4">Blocked Users ({blockedUsers.length})</h3>
                <div className="space-y-3">
                  {blockedUsers.map((blocked: any) => (
                    <div key={blocked.id} className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                      <Avatar className="h-10 w-10">
                        {blocked.profiles?.avatar_url && <AvatarImage src={blocked.profiles.avatar_url} />}
                        <AvatarFallback>{blocked.profiles?.display_name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{blocked.profiles?.display_name}</p>
                        <p className="text-xs text-muted-foreground">{blocked.reason || 'No reason provided'}</p>
                      </div>
                      {isAdmin && (
                        <Button size="sm" variant="outline" onClick={() => unblockUser.mutate(blocked.user_id)}>
                          Unblock
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts">
            {/* Pending Posts */}
            {pendingPosts && pendingPosts.length > 0 ? (
              <Card className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4">Pending Posts ({pendingPosts.length})</h3>
                <div className="space-y-4">
                  {pendingPosts.map((post: any) => (
                    <div key={post.id} className="p-4 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-8 w-8">
                          {post.profiles?.avatar_url && <AvatarImage src={post.profiles.avatar_url} />}
                          <AvatarFallback>{post.profiles?.display_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{post.profiles?.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm mb-3">{post.content}</p>
                      {post.image_url && (
                        <img src={post.image_url} alt="" className="w-full max-h-48 object-cover rounded-lg mb-3" />
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approvePost.mutate(post.id)} className="flex-1">
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectPost.mutate(post.id)} className="flex-1">
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="p-6 sm:p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">No Pending Posts</h3>
                <p className="text-sm text-muted-foreground">
                  {groupDetails?.require_post_approval 
                    ? 'All posts have been reviewed.' 
                    : 'Post approval is disabled for this group.'}
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Group Rules ({rules?.length || 0})</h3>
                <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" /> Add Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Rule</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="ruleTitle">Rule Title</Label>
                        <Input
                          id="ruleTitle"
                          value={newRuleTitle}
                          onChange={(e) => setNewRuleTitle(e.target.value)}
                          placeholder="e.g., Be respectful"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ruleDesc">Description (optional)</Label>
                        <Textarea
                          id="ruleDesc"
                          value={newRuleDescription}
                          onChange={(e) => setNewRuleDescription(e.target.value)}
                          placeholder="Explain the rule in detail..."
                          rows={3}
                        />
                      </div>
                      <Button onClick={handleCreateRule} disabled={!newRuleTitle.trim() || createRule.isPending} className="w-full">
                        {createRule.isPending ? 'Creating...' : 'Create Rule'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              {rules && rules.length > 0 ? (
                <div className="space-y-3">
                  {rules.map((rule: any, index: number) => (
                    <div key={rule.id} className="p-4 bg-secondary/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{rule.title}</h4>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this rule?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRule.mutate(rule.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No rules defined yet.</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Insights Tab — Live computed stats */}
          <TabsContent value="insights">
            {/* Top stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <Card className="p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-primary">{totalMembers}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Members</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-green-500">{newToday}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">New Today</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-primary">{totalPosts}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Approved Posts</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-blue-500">{postsToday}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Posts Today</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-yellow-500">{pendingInsightRequests}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Pending Requests</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-red-500">{blockedCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Blocked Users</p>
              </Card>
            </div>

            {/* Info refresh note */}
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Live Stats</h3>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">Auto-refreshes every 30s</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="text-sm font-medium">📊 Member Growth</span>
                  <span className="text-sm text-primary font-semibold">{totalMembers} total · +{newToday} today</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="text-sm font-medium">📝 Content</span>
                  <span className="text-sm text-primary font-semibold">{totalPosts} posts · {postsToday} today</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="text-sm font-medium">⏳ Awaiting Approval</span>
                  <span className="text-sm text-yellow-500 font-semibold">{pendingInsightRequests} join requests</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="text-sm font-medium">🚫 Blocked</span>
                  <span className="text-sm text-red-500 font-semibold">{blockedCount} users</span>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GroupAdmin;
