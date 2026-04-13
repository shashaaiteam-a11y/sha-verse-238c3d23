import React, { useRef, useEffect } from 'react';
import { Search, Video, User, Tag, Loader2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMovionSearch, MovionSearchResult } from '@/hooks/useMovionSearch';

interface MovionSearchOverlayProps {
  query: string;
  isVisible: boolean;
  onClose: () => void;
  onQueryChange: (q: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

const ResultIcon: React.FC<{ type: MovionSearchResult['type'] }> = ({ type }) => {
  if (type === 'video') return <Video size={14} className="text-muted-foreground flex-shrink-0" />;
  if (type === 'channel') return <User size={14} className="text-muted-foreground flex-shrink-0" />;
  return <Tag size={14} className="text-primary flex-shrink-0" />;
};

const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary font-semibold rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
};

const ResultRow: React.FC<{
  result: MovionSearchResult;
  query: string;
  onClick: (r: MovionSearchResult) => void;
}> = ({ result, query, onClick }) => {
  const typeLabel = result.type === 'video' ? 'Video' : result.type === 'channel' ? 'Channel' : 'Category';

  return (
    <button
      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/60 transition-colors text-left group"
      onClick={() => onClick(result)}
    >
      {/* Thumbnail / Avatar */}
      <div className="flex-shrink-0 w-12 h-8 rounded-md overflow-hidden bg-muted flex items-center justify-center">
        {result.type === 'video' && result.thumbnail ? (
          <img src={result.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : result.type === 'video' ? (
          <Video size={16} className="text-muted-foreground" />
        ) : result.type === 'channel' && result.avatar ? (
          <img src={result.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : result.type === 'channel' ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold text-white">
            {result.title[0]?.toUpperCase()}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Tag size={14} className="text-primary" />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {highlightMatch(result.title, query)}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0">
            {typeLabel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{result.subtitle}</p>
      </div>

      {/* Arrow */}
      <ResultIcon type={result.type} />
    </button>
  );
};

export const MovionSearchOverlay: React.FC<MovionSearchOverlayProps> = ({
  query,
  isVisible,
  onClose,
  onQueryChange,
  containerRef,
}) => {
  const { results, isLoading } = useMovionSearch(query);
  const navigate = useNavigate();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        overlayRef.current && !overlayRef.current.contains(target) &&
        containerRef.current && !containerRef.current.contains(target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isVisible, onClose, containerRef]);

  const handleResultClick = (result: MovionSearchResult) => {
    if (result.type === 'video' && result.videoId) {
      navigate(`/movion/watch/${result.videoId}`);
    } else if (result.type === 'channel' && result.channelId) {
      navigate(`/movion/channel/${result.channelId}`);
    } else if (result.type === 'category') {
      // Navigate home and let search pass category upstream
      onQueryChange(result.category || result.title);
      navigate('/movion');
    }
    onClose();
  };

  if (!isVisible || !query.trim()) return null;

  return (
    <div
      ref={overlayRef}
      className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
      style={{ maxHeight: '480px', overflow: 'hidden auto' }}
    >
      {/* Search suggestion header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/30">
        <Search size={14} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {isLoading ? 'Searching...' : `Results for "${query}"`}
        </span>
        {isLoading && <Loader2 size={12} className="text-primary animate-spin ml-auto" />}
        {!isLoading && results.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">{results.length} found</span>
        )}
      </div>

      {/* Results */}
      <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
        {isLoading && results.length === 0 ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Searching...</span>
          </div>
        ) : results.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Search size={22} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try searching with different keywords
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Category results first */}
            {results.filter(r => r.type === 'category').length > 0 && (
              <>
                <div className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Categories
                </div>
                {results.filter(r => r.type === 'category').map(r => (
                  <ResultRow key={r.id} result={r} query={query} onClick={handleResultClick} />
                ))}
                <div className="border-t border-border/50 my-1" />
              </>
            )}

            {/* Channel results */}
            {results.filter(r => r.type === 'channel').length > 0 && (
              <>
                <div className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Channels
                </div>
                {results.filter(r => r.type === 'channel').map(r => (
                  <ResultRow key={r.id} result={r} query={query} onClick={handleResultClick} />
                ))}
                <div className="border-t border-border/50 my-1" />
              </>
            )}

            {/* Video results */}
            {results.filter(r => r.type === 'video').length > 0 && (
              <>
                <div className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Videos
                </div>
                {results.filter(r => r.type === 'video').map(r => (
                  <ResultRow key={r.id} result={r} query={query} onClick={handleResultClick} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer: press enter */}
      {results.length > 0 && (
        <div className="border-t border-border px-4 py-2 bg-muted/20 flex items-center gap-2">
          <TrendingUp size={12} className="text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">
            Click a result to go directly, or press Enter to search all
          </span>
        </div>
      )}
    </div>
  );
};

export default MovionSearchOverlay;
