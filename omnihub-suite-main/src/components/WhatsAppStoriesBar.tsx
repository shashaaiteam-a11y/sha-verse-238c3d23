import { useState, useRef } from "react";
import { Plus, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStories, StoryGroup } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import StoryViewer from "./StoryViewer";

// Calculate ring segments based on story count
const StoryRing = ({ 
  storiesCount, 
  viewed, 
  size = 72 
}: { 
  storiesCount: number; 
  viewed: boolean;
  size?: number;
}) => {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 4; // Gap between segments in pixels
  const segmentLength = (circumference - (storiesCount * gap)) / storiesCount;

  return (
    <svg 
      width={size} 
      height={size} 
      className="absolute inset-0"
      style={{ transform: 'rotate(-90deg)' }}
    >
      {Array.from({ length: storiesCount }).map((_, index) => {
        const offset = index * (segmentLength + gap);
        return (
          <circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={viewed ? "hsl(var(--muted-foreground))" : "url(#storyGradient)"}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
          />
        );
      })}
      <defs>
        <linearGradient id="storyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#25D366" />
          <stop offset="50%" stopColor="#128C7E" />
          <stop offset="100%" stopColor="#075E54" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const WhatsAppStoriesBar = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { storyGroups, createStory, isLoading } = useStories();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewingStoryGroup, setViewingStoryGroup] = useState<StoryGroup | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setShowCreateDialog(true);
    }
  };

  const handleCreateStory = async () => {
    if (!selectedFile) return;

    await createStory.mutateAsync({
      mediaFile: selectedFile,
      caption: caption || undefined,
    });

    setShowCreateDialog(false);
    setSelectedFile(null);
    setCaption("");
    setPreviewUrl(null);
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const myStories = storyGroups.find((g) => g.user.id === user?.id);
  const otherStories = storyGroups.filter((g) => g.user.id !== user?.id);

  return (
    <>
      <div className="bg-card rounded-xl border shadow-sm mb-4 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold">Stories</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary h-7"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="w-3.5 h-3.5 mr-1" />
            Add Story
          </Button>
        </div>

        <div className="relative py-3">
          {/* Scroll Buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-background/90 backdrop-blur-sm shadow-md h-7 w-7 rounded-full hidden sm:flex"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-10"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {/* My Story / Create Story */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div 
                className="relative cursor-pointer"
                onClick={() => myStories ? setViewingStoryGroup(myStories) : fileInputRef.current?.click()}
              >
                {myStories ? (
                  <div className="relative w-[72px] h-[72px]">
                    <StoryRing storiesCount={myStories.stories.length} viewed={!myStories.hasUnviewed} />
                    <Avatar className="w-16 h-16 absolute inset-1 border-2 border-background">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        {profile?.display_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {/* Add more stories button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-background"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative w-[72px] h-[72px]">
                    <Avatar className="w-16 h-16 absolute inset-1 border-2 border-dashed border-muted-foreground/50">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-muted">
                        {profile?.display_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <button className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-background">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">Your Story</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Other Users' Stories */}
            {otherStories.map((group) => (
              <div
                key={group.user.id}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
                onClick={() => setViewingStoryGroup(group)}
              >
                <div className="relative w-[72px] h-[72px]">
                  <StoryRing 
                    storiesCount={group.stories.length} 
                    viewed={!group.hasUnviewed} 
                  />
                  <Avatar className="w-16 h-16 absolute inset-1 border-2 border-background">
                    <AvatarImage src={group.user.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {group.user.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[72px] text-center">
                  {group.user.display_name.split(" ")[0]}
                </span>
              </div>
            ))}

            {/* Loading State */}
            {isLoading && (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div className="w-[72px] h-[72px] rounded-full bg-muted animate-pulse" />
                    <div className="w-12 h-3 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </>
            )}

            {/* Empty State */}
            {!isLoading && otherStories.length === 0 && !myStories && (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                No stories yet. Be the first to share!
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-background/90 backdrop-blur-sm shadow-md h-7 w-7 rounded-full hidden sm:flex"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Create Story Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewUrl && (
              <div className="relative aspect-[9/16] max-h-[50vh] rounded-lg overflow-hidden bg-black">
                {selectedFile?.type.startsWith("video") ? (
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
                )}
              </div>
            )}
            <Input
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCreateDialog(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setCaption("");
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gradient-primary"
                onClick={handleCreateStory}
                disabled={createStory.isPending}
              >
                {createStory.isPending ? "Posting..." : "Share Story"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Story Viewer */}
      {viewingStoryGroup && (
        <StoryViewer
          storyGroup={viewingStoryGroup}
          onClose={() => setViewingStoryGroup(null)}
        />
      )}
    </>
  );
};

export default WhatsAppStoriesBar;
