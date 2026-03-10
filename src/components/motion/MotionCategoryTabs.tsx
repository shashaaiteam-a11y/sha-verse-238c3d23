// Motion Category Tabs - Horizontal scrollable categories
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MotionCategory } from "./types";

const categories: MotionCategory[] = [
  'All',
  'Tech',
  'Comedy',
  'Education',
  'Music',
  'Gaming',
  'News',
  'Quick',
  'Lifestyle',
  'Sports',
];

interface MotionCategoryTabsProps {
  selected: MotionCategory;
  onSelect: (category: MotionCategory) => void;
}

export const MotionCategoryTabs = ({ selected, onSelect }: MotionCategoryTabsProps) => {
  return (
    <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-lg border-b border-border/30">
      <ScrollArea className="w-full">
        <div className="flex gap-2 px-3 py-3">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selected === category ? "default" : "secondary"}
              size="sm"
              className={cn(
                "rounded-full whitespace-nowrap px-4 h-8 text-sm transition-all duration-200",
                selected === category 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "bg-secondary/80 hover:bg-secondary text-secondary-foreground"
              )}
              onClick={() => onSelect(category)}
            >
              {category}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
};
