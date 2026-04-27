/**
 * FeedSkeleton — Facebook-style grey placeholder card shown while the next
 * page of feed/profile posts is loading. Replaces the spinner so the layout
 * doesn't jump and the user gets a sense of incoming content.
 *
 * Pure presentation, zero state, zero side-effects. Safe to use anywhere.
 */
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const FeedSkeletonCard = () => (
  <Card className="p-4 space-y-3">
    {/* Header: avatar + name */}
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2.5 w-20" />
      </div>
    </div>
    {/* Body: text lines */}
    <div className="space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-11/12" />
      <Skeleton className="h-3 w-3/4" />
    </div>
    {/* Media block */}
    <Skeleton className="h-48 w-full rounded-lg" />
    {/* Footer: action row */}
    <div className="flex items-center justify-between pt-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-14" />
    </div>
  </Card>
);

interface FeedSkeletonProps {
  count?: number;
  className?: string;
}

export const FeedSkeleton = ({ count = 2, className = 'space-y-4' }: FeedSkeletonProps) => (
  <div className={className} aria-label="Loading more posts" aria-busy="true">
    {Array.from({ length: count }).map((_, i) => (
      <FeedSkeletonCard key={i} />
    ))}
  </div>
);
