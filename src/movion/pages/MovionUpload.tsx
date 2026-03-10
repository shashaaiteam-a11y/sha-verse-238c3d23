// Movion Upload Page - Live with Supabase
import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Upload, FileVideo, Image, X, Globe, Lock, Eye, Loader2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyChannel, useCreateChannel } from "@/hooks/useChannels";
import { useUploadVideo } from "@/hooks/useVideos";
import { useAuth } from "@/contexts/AuthContext";
import { VIDEO_CATEGORIES } from "../constants";
import { toast } from "sonner";

const MovionUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { channel, isLoading: channelLoading } = useMyChannel();
  const createChannel = useCreateChannel();
  const uploadVideo = useUploadVideo();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<"select" | "details" | "visibility">("select");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Video data
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  
  // Form data
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">("public");
  const [isShort, setIsShort] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [showLikeCounts, setShowLikeCounts] = useState(true);
  
  // Channel creation form
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  
  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) {
      handleVideoSelect(file);
    }
  }, []);
  
  const handleVideoSelect = (file: File) => {
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    setTitle(file.name.replace(/\.[^/.]+$/, ""));
    
    // Get video duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      setVideoDuration(Math.round(video.duration));
      setIsShort(video.duration <= 60);
      URL.revokeObjectURL(video.src);
    };
    video.src = url;
    
    // Simulate progress for UX
    setIsUploading(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setIsUploading(false);
        setStep("details");
      }
      setUploadProgress(progress);
    }, 300);
  };
  
  const handleThumbnailSelect = (file: File) => {
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleCreateChannel = async () => {
    if (!channelName.trim()) {
      toast.error("Please enter a channel name");
      return;
    }
    
    try {
      await createChannel.mutateAsync({
        name: channelName,
        description: channelDescription,
      });
      setShowChannelForm(false);
      toast.success("Channel created! You can now upload videos.");
    } catch (error) {
      console.error(error);
    }
  };
  
  const handlePublish = async () => {
    if (!channel) {
      toast.error("Please create a channel first");
      setShowChannelForm(true);
      return;
    }
    
    if (!videoFile) {
      toast.error("Please select a video file");
      return;
    }
    
    try {
      await uploadVideo.mutateAsync({
        title,
        description,
        channelId: channel.id,
        videoFile,
        thumbnailFile: thumbnailFile || undefined,
        duration: videoDuration,
        isShort,
        category: category || undefined,
      });
      
      toast.success("Video uploaded successfully!");
      navigate("/movion");
    } catch (error) {
      console.error(error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to upload videos.
            <Button variant="link" onClick={() => navigate('/auth')}>Sign In</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (channelLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show channel creation if no channel exists
  if (!channel && !showChannelForm) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-xl mx-auto p-6 pt-20">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Create Your Channel First</h1>
            <p className="text-muted-foreground">
              You need a channel to upload videos. Create one now to get started!
            </p>
            <Button onClick={() => setShowChannelForm(true)} size="lg">
              Create Channel
            </Button>
            <Button variant="ghost" onClick={() => navigate('/movion')}>
              Back to Movion
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Channel creation form
  if (showChannelForm && !channel) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-xl mx-auto p-6 pt-10">
          <h1 className="text-2xl font-bold mb-6">Create Your Channel</h1>
          <div className="space-y-4">
            <div>
              <Label>Channel Name *</Label>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Enter your channel name"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={channelDescription}
                onChange={(e) => setChannelDescription(e.target.value)}
                placeholder="Tell viewers about your channel"
                className="mt-2"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowChannelForm(false);
                  navigate('/movion');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateChannel}
                disabled={createChannel.isPending || !channelName.trim()}
              >
                {createChannel.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</>
                ) : 'Create Channel'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Upload video</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/movion")}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Step Indicator */}
        <div className="flex items-center gap-4 mb-8">
          {["select", "details", "visibility"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step === s || (step === "visibility" && s === "details") || (step === "visibility" && s === "select") || (step === "details" && s === "select")
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-sm ${step === s ? "font-medium" : "text-muted-foreground"}`}>
                {s === "select" ? "Select file" : s === "details" ? "Details" : "Visibility"}
              </span>
              {i < 2 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>
        
        {/* Step Content */}
        {step === "select" && (
          <div
            className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleVideoSelect(e.target.files[0])}
            />
            
            {isUploading ? (
              <div className="space-y-4">
                <FileVideo className="w-16 h-16 mx-auto text-primary animate-pulse" />
                <p className="font-medium">{videoFile?.name}</p>
                <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Processing... {Math.round(uploadProgress)}%
                </p>
              </div>
            ) : (
              <>
                <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">Drag and drop video files to upload</h3>
                <p className="text-muted-foreground mb-4">
                  Your videos will be private until you publish them
                </p>
                <Button>Select files</Button>
              </>
            )}
          </div>
        )}
        
        {step === "details" && (
          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <Label htmlFor="title">Title (required)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Add a title that describes your video"
                  className="mt-2"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground mt-1">{title.length}/100</p>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers about your video"
                  className="mt-2 min-h-[150px]"
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground mt-1">{description.length}/5000</p>
              </div>
              
              <div>
                <Label>Thumbnail</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Select or upload a picture that shows what's in your video
                </p>
                <div className="flex gap-4">
                  {thumbnailPreview ? (
                    <div className="relative w-40 aspect-video rounded-lg overflow-hidden">
                      <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                      <button 
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1"
                        onClick={() => {
                          setThumbnailFile(null);
                          setThumbnailPreview(null);
                        }}
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="w-40 aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50"
                      onClick={() => thumbnailInputRef.current?.click()}
                    >
                      <Image className="w-8 h-8 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Upload</span>
                    </div>
                  )}
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleThumbnailSelect(e.target.files[0])}
                  />
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_CATEGORIES.filter(c => c !== 'All').map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Video type</Label>
                  <Select value={isShort ? 'short' : 'long'} onValueChange={(v) => setIsShort(v === 'short')}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="long">Long video</SelectItem>
                      <SelectItem value="short">Short (Pulse)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Add tags separated by commas"
                  className="mt-2"
                />
              </div>
            </div>
            
            {/* Preview Card */}
            <div>
              <Label>Preview</Label>
              <div className="mt-2 border border-border rounded-lg overflow-hidden">
                <div className="aspect-video bg-muted">
                  {videoPreview && (
                    <video src={videoPreview} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm line-clamp-2">{title || "Video title"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{channel?.name || "Your channel"}</p>
                </div>
              </div>
              
              <Button 
                className="w-full mt-4" 
                onClick={() => setStep("visibility")}
                disabled={!title.trim()}
              >
                Next
              </Button>
            </div>
          </div>
        )}
        
        {step === "visibility" && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold mb-6">Visibility</h2>
            
            <div className="space-y-4">
              {[
                { value: "public", icon: Globe, title: "Public", desc: "Everyone can watch your video" },
                { value: "unlisted", icon: Eye, title: "Unlisted", desc: "Anyone with the link can watch" },
                { value: "private", icon: Lock, title: "Private", desc: "Only you can watch" },
              ].map((option) => (
                <div
                  key={option.value}
                  className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors
                    ${visibility === option.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                  onClick={() => setVisibility(option.value as any)}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5
                    ${visibility === option.value ? "border-primary" : "border-muted-foreground"}`}
                  >
                    {visibility === option.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <option.icon className="w-5 h-5" />
                      <span className="font-medium">{option.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{option.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Allow comments</p>
                  <p className="text-sm text-muted-foreground">Let viewers add comments</p>
                </div>
                <Switch checked={allowComments} onCheckedChange={setAllowComments} />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show like counts</p>
                  <p className="text-sm text-muted-foreground">Display number of likes</p>
                </div>
                <Switch checked={showLikeCounts} onCheckedChange={setShowLikeCounts} />
              </div>
            </div>
            
            <div className="flex gap-4 mt-8">
              <Button variant="outline" onClick={() => setStep("details")}>
                Back
              </Button>
              <Button 
                onClick={handlePublish} 
                disabled={!title.trim() || uploadVideo.isPending}
              >
                {uploadVideo.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Publishing...</>
                ) : 'Publish'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovionUpload;
