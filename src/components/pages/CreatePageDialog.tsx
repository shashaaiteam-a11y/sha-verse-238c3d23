import { useState } from 'react';
import { Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { usePages } from '@/hooks/usePages';
import { toast } from 'sonner';

interface CreatePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  'Business',
  'Brand',
  'Community',
  'Entertainment',
  'Public Figure',
  'Cause',
  'Sports',
  'News & Media',
  'Gaming',
  'Music',
  'Education',
  'Food & Beverage',
  'Health & Wellness',
  'Travel',
  'Technology',
  'Other'
];

const CreatePageDialog = ({ open, onOpenChange }: CreatePageDialogProps) => {
  const { createPage } = usePages();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [about, setAbout] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Page name is required');
      return;
    }

    if (!category) {
      toast.error('Please select a category');
      return;
    }

    setIsLoading(true);
    
    try {
      let avatarUrl = null;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `page-${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
      }

      await createPage.mutateAsync({
        name: name.trim(),
        category,
        about: about.trim() || null,
        website: website.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        avatar_url: avatarUrl
      });

      // Reset form
      setName('');
      setCategory('');
      setAbout('');
      setWebsite('');
      setEmail('');
      setPhone('');
      setAvatarFile(null);
      setAvatarPreview(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create page:', error);
      toast.error('Failed to create page');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a Page</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Upload */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || ''} />
                <AvatarFallback className="text-2xl">
                  {name ? name[0].toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90">
                <Camera className="h-4 w-4" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
          </div>

          {/* Page Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Page Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter page name"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* About */}
          <div className="space-y-2">
            <Label htmlFor="about">About</Label>
            <Textarea
              id="about"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Tell people about your page"
              rows={3}
            />
          </div>

          {/* Contact Details */}
          <div className="space-y-2">
            <Label>Contact Details (Optional)</Label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="Website URL"
              type="url"
            />
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              type="email"
            />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              type="tel"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Page'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePageDialog;
