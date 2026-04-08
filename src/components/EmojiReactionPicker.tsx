import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ThumbsUp, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type ReactionType = string; // Now supports any emoji as reaction type

interface EmojiReactionPickerProps {
  currentReaction?: string | null;
  onReact: (emoji: string) => void;
  reactionCounts?: Record<string, number>;
  disabled?: boolean;
}

// Map old reaction type strings to their corresponding emojis (for backward compatibility)
const legacyReactionMap: Record<string, string> = {
  'like': '👍',
  'love': '❤️',
  'care': '🤗',
  'haha': '😂',
  'wow': '😮',
  'sad': '😢',
  'angry': '😠',
};

// Helper function to convert legacy reaction types to emojis
const getReactionEmoji = (reaction: string | null | undefined): string | null => {
  if (!reaction) return null;
  // If it's already an emoji (starts with emoji character), return as is
  // If it's a legacy string type, convert to emoji
  return legacyReactionMap[reaction.toLowerCase()] || reaction;
};

// Helper to convert reaction counts with legacy types to emoji format
const normalizeReactionCounts = (counts: Record<string, number>): Record<string, number> => {
  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(counts)) {
    const emoji = legacyReactionMap[key.toLowerCase()] || key;
    normalized[emoji] = (normalized[emoji] || 0) + value;
  }
  return normalized;
};

// Comprehensive emoji categories
const emojiCategories = {
  'Smileys': [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
    '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐',
    '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
    '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁',
    '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
    '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹',
  ],
  'Love': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
    '💘', '💝', '💟', '😍', '🥰', '😘', '😻', '💑', '👩‍❤️‍👨', '👨‍❤️‍👨', '👩‍❤️‍👩', '💏', '👩‍❤️‍💋‍👨', '👨‍❤️‍💋‍👨', '👩‍❤️‍💋‍👩', '🫶',
  ],
  'Gestures': [
    '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇',
    '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✍️', '🤳', '💪', '🦾', '🦿', '🦵', '🦶',
    '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💅', '🤙', '🫰', '🫱', '🫲', '🫳', '🫴', '🫵', '🫶',
  ],
  'People': [
    '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦱', '🧑‍🦱', '👨‍🦱', '👩‍🦰', '🧑‍🦰', '👨‍🦰', '👱‍♀️', '👱', '👱‍♂️',
    '👩‍🦳', '🧑‍🦳', '👨‍🦳', '👩‍🦲', '🧑‍🦲', '👨‍🦲', '🧔‍♀️', '🧔', '🧔‍♂️', '👵', '🧓', '👴', '👲', '👳‍♀️', '👳', '👳‍♂️',
    '🧕', '👮‍♀️', '👮', '👮‍♂️', '👷‍♀️', '👷', '👷‍♂️', '💂‍♀️', '💂', '💂‍♂️', '🕵️‍♀️', '🕵️', '🕵️‍♂️', '👩‍⚕️', '🧑‍⚕️', '👨‍⚕️',
  ],
  'Animals': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸',
    '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺',
    '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️',
  ],
  'Food': [
    '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝',
    '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐',
    '🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣',
    '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍣', '🍤', '🍥', '🥮', '🍢',
  ],
  'Activities': [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
    '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌',
    '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '⛹️‍♂️', '🏊', '🚴', '🧗',
  ],
  'Objects': [
    '💎', '💍', '👑', '🎩', '🧢', '👓', '🕶️', '🥽', '🌂', '💼', '👜', '👝', '🛍️', '🎒', '👞', '👟',
    '🥾', '🥿', '👠', '👡', '🩰', '👢', '👒', '🎓', '⛑️', '📿', '💄', '💎', '🔔', '🎵', '🎶', '🎤',
    '🎧', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '💡', '🔦', '🕯️', '📚', '📖', '✏️', '🖊️', '🖋️', '✒️',
  ],
  'Symbols': [
    '✅', '❌', '❓', '❗', '💯', '🔥', '⭐', '🌟', '✨', '💫', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇',
    '🥈', '🥉', '🏅', '🎖️', '📣', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🔇',
    '🔈', '🔉', '🔊', '📢', '📣', '📯', '🔔', '🔕', '🎵', '🎶', '💤', '💢', '💥', '💦', '💨', '🕳️',
  ],
};

