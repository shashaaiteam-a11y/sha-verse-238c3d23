import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, ShieldAlert, Globe, Lock, Key, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGroups, GroupPrivacy } from '@/hooks/useGroups';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GROUP_CATEGORIES } from '@/lib/constants/groupCategories';
import { WORLD_LANGUAGES } from '@/lib/constants/languages';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

const DEFAULT_RULES = `1. Be respectful to others
2. No spam or self-promotion
3. Keep discussions on-topic`;

export const CreateGroupDialog = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<GroupPrivacy>('public');
  const [category, setCategory] = useState('General');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('English');
  const [languageOpen, setLanguageOpen] = useState(false);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [activeTab, setActiveTab] = useState('basic');

  const { createGroup } = useGroups();

  const categoryItems = GROUP_CATEGORIES.filter(c => c.value !== "trending");
  const categoryLabel = categoryItems.find(c => c.value === category)?.label || category;

  const isNameValid = name.trim().length > 0;

  // Guard tab navigation: cannot leave Basic Info without a valid name.
  const handleTabChange = (next: string) => {
    if (next !== 'basic' && !isNameValid) {
      toast.error('Group name is required to continue');
      setActiveTab('basic');
      return;
    }
    setActiveTab(next);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrivacy('public');
    setCategory('General');
    setCountry('');
    setLanguage('English');
    setRules(DEFAULT_RULES);
    setActiveTab('basic');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNameValid) {
      toast.error('Group name is required');
      setActiveTab('basic');
      return;
    }

    createGroup.mutate(
      { name: name.trim(), description, privacy, category, country, language, rules },
      {
        onSuccess: (group: any) => {
          setOpen(false);
          resetForm();
          // Redirect to the newly created group page.
          if (group?.id) navigate(`/groups/${group.id}`);
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
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
                  <Label>Category</Label>
                  <Popover open={categoryOpen} onOpenChange={setCategoryOpen} modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={categoryOpen}
                        className="w-full justify-between font-normal"
                      >
                        {categoryLabel}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0 z-[100]"
                      align="start"
                      onWheel={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                    >
                      <Command>
                        <CommandInput placeholder="Search categories..." />
                        <CommandList className="max-h-[240px] overflow-y-auto overscroll-contain">
                          <CommandEmpty>No category found.</CommandEmpty>
                          <CommandGroup>
                            {categoryItems.map((c) => (
                              <CommandItem
                                key={c.value}
                                value={c.label}
                                onSelect={() => {
                                  setCategory(c.value);
                                  setCategoryOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", category === c.value ? "opacity-100" : "opacity-0")} />
                                {c.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Popover open={languageOpen} onOpenChange={setLanguageOpen} modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={languageOpen}
                          className="w-full justify-between font-normal"
                        >
                          {language}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] p-0 z-[100]"
                        align="start"
                        side="bottom"
                        sideOffset={4}
                        collisionPadding={16}
                        onWheel={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                      >
                        <Command>
                          <CommandInput placeholder="Search languages..." />
                          <CommandList className="max-h-[240px] overflow-y-auto overscroll-contain">
                            <CommandEmpty>No language found.</CommandEmpty>
                            <CommandGroup>
                              {WORLD_LANGUAGES.map((lang) => (
                                <CommandItem
                                  key={lang}
                                  value={lang}
                                  onSelect={() => {
                                    setLanguage(lang);
                                    setLanguageOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", language === lang ? "opacity-100" : "opacity-0")} />
                                  {lang}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                    onClick={() => handleTabChange(activeTab === 'basic' ? 'settings' : 'rules')}
                    disabled={activeTab === 'basic' && !isNameValid}
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="bg-gradient-primary shadow-glow min-w-[140px]"
                    disabled={createGroup.isPending || !isNameValid}
                  >
                    {createGroup.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Group'
                    )}
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
