import { useState } from "react";
import { compressImage } from "@/lib/media/compressImage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Settings,
  ImagePlus,
  Save,
  Loader2,
  Trash2,
  Edit,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Channel {
  id: string;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
}

interface Video {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  views_count?: number | null;
  visibility?: string;
}

interface ChannelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
  videos?: Video[];
}

export const ChannelSettingsDialog = ({
  open,
  onOpenChange,
  channel,
  videos = [],
}: ChannelSettingsDialogProps) => {
  const { user } = useAuth();
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");

  const queryClient = useQueryClient();

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

  const handleSaveChannel = async () => {
    setIsSaving(true);
    try {
      let avatarUrl = channel.avatar_url;
      let bannerUrl = channel.banner_url;

      // Upload avatar if changed
      if (avatarFile && user) {
        const img = await compressImage(avatarFile);
        const fileName = `${user.id}/channel-avatar-${Date.now()}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, img, { upsert: false });

        if (uploadError) {
          throw new Error(`Avatar upload failed: ${uploadError.message}`);
        }
        const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
        avatarUrl = data.publicUrl;
      }

      // Upload banner if changed
      if (bannerFile && user) {
        const img = await compressImage(bannerFile);
        const fileName = `${user.id}/channel-banner-${Date.now()}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, img, { upsert: false });

        if (uploadError) {
          throw new Error(`Banner upload failed: ${uploadError.message}`);
        }
        const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
        bannerUrl = data.publicUrl;
      }

      // Update channel
      const { error } = await supabase
        .from("channels")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
        })
        .eq("id", channel.id);

      if (error) throw error;

      // Reset file states after successful save
      setAvatarFile(null);
      setAvatarPreview(null);
      setBannerFile(null);
      setBannerPreview(null);

      // Invalidate all related queries so UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ["my-channel"] });
      queryClient.invalidateQueries({ queryKey: ["channel", channel.id] });
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      toast.success("Channel updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update channel");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video.id);
    setVideoTitle(video.title);
    setVideoDescription(video.description || "");
  };

  const handleSaveVideo = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from("videos")
        .update({
          title: videoTitle.trim(),
          description: videoDescription.trim() || null,
        })
        .eq("id", videoId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["channel", channel.id] });
      toast.success("Video updated");
      setEditingVideo(null);
    } catch (error) {
      toast.error("Failed to update video");
    }
  };

  const handleToggleVisibility = async (videoId: string, currentHidden: boolean) => {
    try {
      const newVisibility = currentHidden ? 'public' : 'hidden';
      // Cast to 'any' to handle new visibility column not yet in types
      const { error } = await (supabase
        .from("videos") as any)
        .update({ visibility: newVisibility })
        .eq("id", videoId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["channel", channel.id] });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast.success(currentHidden ? "Video is now public" : "Video hidden from public");
    } catch (error) {
      toast.error("Failed to update video visibility");
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("videos")
        .delete()
        .eq("id", videoId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["channel", channel.id] });
      toast.success("Video deleted");
    } catch (error) {
      toast.error("Failed to delete video");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pr-12 sm:px-6 sm:pt-6 sm:pr-12 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Channel Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="flex-1 flex flex-col min-h-0 px-4 pb-4 sm:px-6 sm:pb-6 overflow-hidden">
          <TabsList className="w-full flex-shrink-0 grid grid-cols-2">
            <TabsTrigger value="profile" className="text-sm">Profile</TabsTrigger>
            <TabsTrigger value="videos" className="text-sm">Videos</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4 flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full max-h-[calc(80vh-140px)]">
              <div className="space-y-4 pr-3">
            {/* Avatar */}
            <div>
              <Label>Channel Avatar</Label>
              <div className="flex items-center gap-4 mt-2">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                  <AvatarImage src={avatarPreview || channel.avatar_url || undefined} />
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                    {name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <ImagePlus className="w-4 h-4 mr-2" />
                      Change Avatar
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Banner */}
            <div>
              <Label>Channel Banner</Label>
              <label className="cursor-pointer block mt-2">
                <div className="w-full h-24 rounded-lg bg-muted border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden">
                  {(bannerPreview || channel.banner_url) ? (
                    <img
                      src={bannerPreview || channel.banner_url || ""}
                      alt="Banner"
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
                  onChange={handleBannerChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="channel-name">Channel Name</Label>
              <Input
                id="channel-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="channel-description">Description</Label>
              <Textarea
                id="channel-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 resize-none"
                rows={3}
                placeholder="Tell viewers about your channel..."
              />
            </div>

            <Button
              onClick={handleSaveChannel}
              disabled={isSaving || !name.trim()}
              className="w-full"
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
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="videos" className="mt-4 flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full max-h-[calc(80vh-140px)]">
              <div className="pr-3">
              {videos.length > 0 ? (
                <div className="space-y-3">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className="flex gap-3 p-3 rounded-lg border border-border bg-muted/30"
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-12 sm:w-24 sm:h-16 rounded bg-muted overflow-hidden flex-shrink-0">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No thumb
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {editingVideo === video.id ? (
                          <div className="space-y-2">
                            <Input
                              value={videoTitle}
                              onChange={(e) => setVideoTitle(e.target.value)}
                              placeholder="Video title"
                              className="h-8 text-sm"
                            />
                            <Textarea
                              value={videoDescription}
                              onChange={(e) => setVideoDescription(e.target.value)}
                              placeholder="Description"
                              className="resize-none text-sm"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveVideo(video.id)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingVideo(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-sm truncate">{video.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {video.views_count || 0} views
                            </p>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      {editingVideo !== video.id && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditVideo(video)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleVisibility(video.id, video.visibility === 'hidden')}
                            title={video.visibility === 'hidden' ? 'Make public' : 'Hide video'}
                          >
                            {video.visibility === 'hidden' ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteVideo(video.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No videos uploaded yet</p>
                </div>
              )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};