// Get emoji display info
const getEmojiInfo = (emoji: string) => {
  for (const [category, emojis] of Object.entries(emojiCategories)) {
    if (emojis.includes(emoji)) {
      return { emoji, category };
    }
  }
  return { emoji, category: 'Unknown' };
};

export const EmojiReactionPicker = ({ 
  currentReaction, 
  onReact, 
  reactionCounts = {},
  disabled = false 
}: EmojiReactionPickerProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Smileys');

  // Normalize reaction counts and current reaction for backward compatibility
  const normalizedCounts = normalizeReactionCounts(reactionCounts);
  const displayReaction = getReactionEmoji(currentReaction);

  const totalReactions = Object.values(normalizedCounts).reduce((sum, count) => sum + count, 0);
  
  // Get top 3 reaction emojis by count
  const topReactions = Object.entries(normalizedCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emoji]) => emoji);

  const handleReaction = (emoji: string) => {
    onReact(emoji);
    setShowPicker(false);
  };

  const handleClick = () => {
    if (disabled) return;
    
    // If already reacted, reaction is FINAL - cannot change
    if (currentReaction) {
      return; // Do nothing, reaction cannot be updated
    }
    
    // Open picker to choose reaction
    setShowPicker(true);
  };

  // Check if user has already reacted (reaction is final)
  const hasReacted = !!currentReaction;

  return (
    <>
      {/* Main Button */}
      <button
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 transition-all touch-target rounded-lg px-3 py-2 font-medium",
          hasReacted 
            ? "text-primary cursor-default" 
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        title={hasReacted ? "You've already reacted" : "React to this post"}
      >
        {displayReaction ? (
          <span className="text-xl">{displayReaction}</span>
        ) : (
          <ThumbsUp className="w-5 h-5" />
        )}
        <span className="text-sm">
          {displayReaction ? 'Reacted' : 'React'}
        </span>
      </button>

      {/* Reaction counts display - inline with button to save space */}
      {totalReactions > 0 && topReactions.length > 0 && (
        <div className="flex items-center gap-0.5 shrink-0">
          <div className="flex -space-x-1">
            {topReactions.slice(0, 2).map((emoji, i) => (
              <span key={i} className="text-xs">{emoji}</span>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">{totalReactions}</span>
        </div>
      )}

      {/* Full Emoji Chart Dialog - Responsive for all devices */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-2xl lg:max-w-4xl h-[65vh] sm:h-[75vh] lg:h-[85vh] p-0 rounded-xl overflow-hidden flex flex-col">
          <DialogHeader className="p-3 sm:p-4 pb-2 border-b flex-shrink-0 bg-card z-10">
            <DialogTitle className="flex items-center justify-between text-base sm:text-lg">
              <span>Choose your reaction</span>
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full flex flex-col flex-1 min-h-0">
            {/* Category tabs - scrollable horizontally */}
            <div className="border-b flex-shrink-0">
              <ScrollArea className="w-full h-auto" type="always">
                <div className="px-2 py-1">
                  <TabsList className="h-auto p-1 bg-transparent inline-flex gap-1 w-max">
                    {Object.keys(emojiCategories).map((category) => (
                      <TabsTrigger 
                        key={category} 
                        value={category}
                        className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full whitespace-nowrap"
                      >
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </ScrollArea>
            </div>

            {/* Emoji grid for each category */}
            <ScrollArea className="flex-1 min-h-0 p-2 sm:p-3">
              {Object.entries(emojiCategories).map(([category, emojis]) => (
                <TabsContent key={category} value={category} className="m-0 mt-0">
                  <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-0.5 sm:gap-1">
                    {emojis.map((emoji, index) => (
                      <button
                        key={`${emoji}-${index}`}
                        onClick={() => handleReaction(emoji)}
                        className="p-1.5 sm:p-2 lg:p-2.5 text-xl sm:text-2xl lg:text-3xl hover:bg-secondary rounded-lg transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary"
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>

          {/* Info footer */}
          <div className="p-2 sm:p-3 border-t bg-muted/30 flex-shrink-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
              Choose carefully! Your reaction cannot be changed once selected.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { emojiCategories };
