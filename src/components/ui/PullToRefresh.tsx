import { Loader2, ArrowDown } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { ReactNode } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export const PullToRefresh = ({ onRefresh, children, className = "" }: PullToRefreshProps) => {
  const { containerRef, isRefreshing, pullDistance, shouldTrigger } = usePullToRefresh({
    onRefresh,
    threshold: 80,
  });

  return (
    <div 
      ref={containerRef} 
      className={`scroll-container relative ${className}`}
      style={{ overflowY: 'auto', height: '100%' }}
    >
      {/* Pull indicator */}
      <div 
        className="absolute left-0 right-0 flex items-center justify-center transition-all duration-200 pointer-events-none z-10"
        style={{ 
          top: 0,
          height: Math.max(0, pullDistance),
          opacity: pullDistance > 20 ? 1 : 0,
        }}
      >
        <div className={`flex items-center gap-2 text-muted-foreground transition-transform ${shouldTrigger ? 'scale-110' : ''}`}>
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <ArrowDown 
              className={`w-5 h-5 transition-transform duration-200 ${shouldTrigger ? 'rotate-180 text-primary' : ''}`} 
            />
          )}
          <span className="text-sm font-medium">
            {isRefreshing ? 'Refreshing...' : shouldTrigger ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>
      
      {/* Content with pull offset */}
      <div 
        style={{ 
          transform: `translateY(${isRefreshing ? 40 : pullDistance}px)`,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};
