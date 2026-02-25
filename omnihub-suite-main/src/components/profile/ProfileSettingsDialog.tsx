import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Settings, Shield, Lock, Eye, UserX, Smartphone, 
  Clock, AlertTriangle, LogOut, Key, Globe, Users
} from 'lucide-react';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow, format } from 'date-fns';

interface ProfileSettingsDialogProps {
  trigger?: React.ReactNode;
}

export const ProfileSettingsDialog = ({ trigger }: ProfileSettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('privacy');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();
  
  const { profile } = useProfile();
  const { 
    blockedUsers,
    sessions,
    activities,
    unblockUser,
    endSession,
    endAllOtherSessions,
    updatePrivacy,
    changePassword,
  } = useProfileSettings();

  const privacySettings = (profile?.privacy as Record<string, string>) || {};

  const handlePrivacyChange = (field: string, value: string) => {
    updatePrivacy.mutate({
      ...privacySettings,
      [field]: value,
    });
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new passwords match.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const PrivacySelect = ({ field, label }: { field: string; label: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm">{label}</span>
      <Select
        value={privacySettings[field] || 'public'}
        onValueChange={(value) => handlePrivacyChange(field, value)}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="public">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Public
            </div>
          </SelectItem>
          <SelectItem value="friends">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Friends
            </div>
          </SelectItem>
          <SelectItem value="only_me">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Only Me
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings & Privacy
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 gap-1">
            <TabsTrigger value="privacy" className="text-xs sm:text-sm">
              <Eye className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm">
              <Shield className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="blocking" className="text-xs sm:text-sm">
              <UserX className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Blocking</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm">
              <Clock className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          {/* Privacy Tab */}
          <TabsContent value="privacy">
            <ScrollArea className="h-[400px] pr-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Who can see your info
                </h4>
                <div className="space-y-1">
                  <PrivacySelect field="email" label="Email address" />
                  <PrivacySelect field="phone" label="Phone number" />
                  <PrivacySelect field="birthdate" label="Birthday" />
                  <PrivacySelect field="location" label="Location" />
                  <PrivacySelect field="work" label="Workplace" />
                  <PrivacySelect field="education" label="Education" />
                  <PrivacySelect field="relationship" label="Relationship status" />
                  <PrivacySelect field="friends_list" label="Friends list" />
                </div>
              </Card>

              <Card className="p-4 mt-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Timeline & Tagging
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Review tags before they appear</p>
                      <p className="text-xs text-muted-foreground">Review posts you're tagged in</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Who can post on your timeline</p>
                    </div>
                    <Select defaultValue="friends">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friends">Friends</SelectItem>
                        <SelectItem value="only_me">Only Me</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            </ScrollArea>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <ScrollArea className="h-[400px] pr-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Change Password
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button 
                    onClick={handleChangePassword}
                    disabled={!newPassword || newPassword !== confirmPassword || changePassword.isPending}
                    className="w-full"
                  >
                    {changePassword.isPending ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </Card>

              <Card className="p-4 mt-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Active Sessions
                </h4>
                <div className="space-y-3">
                  {sessions && sessions.length > 0 ? (
                    <>
                      {sessions.map((session: any) => (
                        <div key={session.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                          <div className="flex items-center gap-3">
                            <Smartphone className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {session.browser || 'Unknown Device'}
                                {session.is_current && (
                                  <span className="ml-2 text-xs text-primary">(This device)</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {session.location || 'Unknown location'} · Last active {' '}
                                {formatDistanceToNow(new Date(session.last_active), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          {!session.is_current && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => endSession.mutate(session.id)}
                            >
                              <LogOut className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {sessions.filter((s: any) => !s.is_current).length > 0 && (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => endAllOtherSessions.mutate()}
                        >
                          Log out of all other devices
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No active sessions tracked
                    </p>
                  )}
                </div>
              </Card>

              <Card className="p-4 mt-4 border-destructive/50">
                <h4 className="font-semibold mb-4 flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  Deactivate Account
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Temporarily disable your account. You can reactivate it anytime by logging in.
                </p>
                <Button variant="destructive" className="w-full">
                  Deactivate Account
                </Button>
              </Card>
            </ScrollArea>
          </TabsContent>

          {/* Blocking Tab */}
          <TabsContent value="blocking">
            <ScrollArea className="h-[400px] pr-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <UserX className="w-4 h-4" />
                  Blocked Users
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Blocked users can't see your posts, tag you, send you messages, or notifications. 
                  They will be automatically removed from your friends list. 
                  If you unblock them, you'll need to send a new friend request.
                </p>
                
                {blockedUsers && blockedUsers.length > 0 ? (
                  <div className="space-y-3">
                    {blockedUsers.map((block: any) => (
                      <div key={block.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {block.profiles?.avatar_url && (
                              <AvatarImage src={block.profiles.avatar_url} />
                            )}
                            <AvatarFallback>
                              {block.profiles?.display_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{block.profiles?.display_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Blocked {formatDistanceToNow(new Date(block.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => unblockUser.mutate(block.id)}
                        >
                          Unblock
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UserX className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No blocked users</p>
                  </div>
                )}
              </Card>
            </ScrollArea>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity">
            <ScrollArea className="h-[400px] pr-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Activity Log
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Your recent activities on the platform
                </p>
                
                {activities && activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.map((activity: any) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium capitalize">
                              {activity.activity_type.replace(/_/g, ' ')}
                            </span>
                            {activity.content && (
                              <span className="text-muted-foreground"> - {activity.content}</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(activity.created_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No activities yet</p>
                  </div>
                )}
              </Card>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
