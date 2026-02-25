import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Compass, Gamepad2, Music2, Film, Newspaper, Trophy, GraduationCap, Shirt, Radio, ChefHat, Plane, Sparkles } from "lucide-react";

const categories = [
  { id: "All", label: "All", icon: Compass },
  { id: "Music", label: "Music", icon: Music2 },
  { id: "Gaming", label: "Gaming", icon: Gamepad2 },
  { id: "Live", label: "Live", icon: Radio },
  { id: "News", label: "News", icon: Newspaper },
  { id: "Sports", label: "Sports", icon: Trophy },
  { id: "Entertainment", label: "Entertainment", icon: Film },
  { id: "Education", label: "Learning", icon: GraduationCap },
  { id: "Comedy", label: "Comedy", icon: Sparkles },
  { id: "Cooking", label: "Cooking", icon: ChefHat },
  { id: "Travel", label: "Travel", icon: Plane },
  { id: "Fashion", label: "Fashion & Beauty", icon: Shirt },
  { id: "Tech", label: "Technology", icon: null },
  { id: "Vlogs", label: "Vlogs", icon: null },
  { id: "Movies", label: "Movies", icon: null },
];

interface CategoryTabsProps {
  selected: string;
  onSelect: (category: string) => void;
}

export const CategoryTabs = ({ selected, onSelect }: CategoryTabsProps) => {
  return (
    <div className="sticky top-14 z-30 bg-background pt-2 pb-1">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 px-3 sm:px-6 py-3">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selected === category.id ? "default" : "secondary"}
              size="sm"
              className={cn(
                "rounded-lg px-3 h-8 text-sm font-medium shrink-0",
                selected === category.id && "bg-foreground text-background hover:bg-foreground/90"
              )}
              onClick={() => onSelect(category.id)}
            >
              {category.label}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
