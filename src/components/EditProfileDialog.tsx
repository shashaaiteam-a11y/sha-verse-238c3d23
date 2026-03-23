import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Pencil, User, MapPin, Briefcase, Heart, Globe, AtSign, Phone, GraduationCap, Facebook, Instagram, Twitter } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EditProfileDialogProps {
  profile: any;
}

const FieldRow = ({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="mt-2.5 shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div className="flex-1 space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  </div>
);

export const EditProfileDialog = ({ profile }: EditProfileDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    work: profile?.work || '',
    education: profile?.education || '',
    hometown: profile?.hometown || '',
    current_city: profile?.current_city || '',
    relationship_status: profile?.relationship_status || '',
    phone: profile?.phone || '',
    website_url: profile?.website_url || profile?.website || '',
    facebook_url: profile?.facebook_url || '',
    instagram_url: profile?.instagram_url || '',
    twitter_url: profile?.twitter_url || '',
    about_me: profile?.about_me || '',
    gender: profile?.gender || '',
    birthdate: profile?.birthdate || '',
  });

  useEffect(() => {
    if (open && profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        work: profile.work || '',
        education: profile.education || '',
        hometown: profile.hometown || '',
        current_city: profile.current_city || '',
        relationship_status: profile.relationship_status || '',
        phone: profile.phone || '',
        website_url: profile.website_url || profile.website || '',
        facebook_url: profile.facebook_url || '',
        instagram_url: profile.instagram_url || '',
        twitter_url: profile.twitter_url || '',
        about_me: profile.about_me || '',
        gender: profile.gender || '',
        birthdate: profile.birthdate || '',
      });
    }
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: 'Profile updated!', description: 'Your profile has been saved.' });
      setOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary shadow-glow">
          <Pencil className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg w-full p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <Tabs defaultValue="basic" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="mx-5 mt-3 mb-0 shrink-0 grid grid-cols-4 bg-secondary rounded-xl h-9">
            <TabsTrigger value="basic" className="rounded-lg text-xs font-medium">Basic</TabsTrigger>
            <TabsTrigger value="personal" className="rounded-lg text-xs font-medium">Personal</TabsTrigger>
            <TabsTrigger value="contact" className="rounded-lg text-xs font-medium">Contact</TabsTrigger>
            <TabsTrigger value="social" className="rounded-lg text-xs font-medium">Social</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(90vh-200px)]">
            {/* Basic Info */}
            <TabsContent value="basic" className="px-5 py-4 space-y-4 mt-0">
              <FieldRow icon={User} label="Display Name">
                <Input name="display_name" value={formData.display_name} onChange={handleChange} placeholder="Your name" />
              </FieldRow>
              <FieldRow icon={AtSign} label="Bio">
                <Textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Short bio visible on your profile..." rows={2} className="resize-none" />
              </FieldRow>
              <FieldRow icon={AtSign} label="About Me">
                <Textarea name="about_me" value={formData.about_me} onChange={handleChange} placeholder="Tell people more about yourself..." rows={3} className="resize-none" />
              </FieldRow>
            </TabsContent>

            {/* Personal */}
            <TabsContent value="personal" className="px-5 py-4 space-y-4 mt-0">
              <FieldRow icon={User} label="Gender">
                <Select value={formData.gender} onValueChange={(v) => handleSelectChange('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow icon={User} label="Birthday">
                <Input name="birthdate" type="date" value={formData.birthdate} onChange={handleChange} />
              </FieldRow>
              <FieldRow icon={Heart} label="Relationship Status">
                <Select value={formData.relationship_status} onValueChange={(v) => handleSelectChange('relationship_status', v)}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="In a relationship">In a relationship</SelectItem>
                    <SelectItem value="Engaged">Engaged</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Complicated">It's complicated</SelectItem>
                    <SelectItem value="Separated">Separated</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow icon={Briefcase} label="Work">
                <Input name="work" value={formData.work} onChange={handleChange} placeholder="Software Engineer at Company" />
              </FieldRow>
              <FieldRow icon={GraduationCap} label="Education">
                <Input name="education" value={formData.education} onChange={handleChange} placeholder="University Name" />
              </FieldRow>
              <FieldRow icon={MapPin} label="Hometown">
                <Input name="hometown" value={formData.hometown} onChange={handleChange} placeholder="City, Country" />
              </FieldRow>
              <FieldRow icon={MapPin} label="Current City">
                <Input name="current_city" value={formData.current_city} onChange={handleChange} placeholder="City, Country" />
              </FieldRow>
            </TabsContent>

            {/* Contact */}
            <TabsContent value="contact" className="px-5 py-4 space-y-4 mt-0">
              <FieldRow icon={Phone} label="Phone">
                <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
              </FieldRow>
              <FieldRow icon={Globe} label="Website">
                <Input name="website_url" value={formData.website_url} onChange={handleChange} placeholder="https://yourwebsite.com" />
              </FieldRow>
            </TabsContent>

            {/* Social */}
            <TabsContent value="social" className="px-5 py-4 space-y-4 mt-0">
              <FieldRow icon={Facebook} label="Facebook">
                <Input name="facebook_url" value={formData.facebook_url} onChange={handleChange} placeholder="https://facebook.com/username" />
              </FieldRow>
              <FieldRow icon={Instagram} label="Instagram">
                <Input name="instagram_url" value={formData.instagram_url} onChange={handleChange} placeholder="https://instagram.com/username" />
              </FieldRow>
              <FieldRow icon={Twitter} label="Twitter / X">
                <Input name="twitter_url" value={formData.twitter_url} onChange={handleChange} placeholder="https://twitter.com/username" />
              </FieldRow>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Sticky Footer */}
        <div className="px-5 py-3 border-t border-border bg-background flex justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-gradient-primary min-w-[100px]">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
