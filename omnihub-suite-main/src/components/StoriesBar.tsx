import { useState, useRef } from "react";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
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
import StoryViewer from "./StoryViewer";

const StoriesBar = () => {
  const { user } = useAuth();
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

  const hasOwnStory = storyGroups.some((g) => g.user.id === user?.id);

  return (
    <>
      <div className="relative bg-card rounded-xl border p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold">Stories</h3>
        </div>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-md h-8 w-8"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide px-8"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {/* Create Story Button */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center border-2 border-dashed border-primary/50 hover:border-primary transition-colors"
              >
                <Plus className="w-6 h-6 text-primary" />
              </button>
              <span className="text-xs text-muted-foreground">Your Story</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Story Groups */}
            {storyGroups.map((group) => (
              <div
                key={group.user.id}
                className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
                onClick={() => setViewingStoryGroup(group)}
              >
                <div
                  className={`w-16 h-16 rounded-full p-0.5 ${
                    group.hasUnviewed
                      ? "bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-500"
                      : "bg-muted"
                  }`}
                >
                  <Avatar className="w-full h-full border-2 border-background">
                    <AvatarImage src={group.user.avatar_url || ""} />
                    <AvatarFallback>
                      {group.user.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-[64px]">
                  {group.user.id === user?.id ? "You" : group.user.display_name.split(" ")[0]}
                </span>
              </div>
            ))}

            {isLoading && (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
                    <div className="w-12 h-3 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-md h-8 w-8"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Create Story Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewUrl && (
              <div className="relative aspect-[9/16] max-h-[400px] rounded-lg overflow-hidden bg-black">
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
                className="flex-1"
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

export default StoriesBar;
