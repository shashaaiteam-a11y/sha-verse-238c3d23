import { useState, useRef } from "react";
import { X, Image, Type, Smile, Send, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStories } from "@/hooks/useStories";
import { cn } from "@/lib/utils";

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BACKGROUND_COLORS = [
  { name: "Blue", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { name: "Sunset", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { name: "Ocean", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { name: "Forest", value: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
  { name: "Fire", value: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)" },
  { name: "Purple", value: "linear-gradient(135deg, #7f00ff 0%, #e100ff 100%)" },
  { name: "Dark", value: "linear-gradient(135deg, #232526 0%, #414345 100%)" },
  { name: "Pink", value: "linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)" },
];

const CreateStoryDialog = ({ open, onOpenChange }: CreateStoryDialogProps) => {
  const { createStory, createTextStory } = useStories();
  const [storyType, setStoryType] = useState<"media" | "text">("media");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [textContent, setTextContent] = useState("");
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLORS[0].value);
  const [privacy, setPrivacy] = useState("friends");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStoryType("media");
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (storyType === "text" && textContent.trim()) {
        await createTextStory.mutateAsync({
          textContent: textContent.trim(),
          backgroundColor,
          privacy,
        });
      } else if (storyType === "media" && selectedFile) {
        await createStory.mutateAsync({
          mediaFile: selectedFile,
          caption: caption || undefined,
          privacy,
        });
      }
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setTextContent("");
    setBackgroundColor(BACKGROUND_COLORS[0].value);
    setStoryType("media");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:w-full p-0 overflow-hidden gap-0 mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-center">Create Story</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Story Type Tabs */}
          <div className="flex gap-2">
            <Button
              variant={storyType === "media" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => setStoryType("media")}
            >
              <Image className="w-4 h-4" />
              Photo/Video
            </Button>
            <Button
              variant={storyType === "text" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => {
                setStoryType("text");
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
            >
              <Type className="w-4 h-4" />
              Text
            </Button>
          </div>

          {/* Main Content Area - Stacks on mobile, side-by-side on desktop */}
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            {/* Preview Area - Fixed size for both media and text */}
            <div 
              className="relative flex-shrink-0 w-44 sm:w-56 aspect-[9/16] rounded-xl overflow-hidden bg-muted"
              style={storyType === "text" ? { background: backgroundColor } : undefined}
            >
              {storyType === "media" ? (
                previewUrl ? (
                  selectedFile?.type.startsWith("video") ? (
                    <video
                      src={previewUrl}
                      className="w-full h-full object-contain"
                      controls
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  )
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center gap-4 hover:bg-muted/80 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Image className="w-8 h-8 text-primary" />
                    </div>
                    <span className="text-muted-foreground text-center text-xs px-2">Click to upload photo or video</span>
                  </button>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4 relative">
                  <Textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Start typing..."
                    className="bg-transparent border-none text-white text-xl font-semibold text-center resize-none h-full placeholder:text-white/60 focus-visible:ring-0"
                    maxLength={200}
                  />
                </div>
              )}

              {/* Caption overlay for media */}
              {storyType === "media" && previewUrl && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                  <Input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="bg-white/20 border-none text-white placeholder:text-white/70"
                  />
                </div>
              )}

              {/* Remove button for media */}
              {storyType === "media" && previewUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Right Sidebar - Controls */}
            <div className="w-full flex-1 space-y-4 flex flex-col">
              {/* Background color picker for text stories - Fixed position next to preview */}
              {storyType === "text" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Background
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {BACKGROUND_COLORS.map((color) => (
                      <button
                        key={color.name}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          backgroundColor === color.value
                            ? "border-primary scale-110"
                            : "border-transparent"
                        )}
                        style={{ background: color.value }}
                        onClick={() => setBackgroundColor(color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Character counter for text stories */}
              {storyType === "text" && (
                <div className="text-xs text-muted-foreground">
                  {textContent.length}/200 characters
                </div>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Privacy selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Who can see this?</label>
                <Select value={privacy} onValueChange={setPrivacy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">🌍 Public</SelectItem>
                    <SelectItem value="friends">👥 Friends</SelectItem>
                    <SelectItem value="only_me">🔒 Only Me</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit button */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    resetForm();
                    onOpenChange(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    (storyType === "media" && !selectedFile) ||
                    (storyType === "text" && !textContent.trim())
                  }
                >
                  {isSubmitting ? (
                    "Posting..."
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Share Story
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CreateStoryDialog;
