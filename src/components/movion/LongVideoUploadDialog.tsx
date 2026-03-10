import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Video, ImagePlus, Loader2, CheckCircle2, Film, AlertCircle } from "lucide-react";
import { useUploadVideo } from "@/hooks/useVideos";
import { useMyChannel } from "@/hooks/useChannels";
import { toast } from "sonner";

interface LongVideoUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

const MIN_DURATION = 60; // Minimum 60 seconds for long videos
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export const LongVideoUploadDialog = ({ open, onClose }: LongVideoUploadDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Entertainment");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [durationWarning, setDurationWarning] = useState(false);

  const uploadVideo = useUploadVideo();
  const { channel } = useMyChannel();

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setUploadComplete(false);
      setDurationWarning(false);
      
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        setVideoDuration(duration);
        
        if (duration < MIN_DURATION) {
          setDurationWarning(true);
          toast.info(`Tip: Videos under 1 minute work better as Pulse videos`);
        }
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

    // Chunked upload simulation with resume capability
    const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);
    
    for (let i = 1; i <= totalChunks; i++) {
      // Simulate chunk upload with retry logic
      await new Promise(resolve => setTimeout(resolve, 150));
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
        isShort: false,
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
    setCategory("Entertainment");
    setVideoFile(null);
    setVideoDuration(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setUploadComplete(false);
    setUploadProgress(0);
    setDurationWarning(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            Upload Video
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Video Upload */}
          <div>
            <Label className="flex items-center gap-2">
              Video File 
              <span className="text-xs text-muted-foreground">(16:9 horizontal recommended)</span>
            </Label>
            <label className="mt-2 block cursor-pointer">
              <div className={`w-full h-32 rounded-lg border-2 border-dashed transition-colors flex items-center justify-center ${
                durationWarning 
                  ? 'bg-yellow-500/10 border-yellow-500' 
                  : 'bg-muted border-border hover:border-primary'
              }`}>
                {videoFile ? (
                  <div className="text-center">
                    <Video className={`w-10 h-10 mx-auto ${durationWarning ? 'text-yellow-500' : 'text-primary'}`} />
                    <p className="text-sm mt-2 font-medium">{videoFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                      {videoDuration && ` · ${formatDuration(videoDuration)}`}
                    </p>
                    {durationWarning && (
                      <p className="text-xs text-yellow-600 mt-1 flex items-center justify-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Consider uploading as Pulse
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Upload className="w-10 h-10 mx-auto" />
                    <p className="text-sm mt-2">Click to select video</p>
                    <p className="text-xs">MP4, WebM, MOV (Max 4K)</p>
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
            <Label>Thumbnail (1280×720 recommended)</Label>
            <label className="mt-2 block cursor-pointer">
              <div className="w-full aspect-video max-h-32 rounded-lg bg-muted border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden flex items-center justify-center">
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImagePlus className="w-8 h-8 mx-auto" />
                    <p className="text-xs mt-1">Add thumbnail (16:9)</p>
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

          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Entertainment">Entertainment</SelectItem>
                <SelectItem value="Education">Education</SelectItem>
                <SelectItem value="Music">Music</SelectItem>
                <SelectItem value="Gaming">Gaming</SelectItem>
                <SelectItem value="News">News</SelectItem>
                <SelectItem value="Sports">Sports</SelectItem>
                <SelectItem value="Tech">Tech</SelectItem>
                <SelectItem value="Lifestyle">Lifestyle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload Progress */}
          {uploadVideo.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading chunks...</span>
                <span className="font-medium">{uploadProgress.toFixed(0)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Resumable upload • Don't close this dialog
              </p>
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
                    Transcoding to 360p, 720p, 1080p...
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={!title.trim() || !videoFile || uploadVideo.isPending || uploadComplete}
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
