import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Globe, 
  ExternalLink,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface SocialLinksSectionProps {
  profile: any;
  isOwnProfile: boolean;
  friendshipStatus?: any;
}

interface SocialLink {
  platform: string;
  url: string;
  isValid: boolean;
  error?: string;
}

const SOCIAL_PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600', placeholder: 'https://facebook.com/username' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-pink-600', placeholder: 'https://instagram.com/username' },
  { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'bg-sky-500', placeholder: 'https://twitter.com/username' },
  { id: 'website', name: 'Website', icon: Globe, color: 'bg-gray-600', placeholder: 'https://yourwebsite.com' }
];

export const SocialLinksSection = ({ profile, isOwnProfile, friendshipStatus }: SocialLinksSectionProps) => {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize links from profile data
  useEffect(() => {
    const initialLinks = SOCIAL_PLATFORMS.map(platform => {
      const url = profile?.[`${platform.id}_url`] || '';
      return {
        platform: platform.id,
        url,
        isValid: validateUrl(platform.id, url),
        error: url && !validateUrl(platform.id, url) ? getErrorMessage(platform.id) : undefined
      };
    });
    setLinks(initialLinks);
  }, [profile]);

  // URL validation functions
  const validateUrl = (platform: string, url: string): boolean => {
    if (!url) return true; // Empty is valid (optional fields)
    
    try {
      const parsedUrl = new URL(url);
      
      switch (platform) {
        case 'facebook':
          return parsedUrl.hostname === 'www.facebook.com' || parsedUrl.hostname === 'facebook.com';
        case 'instagram':
          return parsedUrl.hostname === 'www.instagram.com' || parsedUrl.hostname === 'instagram.com';
        case 'twitter':
          return parsedUrl.hostname === 'www.twitter.com' || parsedUrl.hostname === 'twitter.com' || 
                 parsedUrl.hostname === 'x.com';
        case 'website':
          return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
        default:
          return true;
      }
    } catch {
      return false;
    }
  };

  const getErrorMessage = (platform: string): string => {
    switch (platform) {
      case 'facebook':
        return 'Please enter a valid Facebook profile URL (facebook.com/username)';
      case 'instagram':
        return 'Please enter a valid Instagram profile URL (instagram.com/username)';
      case 'twitter':
        return 'Please enter a valid Twitter/X profile URL (twitter.com/username or x.com/username)';
      case 'website':
        return 'Please enter a valid website URL (https://...)';
      default:
        return 'Please enter a valid URL';
    }
  };

  const handleUrlChange = (platform: string, url: string) => {
    setLinks(prev => prev.map(link => 
      link.platform === platform 
        ? { 
            ...link, 
            url, 
            isValid: validateUrl(platform, url),
            error: url && !validateUrl(platform, url) ? getErrorMessage(platform) : undefined
          }
        : link
    ));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Prepare update data
      const updateData: Record<string, string> = {};
      links.forEach(link => {
        updateData[`${link.platform}_url`] = link.url;
      });

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      // Invalidate queries to trigger real-time update
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      
      toast({
        title: 'Social links updated!',
        description: 'Your social links have been updated successfully',
      });
      
      setEditing(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    const resetLinks = SOCIAL_PLATFORMS.map(platform => {
      const url = profile?.[`${platform.id}_url`] || '';
      return {
        platform: platform.id,
        url,
        isValid: validateUrl(platform.id, url),
        error: url && !validateUrl(platform.id, url) ? getErrorMessage(platform.id) : undefined
      };
    });
    setLinks(resetLinks);
    setEditing(false);
  };

  const getPlatformConfig = (platformId: string) => {
    return SOCIAL_PLATFORMS.find(p => p.id === platformId);
  };

  const shouldShowLink = (platform: string) => {
    const link = links.find(l => l.platform === platform);
    if (!link || !link.url) return false;
    
    // For own profile, always show
    if (isOwnProfile) return true;
    
    // For others, check privacy settings (simplified for now)
    return link.isValid;
  };

  if (!isOwnProfile && !links.some(link => shouldShowLink(link.platform))) {
    return null;
  }

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm">Social Links</h4>
        {isOwnProfile && !editing && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setEditing(true)}
          >
            Edit Links
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add your social media profiles. Only valid platform URLs will be saved.
          </p>
          
          <div className="grid gap-4">
            {links.map((link) => {
              const platformConfig = getPlatformConfig(link.platform);
              if (!platformConfig) return null;
              
              const Icon = platformConfig.icon;
              
              return (
                <div key={link.platform} className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {platformConfig.name}
                  </Label>
                  
                  <div className="relative">
                    <Input
                      value={link.url}
                      onChange={(e) => handleUrlChange(link.platform, e.target.value)}
                      placeholder={platformConfig.placeholder}
                      className={link.isValid ? '' : 'border-destructive'}
                    />
                    {link.url && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {link.isValid ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {link.error && (
                    <p className="text-xs text-destructive">{link.error}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading || links.some(link => !link.isValid && link.url !== '')}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            {SOCIAL_PLATFORMS.map(platform => {
              const hasLink = shouldShowLink(platform.id);
              return hasLink && (
                <TabsTrigger key={platform.id} value={platform.id} className="flex items-center gap-1">
                  <platform.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{platform.name}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="flex flex-wrap gap-3">
              {SOCIAL_PLATFORMS.map(platform => {
                const link = links.find(l => l.platform === platform.id);
                if (!link || !shouldShowLink(platform.id)) return null;
                
                const Icon = platform.icon;
                
                return (
                  <a
                    key={platform.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-4 py-2 ${platform.color} text-white rounded-lg text-sm hover:opacity-90 transition-opacity`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{platform.name}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                );
              })}
            </div>
          </TabsContent>

          {SOCIAL_PLATFORMS.map(platform => {
            const link = links.find(l => l.platform === platform.id);
            if (!link || !shouldShowLink(platform.id)) return null;
            
            const Icon = platform.icon;
            
            return (
              <TabsContent key={platform.id} value={platform.id} className="mt-0">
                <div className="flex flex-col items-center gap-4 p-6 bg-secondary/10 rounded-lg">
                  <div className={`p-3 ${platform.color} rounded-full`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">{platform.name}</h3>
                    <p className="text-muted-foreground text-sm">
                      {platform.id === 'website' 
                        ? 'Personal Website' 
                        : `${platform.name} Profile`}
                    </p>
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Visit {platform.name} Profile
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
};