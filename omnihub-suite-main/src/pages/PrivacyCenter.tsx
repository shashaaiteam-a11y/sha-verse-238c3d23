import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, Shield, Eye, Lock, UserX, 
  FileText, Download, Trash2, ChevronRight
} from "lucide-react";
import { ProfileSettingsDialog } from "@/components/profile/ProfileSettingsDialog";

const PrivacyCenter = () => {
  const navigate = useNavigate();

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
      onClick: () => {}
    },
    {
      icon: Trash2,
      title: "Delete Account",
      description: "Permanently delete your account and data",
      destructive: true,
      onClick: () => {}
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
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
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
              <button className="flex items-center w-full p-4 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Terms of Service</p>
                    <p className="text-xs text-muted-foreground">Last updated: December 2024</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button className="flex items-center w-full p-4 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Privacy Policy</p>
                    <p className="text-xs text-muted-foreground">How we handle your data</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button className="flex items-center w-full p-4 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Cookie Policy</p>
                    <p className="text-xs text-muted-foreground">How we use cookies</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
