import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Video, ImagePlus, Loader2, CheckCircle2 } from "lucide-react";
import { useUploadVideo } from "@/hooks/useVideos";
import { useMyChannel } from "@/hooks/useChannels";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const VIDEO_CATEGORIES = [
  "Entertainment",
  "Education",
  "Gaming",
  "Music",
  "News",
  "Sports",
  "Comedy",
  "Cooking",
  "Travel",
  "Fashion",
  "Technology",
  "Vlogs",
  "Movies",
  "Live",
];

interface UploadVideoDialogProps {
  trigger?: React.ReactNode;
}

export const UploadVideoDialog = ({ trigger }: UploadVideoDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const uploadVideo = useUploadVideo();
  const { channel, isLoading: channelLoading } = useMyChannel();

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setUploadComplete(false);
      
      // Detect video duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        setVideoDuration(video.duration);
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !videoFile || !channel) return;
    
    if (!category) {
      toast.error("Please select a category for your video");
      return;
    }

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    await uploadVideo.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      channelId: channel.id,
      videoFile,
      thumbnailFile: thumbnailFile || undefined,
      duration: videoDuration || undefined,
      category,
    });

    clearInterval(progressInterval);
    setUploadProgress(100);
    setUploadComplete(true);

    // Reset after delay
    setTimeout(() => {
      setOpen(false);
      setTitle("");
      setDescription("");
      setCategory("");
      setVideoFile(null);
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setUploadComplete(false);
      setUploadProgress(0);
    }, 2000);
  };

  // Show channel creation if no channel exists
  if (!channelLoading && !channel) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" className="rounded-full">
              <Upload className="w-5 h-5" />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a Channel First</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground mb-4">
            You need to create a channel before you can upload videos.
          </p>
          <CreateChannelDialog 
            trigger={<Button className="w-full">Create Channel</Button>}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="rounded-full">
            <Upload className="w-5 h-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Video File */}
          <div>
            <Label>Video File *</Label>
            <label className="mt-2 block cursor-pointer">
              <div className="w-full h-32 rounded-lg bg-muted border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center">
                {videoFile ? (
                  <div className="text-center">
                    <Video className="w-10 h-10 mx-auto text-primary" />
                    <p className="text-sm mt-2 text-foreground font-medium">{videoFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                      {videoDuration && ` · ${formatDuration(videoDuration)}`}
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Upload className="w-10 h-10 mx-auto" />
                    <p className="text-sm mt-2">Click to select video</p>
                    <p className="text-xs">MP4, WebM, MOV supported</p>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleVideoChange} 
                className="hidden" 
              />
            </label>
          </div>

          {/* Thumbnail */}
          <div>
            <Label>Thumbnail (Optional)</Label>
            <label className="mt-2 block cursor-pointer">
              <div className="w-full h-24 rounded-lg bg-muted border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden flex items-center justify-center">
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImagePlus className="w-8 h-8 mx-auto" />
                    <p className="text-xs mt-1">Add thumbnail</p>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
            </label>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              className="mt-1"
              required
            />
          </div>

          {/* Category Selection */}
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
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
              placeholder="Tell viewers about your video..."
              className="mt-1 resize-none"
              rows={3}
            />
          </div>

          {/* Upload Progress */}
          {uploadVideo.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Upload Complete */}
          {uploadComplete && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-600">Upload Complete!</p>
                  <p className="text-sm text-muted-foreground">
                    Your video will be transcoded to 360p, 720p, and 1080p
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={!title.trim() || !videoFile || !category || uploadVideo.isPending || uploadComplete}
          >
            {uploadVideo.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Uploading...
              </>
            ) : uploadComplete ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Uploaded!
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Video
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
