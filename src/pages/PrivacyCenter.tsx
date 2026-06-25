import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, Shield, Eye, Lock, UserX, 
  FileText, Download, Trash2, ChevronRight
} from "lucide-react";
import { ProfileSettingsDialog } from "@/components/profile/ProfileSettingsDialog";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useProfile } from "@/hooks/useProfile";
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

const PrivacyCenter = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { profile } = useProfile();
  const [downloading, setDownloading] = useState(false);
  const [showLegal, setShowLegal] = useState<string | null>(null);

  const privacyOptions = [
    {
      icon: Eye,
      title: "Privacy Settings",
      description: "Control who can see your profile information and posts",
      action: "privacy-dialog"
    },
    {
      icon: Lock,
      title: "Security Settings",
      description: "Manage your password and login settings",
      action: "privacy-dialog"
    },
    {
      icon: UserX,
      title: "Blocked Users",
      description: "View and manage blocked accounts",
      action: "privacy-dialog"
    },
    {
      icon: Download,
      title: "Download Your Data",
      description: "Get a copy of all your Sha-Verse data",
      onClick: handleDownloadData
    },
    {
      icon: Trash2,
      title: "Delete Account",
      description: "Permanently delete your account and data",
      destructive: true,
      action: "delete-account"
    },
  ];

  async function handleDownloadData() {
    if (!user) return;
    setDownloading(true);
    try {
      const [profileRes, postsRes, friendsRes, savedRes] = await Promise.all([
        supabase.from('profiles').select('id, username, display_name, bio, avatar_url, cover_url, location, website, created_at, updated_at, work, education, hometown, current_city, facebook_url, instagram_url, twitter_url, hobbies, about_me, privacy, provider, last_login, is_verified, is_deactivated, deactivated_at').eq('id', user.id).single(),
        supabase.from('posts').select('id,content,image_url,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('friendships').select('id,friend_id,status,created_at').eq('user_id', user.id),
        supabase.from('saved_posts').select('id,post_id,group_post_id,created_at').eq('user_id', user.id),
      ]);

      // Owner's own sensitive fields (privacy-aware function returns all for owner)
      const { data: privateFields } = await supabase.rpc('get_profile_private_fields', { _profile_id: user.id });

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: { ...(profileRes.data || {}), ...((privateFields as Record<string, any>) || {}) },
        posts: postsRes.data || [],
        friendships: friendsRes.data || [],
        saved_posts: savedRes.data || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sha-verse-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Data downloaded', description: 'Your data has been exported successfully.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to download data. Please try again.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    try {
      await signOut();
      toast({ title: 'Account deactivated', description: 'Your account has been deactivated. Contact support to permanently delete your data.' });
      navigate('/auth');
    } catch {
      toast({ title: 'Error', description: 'Failed to deactivate account. Please try again.', variant: 'destructive' });
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-lg">Privacy Center</h1>
      </div>

      <ScrollArea className="h-[calc(100vh-60px)]">
        <div className="p-4 space-y-6">
          {/* Hero Section */}
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Your Privacy Matters</h2>
                <p className="text-sm text-muted-foreground">
                  Take control of your data and privacy settings
                </p>
              </div>
            </div>
          </Card>

          {/* Privacy Options */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Privacy Controls
            </h2>
            <Card className="divide-y divide-border">
              {privacyOptions.map((option) => {
                const Icon = option.icon;
                
                if (option.action === "privacy-dialog") {
                  return (
                    <ProfileSettingsDialog 
                      key={option.title}
                      trigger={
                        <button className="flex items-center w-full p-4 hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              option.destructive ? 'bg-destructive/10' : 'bg-secondary'
                            }`}>
                              <Icon className={`w-5 h-5 ${option.destructive ? 'text-destructive' : ''}`} />
                            </div>
                            <div className="text-left">
                              <p className={`font-medium text-sm ${option.destructive ? 'text-destructive' : ''}`}>
                                {option.title}
                              </p>
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </button>
                      }
                    />
                  );
                }

                if (option.action === "delete-account") {
                  return (
                    <DeleteAccountDialog
                      key={option.title}
                      trigger={
                        <button className="flex items-center w-full p-4 hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10">
                              <Icon className="w-5 h-5 text-destructive" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-sm text-destructive">{option.title}</p>
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </button>
                      }
                    />
                  );
                }
                
                return (
                  <button
                    key={option.title}
                    onClick={option.onClick}
                    className="flex items-center w-full p-4 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        option.destructive ? 'bg-destructive/10' : 'bg-secondary'
                      }`}>
                        <Icon className={`w-5 h-5 ${option.destructive ? 'text-destructive' : ''}`} />
                      </div>
                      <div className="text-left">
                        <p className={`font-medium text-sm ${option.destructive ? 'text-destructive' : ''}`}>
                          {option.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                    {downloading && option.title === 'Download Your Data' ? (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </Card>
          </div>

          {/* Terms & Policies */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Legal
            </h2>
            <Card className="divide-y divide-border">
              <button onClick={() => setShowLegal(showLegal === 'tos' ? null : 'tos')} className="flex flex-col w-full hover:bg-secondary/50 transition-colors">
                <div className="flex items-center w-full p-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">Terms of Service</p>
                      <p className="text-xs text-muted-foreground">Last updated: March 2026</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showLegal === 'tos' ? 'rotate-90' : ''}`} />
                </div>
                {showLegal === 'tos' && (
                  <div className="px-4 pb-4 text-left text-sm text-muted-foreground leading-relaxed">
                    <p className="mb-2">By using Sha-Verse, you agree to these Terms of Service. You must be at least 13 years old to use the platform.</p>
                    <p className="mb-2">You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
                    <p className="mb-2">You agree not to post content that is illegal, harmful, threatening, abusive, or violates the rights of others.</p>
                    <p>Sha-Verse reserves the right to suspend or terminate accounts that violate these terms. For questions, contact support@sha-verse.com.</p>
                  </div>
                )}
              </button>
              <button onClick={() => setShowLegal(showLegal === 'privacy' ? null : 'privacy')} className="flex flex-col w-full hover:bg-secondary/50 transition-colors">
                <div className="flex items-center w-full p-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">Privacy Policy</p>
                      <p className="text-xs text-muted-foreground">How we handle your data</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showLegal === 'privacy' ? 'rotate-90' : ''}`} />
                </div>
                {showLegal === 'privacy' && (
                  <div className="px-4 pb-4 text-left text-sm text-muted-foreground leading-relaxed">
                    <p className="mb-2">We collect information you provide directly — profile data, posts, messages, and interactions.</p>
                    <p className="mb-2">Your data is stored securely on Supabase infrastructure. We do not sell personal information to third parties.</p>
                    <p className="mb-2">You can control your privacy settings at any time from Settings &gt; Privacy &amp; Security.</p>
                    <p>You have the right to download your data or request account deletion at any time.</p>
                  </div>
                )}
              </button>
              <button onClick={() => setShowLegal(showLegal === 'cookies' ? null : 'cookies')} className="flex flex-col w-full hover:bg-secondary/50 transition-colors">
                <div className="flex items-center w-full p-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">Cookie Policy</p>
                      <p className="text-xs text-muted-foreground">How we use cookies</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showLegal === 'cookies' ? 'rotate-90' : ''}`} />
                </div>
                {showLegal === 'cookies' && (
                  <div className="px-4 pb-4 text-left text-sm text-muted-foreground leading-relaxed">
                    <p className="mb-2">Sha-Verse uses essential cookies to maintain your login session and preferences (theme, language).</p>
                    <p className="mb-2">We use localStorage for caching app data to improve performance. No tracking cookies are used.</p>
                    <p>You can clear all stored data by clearing your browser's site data for Sha-Verse.</p>
                  </div>
                )}
              </button>
            </Card>
          </div>

          {/* Info Card */}
          <Card className="p-4 bg-secondary/30">
            <h3 className="font-semibold mb-2">About Your Privacy</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              At Sha-Verse, we believe your privacy is a fundamental right. We're committed to being 
              transparent about the data we collect and how it's used. You have full control over 
              your personal information and can manage your privacy settings at any time.
            </p>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};

export default PrivacyCenter;
