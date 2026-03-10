import { useState, useCallback, useRef, ReactNode } from "react";
import { useMobile } from "@/contexts/MobileContext";
import { ImpactStyle } from "@capacitor/haptics";

interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

interface LongPressMenuProps {
  children: ReactNode;
  items: MenuItem[];
  disabled?: boolean;
  longPressDuration?: number;
}

export const LongPressMenu = ({
  children,
  items,
  disabled = false,
  longPressDuration = 500,
}: LongPressMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const { hapticFeedback } = useMobile();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    
    longPressTimer.current = setTimeout(() => {
      hapticFeedback(ImpactStyle.Heavy);
      setPosition({
        x: Math.min(touch.clientX, window.innerWidth - 200),
        y: Math.min(touch.clientY, window.innerHeight - (items.length * 48 + 20)),
      });
      setIsOpen(true);
    }, longPressDuration);
  }, [disabled, longPressDuration, items.length, hapticFeedback]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleItemClick = (item: MenuItem) => {
    hapticFeedback(ImpactStyle.Light);
    setIsOpen(false);
    item.onClick();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onContextMenu={(e) => e.preventDefault()}
      >
        {children}
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/20" 
            onClick={handleClose}
            onTouchStart={handleClose}
          />
          
          {/* Menu */}
          <div
            className="long-press-menu animate-scale-in"
            style={{
              position: 'fixed',
              left: position.x,
              top: position.y,
              zIndex: 50,
            }}
          >
            {items.map((item, index) => (
              <button
                key={index}
                className={`long-press-item w-full text-left ${
                  item.destructive ? 'text-destructive' : ''
                }`}
                onClick={() => handleItemClick(item)}
              >
                {item.icon && <span className="w-5 h-5">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
};
