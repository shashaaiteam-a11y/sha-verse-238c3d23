import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Video, ImagePlus, Loader2, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { useUploadVideo } from "@/hooks/useVideos";
import { useMyChannel } from "@/hooks/useChannels";
import { toast } from "sonner";

interface PulseUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

const MAX_DURATION = 60; // 60 seconds max for Pulse

const CATEGORIES = [
  "Entertainment",
  "Music",
  "Gaming",
  "Education",
  "Sports",
  "News",
  "Comedy",
  "Dance",
  "Fashion",
  "Food",
  "Travel",
  "Tech",
  "Vlogs",
  "Other"
];

export const PulseUploadDialog = ({ open, onClose }: PulseUploadDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [durationError, setDurationError] = useState(false);

  const uploadVideo = useUploadVideo();
  const { channel } = useMyChannel();

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setUploadComplete(false);
      setDurationError(false);
      
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        setVideoDuration(duration);
        
        if (duration > MAX_DURATION) {
          setDurationError(true);
          toast.error(`Pulse videos must be ${MAX_DURATION} seconds or less`);
        }
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
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
    if (!title.trim() || !videoFile || !channel || durationError || !category) {
      if (!category) {
        toast.error("Please select a category");
      }
      return;
    }

    // Chunked upload simulation with progress
    const totalChunks = 10;
    for (let i = 1; i <= totalChunks; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress((i / totalChunks) * 90);
    }

    try {
      await uploadVideo.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        channelId: channel.id,
        videoFile,
        thumbnailFile: thumbnailFile || undefined,
        duration: videoDuration || undefined,
        isShort: true, // Mark as Pulse video
        category,
      });

      setUploadProgress(100);
      setUploadComplete(true);

      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (error) {
      setUploadProgress(0);
      toast.error('Upload failed. Please try again.');
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setVideoFile(null);
    setVideoDuration(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setUploadComplete(false);
    setUploadProgress(0);
    setDurationError(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            Upload Pulse Video
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Video Upload */}
          <div>
            <Label className="flex items-center gap-2">
              Video File 
              <span className="text-xs text-muted-foreground">(Max {MAX_DURATION}s, 9:16 vertical)</span>
            </Label>
            <label className="mt-2 block cursor-pointer">
              <div className={`w-full h-32 rounded-lg border-2 border-dashed transition-colors flex items-center justify-center ${
                durationError 
                  ? 'bg-destructive/10 border-destructive' 
                  : 'bg-muted border-border hover:border-accent'
              }`}>
                {videoFile ? (
                  <div className="text-center">
                    <Video className={`w-10 h-10 mx-auto ${durationError ? 'text-destructive' : 'text-accent'}`} />
                    <p className="text-sm mt-2 font-medium">{videoFile.name}</p>
                    <p className={`text-xs ${durationError ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                      {videoDuration && ` · ${formatDuration(videoDuration)}`}
                    </p>
                    {durationError && (
                      <p className="text-xs text-destructive mt-1 flex items-center justify-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Too long for Pulse (max {MAX_DURATION}s)
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Upload className="w-10 h-10 mx-auto" />
                    <p className="text-sm mt-2">Click to select video</p>
                    <p className="text-xs">Vertical format recommended</p>
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
              <div className="w-full h-24 rounded-lg bg-muted border-2 border-dashed border-border hover:border-accent transition-colors overflow-hidden flex items-center justify-center">
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImagePlus className="w-8 h-8 mx-auto" />
                    <p className="text-xs mt-1">Add cover image</p>
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
              placeholder="Give your Pulse a catchy title"
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
              placeholder="Add hashtags and description..."
              className="mt-1 resize-none"
              rows={2}
            />
          </div>

          {/* Category Selection - REQUIRED */}
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload Progress */}
          {uploadVideo.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-medium">{uploadProgress.toFixed(0)}%</span>
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
                  <p className="font-medium text-green-600">Pulse Uploaded!</p>
                  <p className="text-sm text-muted-foreground">
                    Processing for optimal viewing...
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-accent to-primary"
            disabled={!title.trim() || !videoFile || !category || durationError || uploadVideo.isPending || uploadComplete}
          >
            {uploadVideo.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Uploading...
              </>
            ) : uploadComplete ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Done!
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Upload Pulse
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
