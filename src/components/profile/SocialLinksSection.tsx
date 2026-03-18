import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Globe, 
  ExternalLink,
  Check,
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

const getProfileFieldName = (platform: string) => {
  return platform === 'website' ? 'website' : `${platform}_url`;
};

export const SocialLinksSection = ({ profile, isOwnProfile, friendshipStatus }: SocialLinksSectionProps) => {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [visiblePlatforms, setVisiblePlatforms] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const normalizeUrl = (url: string): string => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return '';

    if (/^https?:\/\//i.test(trimmedUrl)) {
      return trimmedUrl;
    }

    return `https://${trimmedUrl}`;
  };

  const getCompanyNameFromUrl = (url: string): string => {
    const safeUrl = normalizeUrl(url);
    if (!safeUrl) return 'Website';

    try {
      const hostname = new URL(safeUrl).hostname.toLowerCase().replace(/^www\./, '');
      const knownNames: Record<string, string> = {
        'facebook.com': 'Facebook',
        'instagram.com': 'Instagram',
        'twitter.com': 'Twitter',
        'x.com': 'X',
        'youtube.com': 'YouTube',
        'linkedin.com': 'LinkedIn',
        'tiktok.com': 'TikTok',
        'snapchat.com': 'Snapchat',
      };

      if (knownNames[hostname]) {
        return knownNames[hostname];
      }

      const rootName = hostname.split('.')[0] || 'Website';
      return rootName.charAt(0).toUpperCase() + rootName.slice(1);
    } catch {
      return 'Website';
    }
  };

  // Initialize links from profile data
  useEffect(() => {
    const initialLinks = SOCIAL_PLATFORMS.map(platform => {
      const url = profile?.[getProfileFieldName(platform.id)] || '';
      return {
        platform: platform.id,
        url,
        isValid: validateUrl(platform.id, url),
        error: url && !validateUrl(platform.id, url) ? getErrorMessage(platform.id) : undefined
      };
    });

    const initialVisiblePlatforms = initialLinks
      .filter(link => link.url.trim() !== '')
      .map(link => link.platform);

    setLinks(initialLinks);
    setVisiblePlatforms(
      initialVisiblePlatforms.length > 0
        ? initialVisiblePlatforms
        : [SOCIAL_PLATFORMS[0].id]
    );
  }, [profile]);

  // URL validation functions
  const validateUrl = (platform: string, url: string): boolean => {
    if (!url) return true; // Empty is valid (optional fields)
    
    try {
      const parsedUrl = new URL(normalizeUrl(url));
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const getErrorMessage = (platform: string): string => {
    return 'Please enter a valid URL (example: https://instagram.com/username)';
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
        updateData[getProfileFieldName(link.platform)] = link.url.trim();
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
      const url = profile?.[getProfileFieldName(platform.id)] || '';
      return {
        platform: platform.id,
        url,
        isValid: validateUrl(platform.id, url),
        error: url && !validateUrl(platform.id, url) ? getErrorMessage(platform.id) : undefined
      };
    });

    const resetVisiblePlatforms = resetLinks
      .filter(link => link.url.trim() !== '')
      .map(link => link.platform);

    setLinks(resetLinks);
    setVisiblePlatforms(
      resetVisiblePlatforms.length > 0
        ? resetVisiblePlatforms
        : [SOCIAL_PLATFORMS[0].id]
    );
    setEditing(false);
  };

  const handleAddLink = () => {
    const nextPlatform = SOCIAL_PLATFORMS.find(
      platform => !visiblePlatforms.includes(platform.id)
    );

    if (!nextPlatform) return;

    setVisiblePlatforms(prev => [...prev, nextPlatform.id]);
  };

  const getPlatformConfig = (platformId: string) => {
    return SOCIAL_PLATFORMS.find(p => p.id === platformId);
  };

  const getFaviconUrl = (url: string) => {
    const safeUrl = normalizeUrl(url);
    if (!safeUrl) return '';

    try {
      const parsed = new URL(safeUrl);
      const host = parsed.hostname;
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
    } catch {
      return '';
    }
  };

  const getCompanyNameForLink = (link: SocialLink) => {
    if (link.url.trim()) {
      return getCompanyNameFromUrl(link.url);
    }

    const platformConfig = getPlatformConfig(link.platform);
    return platformConfig?.name || 'Website';
  };

  const renderLinkIcon = (link: SocialLink, className: string) => {
    const platformConfig = getPlatformConfig(link.platform);
    const Icon = platformConfig?.icon || Globe;
    const faviconUrl = getFaviconUrl(link.url);
    const companyName = getCompanyNameForLink(link);

    if (faviconUrl) {
      return <img src={faviconUrl} alt={`${companyName} logo`} className={className} />;
    }

    return <Icon className={className} />;
  };

  const shouldShowLink = (platform: string) => {
    const link = links.find(l => l.platform === platform);
    if (!link || !link.url.trim()) return false;
    
    // For own profile, always show
    if (isOwnProfile) return true;
    
    // For others, check privacy settings (simplified for now)
    return link.isValid;
  };

  if (!isOwnProfile && !links.some(link => shouldShowLink(link.platform))) {
    return null;
  }

  const activeLinks = links.filter(link => shouldShowLink(link.platform));

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
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Add your social links. Company name will be detected automatically from each URL.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddLink}
              disabled={visiblePlatforms.length >= SOCIAL_PLATFORMS.length}
            >
              Add Link
            </Button>
          </div>
          
          <div className="grid gap-4">
            {visiblePlatforms.map((platformId) => {
              const link = links.find(item => item.platform === platformId);
              if (!link) return null;

              const platformConfig = getPlatformConfig(link.platform);
              if (!platformConfig) return null;
              
              const Icon = platformConfig.icon;
              const companyName = getCompanyNameForLink(link);
              
              return (
                <div key={link.platform} className="space-y-2">
                  <Label className="flex items-center gap-2">
                    {renderLinkIcon(link, 'w-4 h-4 rounded-sm')}
                    {companyName}
                  </Label>
                  
                  <div className="relative">
                    <Input
                      value={link.url}
                      onChange={(e) => handleUrlChange(link.platform, e.target.value)}
                      placeholder="https://instagram.com/username"
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
        <div className="flex flex-wrap gap-3">
          {activeLinks.map(link => {
            const platform = getPlatformConfig(link.platform);
            const companyName = getCompanyNameForLink(link);
            const redirectUrl = normalizeUrl(link.url);

            return (
              <a
                key={link.platform}
                href={redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 ${platform?.color || 'bg-gray-600'} text-white rounded-lg text-sm hover:opacity-90 transition-opacity`}
              >
                {renderLinkIcon(link, 'w-4 h-4 rounded-sm')}
                <span>{companyName}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};