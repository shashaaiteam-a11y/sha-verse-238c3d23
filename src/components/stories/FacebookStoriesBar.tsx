import { useState, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useStories, StoryGroup } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";
import CreateStoryDialog from "./CreateStoryDialog";
import FacebookStoryViewer from "./FacebookStoryViewer";
import { SponsoredStory } from "@/components/ads";
import { cn } from "@/lib/utils";

const FacebookStoriesBar = () => {
  const { user } = useAuth();
  const { storyGroups, isLoading } = useStories();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewingStoryGroup, setViewingStoryGroup] = useState<StoryGroup | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const ownStoryGroup = storyGroups.find((g) => g.user.id === user?.id);

  const handleStoryClick = (group: StoryGroup) => {
    setViewingStoryGroup(group);
  };

  const handleGroupChange = (group: StoryGroup) => {
    setViewingStoryGroup(group);
  };

  return (
    <>
      <div className="relative bg-card rounded-xl border p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Stories</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary text-xs"
            onClick={() => setShowCreateDialog(true)}
          >
            + Create Story
          </Button>
        </div>

        <div className="relative">
          {/* Scroll buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 backdrop-blur-sm shadow-lg h-8 w-8 rounded-full"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide px-8"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {/* 📢 Sponsored Story slot — appears as second tile (after Create Story) */}
            <SponsoredStory />

            {/* Create Story / Your Story */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              {hasOwnStory ? (
                // Show own story with create option
                <div className="relative">
                  <button
                    onClick={() => ownStoryGroup && handleStoryClick(ownStoryGroup)}
                    className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 via-blue-600 to-blue-700"
                  >
                    <Avatar className="w-full h-full border-2 border-background">
                      <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                      <AvatarFallback>
                        {user?.user_metadata?.display_name?.charAt(0) || "Y"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <button
                    onClick={() => setShowCreateDialog(true)}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                // Show create story button
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center border-2 border-dashed border-primary/50 hover:border-primary transition-colors"
                >
                  <Plus className="w-6 h-6 text-primary" />
                </button>
              )}
              <span className="text-xs text-muted-foreground">Your Story</span>
            </div>

            {/* Ad: Sponsored Story at slot 2 (right after "Your Story") */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <SponsoredStory />
              <span className="text-xs text-muted-foreground">Sponsored</span>
            </div>

            {/* Friends' Stories */}
            {storyGroups
              .filter((g) => g.user.id !== user?.id)
              .map((group) => (
                <div
                  key={group.user.id}
                  className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
                  onClick={() => handleStoryClick(group)}
                >
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full p-0.5",
                      group.hasUnviewed
                        ? "bg-gradient-to-tr from-blue-500 via-blue-600 to-blue-700"
                        : "bg-muted-foreground/30"
                    )}
                  >
                    <Avatar className="w-full h-full border-2 border-background">
                      <AvatarImage src={group.user.avatar_url || ""} />
                      <AvatarFallback>
                        {group.user.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[64px]">
                    {group.user.display_name.split(" ")[0]}
                  </span>
                </div>
              ))}

            {/* Loading placeholders */}
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

            {/* Empty state */}
            {!isLoading && storyGroups.length === 0 && (
              <div className="flex items-center justify-center text-muted-foreground text-sm py-4 px-8">
                No stories yet. Be the first to share!
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 backdrop-blur-sm shadow-lg h-8 w-8 rounded-full"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Create Story Dialog */}
      <CreateStoryDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Story Viewer */}
      {viewingStoryGroup && (
        <FacebookStoryViewer
          key={viewingStoryGroup.user.id}
          storyGroup={viewingStoryGroup}
          allGroups={storyGroups}
          onClose={() => setViewingStoryGroup(null)}
          onGroupChange={handleGroupChange}
        />
      )}
    </>
  );
};

export default FacebookStoriesBar;
