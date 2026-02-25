import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, ImagePlus, Loader2 } from "lucide-react";
import { useCreateChannel } from "@/hooks/useChannels";

interface CreateChannelDialogProps {
  trigger?: React.ReactNode;
}

export const CreateChannelDialog = ({ trigger }: CreateChannelDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const createChannel = useCreateChannel();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createChannel.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      avatarFile: avatarFile || undefined,
      bannerFile: bannerFile || undefined,
    });

    setOpen(false);
    setName("");
    setDescription("");
    setAvatarFile(null);
    setBannerFile(null);
    setAvatarPreview(null);
    setBannerPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Channel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Your Channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Banner Preview */}
          <div>
            <Label>Banner Image</Label>
            <label className="mt-2 block cursor-pointer">
              <div className="w-full h-24 rounded-lg bg-muted border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden">
                {bannerPreview ? (
                  <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImagePlus className="w-8 h-8" />
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
            </label>
          </div>

          {/* Avatar Preview */}
          <div>
            <Label>Profile Picture</Label>
            <label className="mt-2 block cursor-pointer w-20 h-20">
              <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden">
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers about your channel..."
              className="mt-1 resize-none"
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={!name.trim() || createChannel.isPending}
          >
            {createChannel.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              'Create Channel'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
