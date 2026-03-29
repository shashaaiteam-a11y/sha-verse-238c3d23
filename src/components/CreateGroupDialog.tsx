import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, ShieldAlert, Globe, Lock, Key } from 'lucide-react';
import { useGroups, GroupPrivacy } from '@/hooks/useGroups';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GROUP_CATEGORIES } from '@/lib/constants/groupCategories';
import { WORLD_LANGUAGES } from '@/lib/constants/languages';

export const CreateGroupDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<GroupPrivacy>('public');
  const [category, setCategory] = useState('General');
  const [categorySearch, setCategorySearch] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('English');
  const [languageSearch, setLanguageSearch] = useState('');
  const [rules, setRules] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  
  const { createGroup } = useGroups();

  // Filter categories based on search input
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) {
      return GROUP_CATEGORIES.filter(c => c.value !== "trending");
    }
    return GROUP_CATEGORIES.filter(c => 
      c.value !== "trending" &&
      c.label.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categorySearch]);

  // Filter languages based on search input
  const filteredLanguages = useMemo(() => {
    if (!languageSearch.trim()) {
      return WORLD_LANGUAGES;
    }
    return WORLD_LANGUAGES.filter(lang =>
      lang.toLowerCase().includes(languageSearch.toLowerCase())
    );
  }, [languageSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createGroup.mutate(
      { name, description, privacy, category, country, language, rules },
      {
        onSuccess: () => {
          setOpen(false);
          // reset form
          setName('');
          setDescription('');
          setPrivacy('public');
          setCategory('General');
          setCategorySearch('');
          setCountry('');
          setLanguage('English');
          setLanguageSearch('');
          setRules('');
          setActiveTab('basic');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" className="bg-gradient-primary shadow-glow">
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden gap-0">
        <div className="p-6 pb-4 border-b border-border bg-muted/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Create New Group
            </DialogTitle>
            <DialogDescription>
              Build a community around your interests. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic Info</TabsTrigger>
                <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
                <TabsTrigger value="rules" className="text-xs sm:text-sm">Rules</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[380px] px-6 py-4">
              <TabsContent value="basic" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tech Enthusiasts"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <div className="space-y-2">
                    <Input
                      id="category-search"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search categories (e.g., Tech, Music, Gaming...)"
                      className="text-sm"
                    />
                    <Select value={category} onValueChange={(value) => {
                      setCategory(value);
                      setCategorySearch('');
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px]">
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map(c => (
                            <SelectItem key={c.value} value={c.value} className="cursor-pointer">
                              {c.label}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            No categories found
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this group about?"
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-0">
                <div className="space-y-3">
                  <Label>Privacy Setting</Label>
                  <div className="grid gap-3">
                    <div 
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${privacy === 'public' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                      onClick={() => setPrivacy('public')}
                    >
                      <Globe className={`w-5 h-5 mt-0.5 ${privacy === 'public' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="font-medium text-sm">Public Group</p>
                        <p className="text-xs text-muted-foreground">Anyone can find the group and see its posts.</p>
                      </div>
                    </div>
                    <div 
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${privacy === 'private' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                      onClick={() => setPrivacy('private')}
                    >
                      <Lock className={`w-5 h-5 mt-0.5 ${privacy === 'private' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="font-medium text-sm">Private Group</p>
                        <p className="text-xs text-muted-foreground">Only members can see posts. People can request to join.</p>
                      </div>
                    </div>
                    <div 
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${privacy === 'invite_only' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                      onClick={() => setPrivacy('invite_only')}
                    >
                      <Key className={`w-5 h-5 mt-0.5 ${privacy === 'invite_only' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="font-medium text-sm">Invite Only</p>
                        <p className="text-xs text-muted-foreground">Hidden from search. Members must be invited by admins.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <div className="space-y-2">
                      <Input
                        id="language-search"
                        value={languageSearch}
                        onChange={(e) => setLanguageSearch(e.target.value)}
                        placeholder="Search languages..."
                        className="text-sm"
                      />
                      <Select value={language} onValueChange={(value) => {
                        setLanguage(value);
                        setLanguageSearch('');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          {filteredLanguages.length > 0 ? (
                            filteredLanguages.map(lang => (
                              <SelectItem key={lang} value={lang} className="cursor-pointer">
                                {lang}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-center text-sm text-muted-foreground">
                              No languages found
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country (Optional)</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. India"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rules" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="rules" className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                    Group Rules & Guidelines
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Set clear expectations for your members to maintain a healthy community.
                  </p>
                  <Textarea
                    id="rules"
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    placeholder="1. Be respectful to others&#10;2. No spam or self-promotion&#10;3. Keep discussions on-topic"
                    rows={8}
                    className="resize-none font-mono text-sm"
                  />
                </div>
              </TabsContent>
            </ScrollArea>

            <div className="p-6 pt-4 border-t border-border bg-muted/30 flex justify-between items-center">
              <div className="flex gap-2">
                {activeTab !== 'basic' && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setActiveTab(activeTab === 'rules' ? 'settings' : 'basic')}
                  >
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {activeTab !== 'rules' ? (
                  <Button 
                    type="button" 
                    onClick={() => setActiveTab(activeTab === 'basic' ? 'settings' : 'rules')}
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="bg-gradient-primary shadow-glow min-w-[120px]"
                    disabled={createGroup.isPending || !name.trim()}
                  >
                    {createGroup.isPending ? 'Creating...' : 'Create Group'}
                  </Button>
                )}
              </div>
            </div>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
};
