import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Eye,
  ThumbsUp,
  Star,
  Download,
  Bookmark,
  Share2,
  Flag,
  MoreHorizontal,
  ChevronLeft,
  Play,
  Pause
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBook } from "@/hooks/useBookFeeds";
import { useBookInteractions } from "@/hooks/useBookInteractions";
import PDFViewer from "./PDFViewer";
import BookRatingDialog from "./BookRatingDialog";
import BookDeletionDialog from "./BookDeletionDialog";
import BookReportDialog from "./BookReportDialog";
import CommentSection from "./CommentSection";
import { BannerAd, RewardedAdButton, StickyBannerAd } from "@/components/ads";
import { useRewardedAd } from "@/hooks/useRewardedAd";

const BookDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);

  // Rewarded ad for premium book unlock (15-30 min access)
  const { watchAd, isWatching } = useRewardedAd({
    rewardType: 'bookshelf_premium',
    placement: 'bookshelf_rewarded',
  });

  const handlePremiumUnlock = async () => {
    const success = await watchAd();
    if (success) {
      setIsPremiumUnlocked(true);
      // Auto-lock after 30 minutes
      setTimeout(() => setIsPremiumUnlocked(false), 30 * 60 * 1000);
    }
  };

  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [pdfOutline, setPdfOutline] = useState<any[]>([]);

  // Use debouncing for progress updates
  const progressTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch only this specific book
  const { data: book, isLoading } = useBook(id);

  const {
    isLiked,
    isSaved,
    userRating,
    ratings,
    readingProgress,
    toggleLike,
    toggleSave,
    updateProgress,
    incrementDownload,
    incrementView,
  } = useBookInteractions(id);

  // Increment view count once per session when book loads
  useEffect(() => {
    if (book && id) {
      incrementView.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id]);

  // Sync initial reading state from progress
  useEffect(() => {
    if (readingProgress?.current_page && !isReading && currentPage === 1) {
      setCurrentPage(readingProgress.current_page);
    }
  }, [readingProgress, isReading]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);

    // Debounce database updates
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
    }

    progressTimeoutRef.current = setTimeout(() => {
      if (id) {
        updateProgress.mutate({ currentPage: page, totalPages });
      }
    }, 1000); // 1-second debounce
  };

  const handleDownload = () => {
    if (book?.book_url) {
      // Trigger download
      const link = document.createElement('a');
      link.href = book.book_url;
      link.download = `${book.title}.pdf`;
      link.click();

      // Increment download count
      if (id) {
        incrementDownload.mutate();
      }
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading book...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Book not found</h2>
          <p className="text-muted-foreground mb-4">The book you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/bookshelf')}>
            Browse Books
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/bookshelf')}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{book.title}</h1>
              <p className="text-muted-foreground text-sm">by {book.author}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleLike.mutate()}
              >
                <ThumbsUp className={`w-5 h-5 ${isLiked ? 'text-primary fill-current' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSave.mutate()}
              >
                <Bookmark className={`w-5 h-5 ${isSaved ? 'text-primary fill-current' : ''}`} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowRatingDialog(true)}>
                    <Star className="w-4 h-4 mr-2" />
                    Rate Book
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeletionDialog(true)}
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Book Info Card */}
            <Card className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="relative">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-48 h-64 object-cover rounded-lg shadow-lg"
                      />
                    ) : (
                      <div className="w-48 h-64 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-white" />
                      </div>
                    )}
                    {readingProgress && (
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                          Page {readingProgress.current_page} of {readingProgress.total_pages || '?'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="space-y-4">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
                      <p className="text-xl text-muted-foreground">by {book.author}</p>
                    </div>

                    {book.channel && (
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={book.channel.avatar_url || ""} />
                          <AvatarFallback>
                            {book.channel.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{book.channel.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCount(book.channel.subscribers_count ?? 0)} subscribers
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/bookshelf/channel/${book.channel!.id}`)}
                        >
                          View Channel
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {book.category && <Badge variant="secondary">{book.category}</Badge>}
                      {book.language && <Badge variant="outline">{book.language}</Badge>}
                      {book.pages && <Badge variant="outline">{book.pages} pages</Badge>}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {formatCount(book.views_count)} views
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        {formatCount(book.likes_count)} likes
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        {book.rating_avg ? book.rating_avg.toFixed(1) : '0.0'} ({book.rating_count || 0})
                      </span>
                    </div>

                    <div className="flex gap-3 pt-2">
                      {(book as any).is_premium && !isPremiumUnlocked ? (
                        <RewardedAdButton
                          rewardType="bookshelf_premium"
                          placement="bookshelf_rewarded"
                          resourceId={book.id}
                          rewardLabel="30 min premium access"
                          onRewardGranted={handlePremiumUnlock}
                          variant="default"
                          size="lg"
                          fullWidth
                          className="flex-1"
                        />
                      ) : (
                        <Button
                          size="lg"
                          className="flex-1"
                          onClick={() => setIsReading(!isReading)}
                        >
                          {isReading ? (
                            <>
                              <Pause className="w-5 h-5 mr-2" />
                              Pause Reading
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5 mr-2" />
                              Start Reading
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleDownload}
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Ad: Banner below book actions */}
            <div className="flex justify-center">
              <BannerAd placement="bookshelf_detail_banner" />
            </div>

            {/* Description */}
            {book.description && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">About This Book</h2>
                <div className="prose max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap">{book.description}</p>
                </div>
              </Card>
            )}

            {/* Reader View */}
            {isReading && book.book_url && (
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Reading</h2>
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages || '?'}
                  </div>
                </div>

                {/* Inline Ad: Every 20 pages */}
                {currentPage > 0 && currentPage % 20 === 0 && (
                  <div className="mb-4 flex justify-center">
                    <BannerAd placement="bookshelf_reader_inline" />
                  </div>
                )}

                <PDFViewer
                  url={book.book_url}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  onTotalPagesChange={setTotalPages}
                  onOutlineExtracted={setPdfOutline}
                  className="min-h-[70vh]"
                />

                {/* Sticky Banner above pagination */}
                <div className="mt-4">
                  <StickyBannerAd placement="bookshelf_reader_sticky" />
                </div>
              </Card>
            )}

            {/* Comments */}
            {book.comments_enabled !== false && (
              <CommentSection
                bookId={book.id}
                channelId={book.channel_id}
                commentsEnabled={book.comments_enabled}
              />
            )}

            {/* Ratings & Reviews */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Ratings & Reviews</h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="text-center">
                  <div className="text-4xl font-bold">
                    {book.rating_avg ? book.rating_avg.toFixed(1) : '0.0'}
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${star <= Math.round(book.rating_avg || 0)
                            ? 'text-yellow-500 fill-current'
                            : 'text-muted-foreground'
                          }`}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {book.rating_count || 0} ratings
                  </div>
                </div>
                <div className="flex-1">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = ratings.filter(r => r.rating === stars).length;
                    const percentage = book.rating_count ? (count / book.rating_count) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-2 mb-1">
                        <span className="text-sm w-8">{stars}★</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                {ratings.slice(0, 3).map((rating) => (
                  <div key={rating.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {rating.profile?.display_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {rating.profile?.display_name || 'User'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= rating.rating
                                ? 'text-yellow-500 fill-current'
                                : 'text-muted-foreground'
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                    {rating.review && (
                      <p className="text-muted-foreground text-sm">{rating.review}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(rating.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setShowRatingDialog(true)}
              >
                <Star className="w-4 h-4 mr-2" />
                {userRating ? 'Update Your Rating' : 'Rate This Book'}
              </Button>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Table of Contents */}
            {pdfOutline.length > 0 && (
              <Card className="p-4">
                <h3 className="font-bold mb-3">Table of Contents</h3>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {pdfOutline.map((item, index) => (
                    <button
                      key={index}
                      className="block w-full text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded px-2 py-1 truncate"
                      onClick={() => handlePageChange(item.pageNumber)}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Reading Progress */}
            {readingProgress && (
              <Card className="p-4">
                <h3 className="font-bold mb-3">Your Progress</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current page</span>
                    <span>{readingProgress.current_page}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total pages</span>
                    <span>{readingProgress.total_pages || '?'}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${((readingProgress.current_page || 0) / (readingProgress.total_pages || 1)) * 100}%`
                      }}
                    />
                  </div>
                  {readingProgress.completed && (
                    <Badge variant="secondary" className="w-full justify-center">
                      Completed
                    </Badge>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <BookRatingDialog
        open={showRatingDialog}
        onOpenChange={setShowRatingDialog}
        bookId={id || ''}
      />

      <BookDeletionDialog
        open={showDeletionDialog}
        onOpenChange={setShowDeletionDialog}
        bookId={id || ''}
        bookTitle={book.title}
      />
    </div>
  );
};

export default BookDetailPage;