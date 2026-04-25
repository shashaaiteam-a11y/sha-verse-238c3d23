import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Settings, Shield, Lock, Eye, UserX, Smartphone, 
  Clock, AlertTriangle, LogOut, Key, Globe, Users, Trash2,
  Mail, Phone, Calendar, MapPin, Briefcase, GraduationCap, Heart, UserCheck, Tag
} from 'lucide-react';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow, format, startOfWeek, endOfWeek } from 'date-fns';

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
    deleteActivity,
    deleteActivitiesByWeek,
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

  const PrivacySelect = ({ field, label, icon: Icon }: { field: string; label: string; icon: any }) => (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-secondary/60 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Select
        value={privacySettings[field] || 'public'}
        onValueChange={(value) => handlePrivacyChange(field, value)}
      >
        <SelectTrigger className="w-28 h-8 text-xs border-border bg-secondary rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="public">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-green-500" />
              <span>Public</span>
            </div>
          </SelectItem>
          <SelectItem value="friends">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>Friends</span>
            </div>
          </SelectItem>
          <SelectItem value="only_me">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-orange-500" />
              <span>Only Me</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const SectionHeader = ({ icon: Icon, title, color = 'text-primary', bg = 'bg-primary/10' }: { icon: any; title: string; color?: string; bg?: string }) => (
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <span className="font-semibold text-sm">{title}</span>
    </div>
  );

  const groupedActivities = useMemo(() => {
    const grouped = new Map<string, { label: string; weekStart: Date; items: any[] }>();

    (activities || []).forEach((activity: any) => {
      const createdAt = new Date(activity.created_at);
      const weekStart = startOfWeek(createdAt, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(createdAt, { weekStartsOn: 1 });
      const key = format(weekStart, 'yyyy-MM-dd');

      if (!grouped.has(key)) {
        grouped.set(key, {
          label: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`,
          weekStart,
          items: [],
        });
      }

      grouped.get(key)?.items.push(activity);
    });

    return Array.from(grouped.values()).sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
  }, [activities]);

  const getActivityTitle = (activity: any) => {
    if (activity?.metadata?.action) {
      return String(activity.metadata.action).replace(/_/g, ' ');
    }
    return String(activity.activity_type || 'activity').replace(/_/g, ' ');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-[90vw] md:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4 text-primary" />
            </div>
            Settings & Privacy
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="mx-5 mt-3 shrink-0 grid grid-cols-4 bg-secondary rounded-xl h-9">
            <TabsTrigger value="privacy" className="rounded-lg text-xs font-medium gap-1">
              <Eye className="w-3 h-3" /><span className="hidden sm:inline">Privacy</span><span className="sm:hidden">Priv</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg text-xs font-medium gap-1">
              <Shield className="w-3 h-3" /><span className="hidden sm:inline">Security</span><span className="sm:hidden">Sec</span>
            </TabsTrigger>
            <TabsTrigger value="blocking" className="rounded-lg text-xs font-medium gap-1">
              <UserX className="w-3 h-3" /><span className="hidden sm:inline">Blocking</span><span className="sm:hidden">Block</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg text-xs font-medium gap-1">
              <Clock className="w-3 h-3" /><span className="hidden sm:inline">Activity</span><span className="sm:hidden">Log</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Privacy Tab ── */}
          <TabsContent value="privacy" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[calc(90vh-130px)]">
              <div className="px-5 py-4 space-y-4">
                {/* Who can see */}
                <div className="rounded-2xl border border-border bg-card p-4">
                  <SectionHeader icon={Eye} title="Who can see your info" />
                  <div className="space-y-0.5">
                    <PrivacySelect field="email" label="Email address" icon={Mail} />
                    <PrivacySelect field="phone" label="Phone number" icon={Phone} />
                    <PrivacySelect field="birthdate" label="Birthday" icon={Calendar} />
                    <PrivacySelect field="location" label="Location" icon={MapPin} />
                    <PrivacySelect field="work" label="Workplace" icon={Briefcase} />
                    <PrivacySelect field="education" label="Education" icon={GraduationCap} />
                    <PrivacySelect field="relationship" label="Relationship status" icon={Heart} />
                    <PrivacySelect field="friends_list" label="Friends list" icon={UserCheck} />
                  </div>
                </div>

                {/* Timeline & Tagging */}
                <div className="rounded-2xl border border-border bg-card p-4">
                  <SectionHeader icon={Tag} title="Timeline & Tagging" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Eye className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Review tags before they appear</p>
                          <p className="text-xs text-muted-foreground">Approve posts you're tagged in</p>
                        </div>
                      </div>
                      <Switch
                        checked={privacySettings['review_tags'] !== 'false'}
                        onCheckedChange={(checked) => handlePrivacyChange('review_tags', checked ? 'true' : 'false')}
                      />
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <p className="text-sm font-medium">Who can post on your timeline</p>
                      </div>
                      <Select
                        value={privacySettings['timeline_post'] || 'friends'}
                        onValueChange={(v) => handlePrivacyChange('timeline_post', v)}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs border-border bg-secondary rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friends">
                            <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-blue-500" /><span>Friends</span></div>
                          </SelectItem>
                          <SelectItem value="only_me">
                            <div className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-orange-500" /><span>Only Me</span></div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Security Tab ── */}
          <TabsContent value="security" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[calc(90vh-130px)]">
              <div className="px-5 py-4 space-y-4">
                {/* Change Password */}
                <div className="rounded-2xl border border-border bg-card p-4">
                  <SectionHeader icon={Key} title="Change Password" />
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Password</Label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="bg-secondary border-0 focus-visible:ring-1 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">New Password</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="bg-secondary border-0 focus-visible:ring-1 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confirm New Password</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="bg-secondary border-0 focus-visible:ring-1 rounded-xl"
                      />
                    </div>
                    <Button
                      onClick={handleChangePassword}
                      disabled={!newPassword || newPassword !== confirmPassword || changePassword.isPending}
                      className="w-full h-10 rounded-xl font-semibold bg-gradient-primary"
                    >
                      {changePassword.isPending ? 'Changing...' : 'Update Password'}
                    </Button>
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="rounded-2xl border border-border bg-card p-4">
                  <SectionHeader icon={Smartphone} title="Active Sessions" />
                  {sessions && sessions.length > 0 ? (
                    <div className="space-y-2">
                      {sessions.map((session: any) => (
                        <div key={session.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${session.is_current ? 'bg-primary/20' : 'bg-muted'}`}>
                              <Smartphone className={`w-3.5 h-3.5 ${session.is_current ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium flex items-center gap-1.5 truncate">
                                {session.browser || 'Unknown Device'}
                                {session.is_current && (
                                  <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">Current</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {session.location || 'Unknown location'} · {formatDistanceToNow(new Date(session.last_active), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          {!session.is_current && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => endSession.mutate(session.id)}
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {sessions.filter((s: any) => !s.is_current).length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-1 rounded-xl text-xs h-9"
                          onClick={() => endAllOtherSessions.mutate()}
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1.5" />
                          Log out of all other devices
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Smartphone className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No active sessions tracked</p>
                    </div>
                  )}
                </div>

                {/* Deactivate Account */}
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                  <SectionHeader icon={AlertTriangle} title="Deactivate Account" color="text-destructive" bg="bg-destructive/15" />
                  <p className="text-xs text-muted-foreground mb-3 pl-10">
                    Temporarily disable your account. You can reactivate it anytime by logging in.
                  </p>
                  <Button variant="destructive" className="w-full h-10 rounded-xl text-sm font-semibold">
                    Deactivate Account
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Blocking Tab ── */}
          <TabsContent value="blocking" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[calc(90vh-130px)]">
              <div className="px-5 py-4">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <SectionHeader icon={UserX} title="Blocked Users" />
                  <p className="text-xs text-muted-foreground mb-4 pl-10">
                    Blocked users can't see your posts, tag you, or send you messages. They're removed from your friends list automatically.
                  </p>
                  {blockedUsers && blockedUsers.length > 0 ? (
                    <div className="space-y-2">
                      {blockedUsers.map((block: any) => (
                        <div key={block.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-9 w-9 shrink-0">
                              {block.profiles?.avatar_url && <AvatarImage src={block.profiles.avatar_url} />}
                              <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                                {block.profiles?.display_name?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{block.profiles?.display_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Blocked {formatDistanceToNow(new Date(block.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 h-7 text-xs rounded-lg"
                            onClick={() => unblockUser.mutate(block.id)}
                            disabled={unblockUser.isPending}
                          >
                            Unblock
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                        <UserX className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium">No blocked users</p>
                      <p className="text-xs text-muted-foreground mt-1">People you block will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Activity Tab ── */}
          <TabsContent value="activity" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[calc(90vh-130px)]">
              <div className="px-5 py-4">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <SectionHeader icon={Clock} title="Activity Log" />
                  <p className="text-xs text-muted-foreground mb-4 pl-10">All activities are organized week-wise and you can delete any single item or a full week.</p>
                  {groupedActivities.length > 0 ? (
                    <div className="space-y-4">
                      {groupedActivities.map((week) => (
                        <div key={week.label} className="rounded-xl border border-border bg-secondary/40 p-2.5">
                          <div className="flex items-center justify-between px-1 pb-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Week: {week.label}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                              onClick={() => deleteActivitiesByWeek.mutate(week.items.map((item: any) => item.id))}
                              disabled={deleteActivitiesByWeek.isPending}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Clear Week
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {week.items.map((activity: any) => (
                              <div key={activity.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-secondary">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                  <Clock className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium capitalize leading-tight">{getActivityTitle(activity)}</p>
                                  {activity.content && (
                                    <p className="text-xs text-muted-foreground mt-0.5 break-words">{activity.content}</p>
                                  )}
                                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                                    {format(new Date(activity.created_at), 'MMM d, yyyy · h:mm a')}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteActivity.mutate(activity.id)}
                                  disabled={deleteActivity.isPending}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium">No activity yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Your recent actions will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
