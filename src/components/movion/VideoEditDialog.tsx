import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePlus, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface VideoEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    id: string;
    title: string;
    description?: string | null;
    thumbnail_url?: string | null;
  } | null;
}

export const VideoEditDialog = ({
  open,
  onOpenChange,
  video,
}: VideoEditDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (video) {
      setTitle(video.title);
      setDescription(video.description || "");
      setThumbnailPreview(null);
      setThumbnailFile(null);
    }
  }, [video]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!video || !title.trim()) return;
    
    setIsSaving(true);
    try {
      let thumbnailUrl = video.thumbnail_url;

      // Upload new thumbnail if changed
      if (thumbnailFile) {
        const fileName = `thumbnails/${video.id}/${Date.now()}-${thumbnailFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("videos")
          .upload(fileName, thumbnailFile, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from("videos").getPublicUrl(fileName);
          thumbnailUrl = data.publicUrl;
        }
      }

      // Update video
      const { error } = await supabase
        .from("videos")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          thumbnail_url: thumbnailUrl,
        })
        .eq("id", video.id);

      if (error) throw error;

      // Invalidate queries for real-time update
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      queryClient.invalidateQueries({ queryKey: ["channel-videos"] });
      queryClient.invalidateQueries({ queryKey: ["creator-motions"] });
      queryClient.invalidateQueries({ queryKey: ["creator-stats"] });
      
      toast.success("Video updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update video");
    } finally {
      setIsSaving(false);
    }
  };

  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[85vh] flex flex-col p-0 gap-0 z-[70] overflow-hidden">
        <DialogHeader className="px-4 pt-4 pr-12 sm:px-6 sm:pt-6 sm:pr-12 pb-2 flex-shrink-0">
          <DialogTitle>Edit Video</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 min-h-0">
          <div className="space-y-4 py-4">
          {/* Thumbnail */}
          <div>
            <Label>Thumbnail</Label>
            <label className="cursor-pointer block mt-2">
              <div className="w-full aspect-video max-h-[35vh] rounded-lg bg-muted border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden">
                {(thumbnailPreview || video.thumbnail_url) ? (
                  <img
                    src={thumbnailPreview || video.thumbnail_url || ""}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImagePlus className="w-8 h-8" />
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Click to change thumbnail
            </p>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="video-title">Title</Label>
            <Input
              id="video-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
              placeholder="Enter video title"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="video-description">Description</Label>
            <Textarea
              id="video-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 resize-none"
              rows={4}
              placeholder="Tell viewers about your video..."
            />
          </div>
          </div>
        </div>

        <DialogFooter className="px-4 pb-4 sm:px-6 sm:pb-6 pt-2 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
