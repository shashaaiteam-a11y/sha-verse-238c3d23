import { useState, useRef } from "react";
import { Camera, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChannels } from "@/hooks/useChannels";

interface CreateAuthorChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateAuthorChannelDialog = ({
  open,
  onOpenChange,
}: CreateAuthorChannelDialogProps) => {
  const { createChannel } = useChannels("books");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!name) return;

    await createChannel.mutateAsync({
      name,
      description,
      channelType: "books",
      avatarFile: avatarFile || undefined,
    });

    // Reset form
    setName("");
    setDescription("");
    setAvatarFile(null);
    setAvatarPreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[92vw] sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-1 sm:px-6 sm:pt-6">
          <DialogTitle className="text-xl sm:text-2xl">Create Author Channel</DialogTitle>
          <DialogDescription>
            Create your author profile to start uploading and sharing books with
            readers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
          {/* Avatar */}
          <div className="flex justify-center pt-1">
            <div className="relative rounded-full p-1.5 bg-muted/40 ring-1 ring-border/60">
              <Avatar className="w-24 h-24 sm:w-28 sm:h-28">
                <AvatarImage src={avatarPreview || ""} />
                <AvatarFallback className="text-2xl">
                  {name.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="secondary"
                size="icon"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-sm"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="w-4 h-4" />
              </Button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>
          </div>

          {/* Channel Name */}
          <div className="space-y-1.5">
            <Label htmlFor="channelName" className="text-sm font-medium">Channel Name *</Label>
            <Input
              id="channelName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your author name or pen name"
              className="h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="channelDescription" className="text-sm font-medium">About You</Label>
            <Textarea
              id="channelDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell readers about yourself and your writing..."
              rows={4}
              className="min-h-[110px] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-11"
              onClick={handleSubmit}
              disabled={!name || createChannel.isPending}
            >
              {createChannel.isPending ? "Creating..." : "Create Channel"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAuthorChannelDialog;
