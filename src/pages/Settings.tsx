import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, Bell, Lock, Shield, UserX, Clock, 
  Moon, Sun, HelpCircle, FileText, Mail, 
  Smartphone, Globe, ChevronRight, LogOut
} from "lucide-react";
import { useTheme } from "next-themes";
import { ProfileSettingsDialog } from "@/components/profile/ProfileSettingsDialog";
import { useToast } from "@/components/ui/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const isDarkMode = (resolvedTheme ?? theme) === "dark";

  const settingsGroups = [
    {
      title: "Account",
      items: [
        {
          icon: Lock,
          label: "Privacy & Security",
          description: "Control who can see your info",
          action: "privacy-dialog"
        },
        {
          icon: Bell,
          label: "Notifications",
          description: "Manage your notifications",
          onClick: () => navigate("/notifications")
        },
        {
          icon: UserX,
          label: "Blocked Users",
          description: "Manage blocked accounts",
          action: "privacy-dialog"
        },
      ]
    },
    {
      title: "Preferences",
      items: [
        {
          icon: isDarkMode ? Sun : Moon,
          label: "Dark Mode",
          description: isDarkMode ? "Currently using dark theme" : "Currently using light theme",
          toggle: true,
          checked: isDarkMode,
          onToggle: () => setTheme(isDarkMode ? "light" : "dark")
        },
        {
          icon: Globe,
          label: "Language",
          description: "English (US)",
          onClick: () => {
            toast({ title: 'Language', description: 'English (US) is currently the only available language.' });
          }
        },
      ]
    },
    {
      title: "Support",
      items: [
        {
          icon: HelpCircle,
          label: "Help Center",
          description: "Get help with your account",
          onClick: () => navigate("/help")
        },
        {
          icon: FileText,
          label: "Terms of Service",
          description: "Read our terms",
          onClick: () => navigate("/privacy-center")
        },
        {
          icon: Shield,
          label: "Privacy Policy",
          description: "How we handle your data",
          onClick: () => navigate("/privacy-center")
        },
        {
          icon: Mail,
          label: "Contact Us",
          description: "Send us feedback",
          onClick: () => navigate("/help")
        },
      ]
    }
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-lg">Settings & Privacy</h1>
      </div>

      <div className="p-4 space-y-6">
        {settingsGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {group.title}
            </h2>
            <Card className="divide-y divide-border">
              {group.items.map((item) => {
                const Icon = item.icon;
                
                if (item.action === "privacy-dialog") {
                  return (
                    <ProfileSettingsDialog 
                      key={item.label}
                      trigger={
                        <button className="flex items-center w-full p-4 hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-sm">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </button>
                      }
                    />
                  );
                }
                
                if (item.toggle) {
                  return (
                    <div 
                      key={item.label}
                      className="flex items-center p-4"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      <Switch 
                        checked={item.checked} 
                        onCheckedChange={item.onToggle} 
                      />
                    </div>
                  );
                }

                return (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className="flex items-center w-full p-4 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                );
              })}
            </Card>
          </div>
        ))}

        {/* Logout Button */}
        <Card className="mt-6">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-4 hover:bg-destructive/10 transition-colors text-destructive"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Log Out</p>
                <p className="text-xs text-muted-foreground">Sign out of your account</p>
              </div>
            </div>
          </button>
        </Card>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          Sha-Verse v1.0.0
        </p>
      </div>
    </div>
  );
};

export default Settings;
