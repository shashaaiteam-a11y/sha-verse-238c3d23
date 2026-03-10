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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Author Channel</DialogTitle>
          <DialogDescription>
            Create your author profile to start uploading and sharing books with
            readers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarPreview || ""} />
                <AvatarFallback className="text-2xl">
                  {name.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="secondary"
                size="icon"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
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
          <div>
            <Label htmlFor="channelName">Channel Name *</Label>
            <Input
              id="channelName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your author name or pen name"
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="channelDescription">About You</Label>
            <Textarea
              id="channelDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell readers about yourself and your writing..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
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
