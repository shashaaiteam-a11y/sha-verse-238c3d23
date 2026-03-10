import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImagePlus, Plus, Tv, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useCreateChannelWithApproval } from "@/hooks/useChannelApproval";

const CATEGORIES = [
  "Entertainment",
  "Education",
  "Gaming",
  "Music",
  "Technology",
  "Lifestyle",
  "News",
  "Sports",
  "Comedy",
  "Vlogs",
  "Other"
];

interface CreateChannelWithApprovalProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const CreateChannelWithApproval = ({ trigger, onSuccess }: CreateChannelWithApprovalProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'submitted'>('form');
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const createChannel = useCreateChannelWithApproval();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleUsernameChange = (value: string) => {
    // Only allow alphanumeric and underscores
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setUsername(sanitized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) return;

    await createChannel.mutateAsync({
      name: name.trim(),
      username: username.trim(),
      description: description.trim() || undefined,
      category: category || undefined,
      avatarFile: avatarFile || undefined,
      bannerFile: bannerFile || undefined,
    });

    setStep('submitted');
    onSuccess?.();
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setStep('form');
      setName("");
      setUsername("");
      setDescription("");
      setCategory("");
      setAvatarFile(null);
      setBannerFile(null);
      setAvatarPreview(null);
      setBannerPreview(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600">
            <Plus className="w-4 h-4" />
            Create Channel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tv className="w-5 h-5 text-cyan-500" />
                Create Your Channel
              </DialogTitle>
            </DialogHeader>
            
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <Clock className="w-4 h-4 text-amber-500" />
              <AlertDescription className="text-sm">
                Your channel will be reviewed by our team within 24-72 hours before going live.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Banner Preview */}
              <div>
                <Label>Banner Image</Label>
                <label className="mt-2 block cursor-pointer">
                  <div className="w-full h-24 rounded-lg bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border-2 border-dashed border-cyan-500/30 hover:border-cyan-500/50 transition-colors overflow-hidden">
                    {bannerPreview ? (
                      <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <ImagePlus className="w-6 h-6 mx-auto mb-1" />
                          <span className="text-xs">Upload Banner (1280x320)</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
                </label>
              </div>

              {/* Avatar Preview */}
              <div>
                <Label>Profile Logo *</Label>
                <label className="mt-2 block cursor-pointer w-20 h-20">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border-2 border-dashed border-cyan-500/30 hover:border-cyan-500/50 transition-colors overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImagePlus className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>

              <div>
                <Label htmlFor="name">Channel Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Channel"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="username">Channel Username *</Label>
                <div className="flex mt-1">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                    @
                  </span>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="my_channel"
                    className="rounded-l-none"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Unique handle for your channel. Only letters, numbers, and underscores.
                </p>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers what your channel is about..."
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
                disabled={createChannel.isPending || !name.trim() || !username.trim()}
              >
                {createChannel.isPending ? "Submitting..." : "Submit for Review"}
              </Button>
            </form>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Channel Submitted!</h3>
            <p className="text-muted-foreground mb-6">
              Your channel is now under review. We'll notify you once it's approved (usually within 24-72 hours).
            </p>
            
            <Card className="bg-muted/50 text-left">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-cyan-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Review in Progress</p>
                    <p className="text-xs text-muted-foreground">Our team is reviewing your channel</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 opacity-50">
                  <CheckCircle2 className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Channel Approved</p>
                    <p className="text-xs text-muted-foreground">Start uploading content</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Button onClick={handleClose} className="mt-6" variant="outline">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
