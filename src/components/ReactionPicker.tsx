import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ThumbsUp } from 'lucide-react';

export type ReactionType = 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';

interface ReactionPickerProps {
  currentReaction?: ReactionType | null;
  onReact: (type: ReactionType) => void;
  reactionCounts?: Record<string, number>;
  disabled?: boolean;
}

const reactions: { type: ReactionType; emoji: string; label: string; color: string }[] = [
  { type: 'like', emoji: '👍', label: 'Like', color: 'text-blue-500' },
  { type: 'love', emoji: '❤️', label: 'Love', color: 'text-red-500' },
  { type: 'care', emoji: '🤗', label: 'Care', color: 'text-yellow-500' },
  { type: 'haha', emoji: '😂', label: 'Haha', color: 'text-yellow-500' },
  { type: 'wow', emoji: '😮', label: 'Wow', color: 'text-yellow-500' },
  { type: 'sad', emoji: '😢', label: 'Sad', color: 'text-yellow-500' },
  { type: 'angry', emoji: '😠', label: 'Angry', color: 'text-orange-500' },
];

export const ReactionPicker = ({ 
  currentReaction, 
  onReact, 
  reactionCounts = {},
  disabled = false 
}: ReactionPickerProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);
  
  // Get top 3 reaction types by count
  const topReactions = Object.entries(reactionCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => reactions.find(r => r.type === type))
    .filter(Boolean);

  const currentReactionData = currentReaction 
    ? reactions.find(r => r.type === currentReaction) 
    : null;

  const handleMouseEnter = () => {
    if (disabled) return;
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    hoverTimeoutRef.current = setTimeout(() => setShowPicker(true), 400);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    leaveTimeoutRef.current = setTimeout(() => setShowPicker(false), 300);
  };

  const handlePickerMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handleReaction = (type: ReactionType) => {
    onReact(type);
    setShowPicker(false);
  };

  const handleClick = () => {
    if (disabled) return;
    if (currentReaction) {
      // Clicking again removes the reaction
      onReact(currentReaction);
    } else {
      // Default to like
      onReact('like');
    }
  };

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Reaction Picker Popup - Facebook Style */}
      {showPicker && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card border border-border rounded-full px-2 py-1.5 shadow-xl flex gap-0.5 z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
          onMouseEnter={handlePickerMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {reactions.map((reaction, idx) => (
            <button
              key={reaction.type}
              onClick={() => handleReaction(reaction.type)}
              className={cn(
                "text-2xl hover:scale-150 transition-all duration-200 p-1.5 rounded-full hover:-translate-y-2",
                currentReaction === reaction.type && "bg-secondary scale-110"
              )}
              style={{ 
                animationDelay: `${idx * 30}ms`,
                animation: 'bounce-in 0.3s ease-out forwards'
              }}
              title={reaction.label}
            >
              <span className="block transform hover:animate-bounce">{reaction.emoji}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Button - Facebook Style */}
      <button
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 transition-all touch-target rounded-lg px-3 py-2 hover:bg-secondary/50 font-medium",
          currentReaction 
            ? currentReactionData?.color 
            : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {currentReactionData ? (
          <span className="text-xl transform transition-transform hover:scale-110">{currentReactionData.emoji}</span>
        ) : (
          <ThumbsUp className="w-5 h-5" />
        )}
        <span className="text-sm">
          {currentReactionData ? currentReactionData.label : 'Like'}
        </span>
      </button>

      {/* Reaction counts display (separate from button) */}
      {totalReactions > 0 && (
        <div className="absolute -top-1 -right-1 flex items-center">
          {topReactions.length > 0 && (
            <div className="flex -space-x-1 bg-card rounded-full px-1 py-0.5 shadow-sm border border-border">
              {topReactions.map((r, i) => (
                <span key={i} className="text-xs">{r?.emoji}</span>
              ))}
              <span className="text-xs ml-1 text-muted-foreground">{totalReactions}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { reactions };