import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBookInteractions } from "@/hooks/useBookInteractions";
import { useBookComments } from "@/hooks/useBookComments";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft, Heart, Share2, Bookmark, Download, Play, Star, Eye, MessageCircle,
  ThumbsUp, Book, Clock, Globe, Tag, MoreVertical, Flag, Trash2, Edit, User, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BookRatingDialog from "@/components/bookshelf/BookRatingDialog";
import BookDeletionDialog from "@/components/bookshelf/BookDeletionDialog";
import BookReportDialog from "@/components/bookshelf/BookReportDialog";
import { ShareDialog } from "@/components/ShareDialog";
import CommentSection from "@/components/bookshelf/CommentSection";
import { BannerAd, NativeAdCard } from "@/components/ads";

// BookDetail page component
const BookDetail = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [comment, setComment] = useState("");
  const [commentsExpanded, setCommentsExpanded] = useState(true);
  const [ratingsExpanded, setRatingsExpanded] = useState(true);
  const [descriptionExpanded, setDescriptionExpanded] = useState(true);
  const [viewsTracked, setViewsTracked] = useState(false);

  const { data: book, isLoading, isError, error } = useQuery({
    queryKey: ["book", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select(`
          *,
          channel:channels!books_channel_id_fkey(id, name, avatar_url, user_id, subscribers_count)
        `)
        .eq("id", bookId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookId,
  });

  // Fetch channel metrics (total views and downloads from all books in the channel)
  const { data: channelMetrics } = useQuery({
    queryKey: ["channelMetrics", book?.channel?.id],
    queryFn: async () => {
      if (!book?.channel?.id) return null;

      const { data, error } = await supabase
        .from("books")
        .select("views_count, downloads_count")
        .eq("channel_id", book.channel.id);

      if (error) throw error;

      const totalViews = data?.reduce((sum, b) => sum + (b.views_count || 0), 0) || 0;
      const totalDownloads = data?.reduce((sum, b) => sum + (b.downloads_count || 0), 0) || 0;

      return {
        totalBooks: data?.length || 0,
        totalViews,
        totalDownloads,
        subscribers: book.channel.subscribers_count || 0,
      };
    },
    enabled: !!book?.channel?.id,
  });

  // Setup Realtime Subscriptions for ALL live stats
  useEffect(() => {
    if (!bookId) return;
    const channelId = book?.channel?.id;

    // Master realtime channel — listens to books, likes, ratings, subscriptions, comments
    const realtimeChannel = supabase
      .channel(`book-detail-realtime-${bookId}`)
      // 1. Book row itself (views, likes_count, downloads_count, rating_avg etc)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'books', filter: `id=eq.${bookId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["book", bookId] });
        }
      )
      // 2. Likes on this book — refresh like status & count
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes', filter: `book_id=eq.${bookId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["book-liked", bookId] });
          queryClient.invalidateQueries({ queryKey: ["book", bookId] });
        }
      )
      // 3. Ratings on this book — refresh rating aggregates
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'book_ratings', filter: `book_id=eq.${bookId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["book-ratings", bookId] });
          queryClient.invalidateQueries({ queryKey: ["book-user-rating", bookId] });
          queryClient.invalidateQueries({ queryKey: ["book", bookId] });
        }
      )
      // 4. Comments on this book — refresh comment count
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `book_id=eq.${bookId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["book-comments", bookId] });
          queryClient.invalidateQueries({ queryKey: ["book", bookId] });
        }
      )
      .subscribe();

    // Channel-level realtime (subscriber count, channel books metrics)
    let channelRealtimeSub: any = null;
    if (channelId) {
      channelRealtimeSub = supabase
        .channel(`book-channel-realtime-${channelId}`)
        // Channel row updates (subscriber_count changes)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'channels', filter: `id=eq.${channelId}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ["book", bookId] });
            queryClient.invalidateQueries({ queryKey: ["channelMetrics", channelId] });
          }
        )
        // All books in this channel (for channel metrics: total views, downloads etc)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'books', filter: `channel_id=eq.${channelId}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ["channelMetrics", channelId] });
          }
        )
        // Subscriptions to this channel (subscriber count live)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'subscriptions', filter: `channel_id=eq.${channelId}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ["book", bookId] });
            queryClient.invalidateQueries({ queryKey: ["channelMetrics", channelId] });
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(realtimeChannel);
      if (channelRealtimeSub) supabase.removeChannel(channelRealtimeSub);
    };
  }, [book?.channel?.id, bookId, queryClient]);

  // Track view when book is loaded — once per session per book
  useEffect(() => {
    if (book && bookId && !viewsTracked) {
      const sessionKey = `book_viewed_${bookId}`;
      if (sessionStorage.getItem(sessionKey)) {
        setViewsTracked(true);
        return;
      }
      const trackView = async () => {
        if ((location.state as any)?.countedView) {
          setViewsTracked(true);
          return;
        }
        try {
          const { error } = await (supabase.rpc as any)('increment_book_views', {
            book_id: bookId
          });
          if (!error) {
            setViewsTracked(true);
            sessionStorage.setItem(sessionKey, '1');
            queryClient.invalidateQueries({ queryKey: ["book", bookId] });
            queryClient.invalidateQueries({ queryKey: ["channelMetrics"] });
          }
        } catch (e) {
          console.error("Failed to track view:", e);
        }
      };
      trackView();
    }
  }, [book, bookId, viewsTracked, queryClient, location.state]);

  const {
    isLiked,
    isSaved,
    ratings,
    toggleLike,
    toggleSave,
    incrementDownload,
  } = useBookInteractions(bookId);

  const { comments, createComment } = useBookComments(bookId);

  const isOwner = book?.channel?.user_id === user?.id;

  // handleShare removed - using ShareDialog instead

  const handleDownload = async () => {
    if (!book?.book_url) {
      toast.error("No download available for this book");
      return;
    }

    try {
      toast.loading("Preparing download...", { id: "book-download" });

      // Fetch the file as a blob to bypass ad-blockers (ERR_BLOCKED_BY_CLIENT)
      // that block direct navigation to storage URLs.
      const response = await fetch(book.book_url, { mode: "cors" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();

      // Derive a safe filename + extension from the URL
      const urlPath = new URL(book.book_url).pathname;
      const extMatch = urlPath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      const ext = extMatch ? extMatch[1] : "pdf";
      const safeTitle = (book.title || "book").replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "book";
      const filename = `${safeTitle}.${ext}`;

      // Trigger download via temporary anchor + object URL
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      // Increment download count after successful download trigger
      await incrementDownload.mutateAsync();

      toast.dismiss("book-download");
      toast.success("Download started!");
    } catch (error: any) {
      toast.dismiss("book-download");
      console.error("Download failed:", error);
      // Fallback: try opening in new tab (may still be blocked by ad-blockers)
      try {
        window.open(book.book_url, "_blank", "noopener,noreferrer");
        toast.message("If download didn't start, please disable your ad-blocker for this site.");
      } catch {
        toast.error("Failed to download. Please disable any ad-blocker and try again.");
      }
    }
  };

  const handleStartReading = () => {
    if (!book?.book_url) {
      toast.error("Book PDF not available");
      return;
    }
    navigate(`/bookshelf/read/${bookId}`);
  };

  const handleCommentSubmit = async () => {
    if (!comment.trim()) return;
    await createComment.mutateAsync({ content: comment });
    setComment("");
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Book className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-xl font-semibold text-destructive">Error Loading Book</h1>
        <p className="text-muted-foreground mb-4">{error?.message || 'Failed to load book details'}</p>
        <Button onClick={() => navigate('/bookshelf')}>Back to Bookshelf</Button>
      </div>
    );
  }

  // Handle auth loading state
  if (!user && book?.visibility !== 'public') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Book className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold">Authentication Required</h1>
        <p className="text-muted-foreground mb-4">Please sign in to view this book</p>
        <Button onClick={() => navigate('/auth')}>Sign In</Button>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Book className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold">Book not found</h1>
        <Button variant="link" onClick={() => navigate("/bookshelf")}>
          Back to Bookshelf
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold truncate flex-1">{book.title}</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner && (
                <>
                  <DropdownMenuItem onClick={() => navigate(`/bookshelf/edit/${bookId}`)}>
                    <Edit className="w-4 h-4 mr-2" /> Edit Book
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDeletionDialog(true)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Request Deletion
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem>
                <Flag className="w-4 h-4 mr-2" /> Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Book Cover & Info */}
        <div className="flex flex-col sm:flex-row gap-6 mb-6">
          {/* Cover */}
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            <div className="w-48 h-72 rounded-xl overflow-hidden shadow-2xl bg-gradient-primary">
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Book className="w-16 h-16 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{book.title}</h1>
            <p className="text-lg text-muted-foreground mb-4">{book.author}</p>

            {/* Author Channel */}
            {book.channel && (
              <>
                <Card
                  className="p-3 mb-4 inline-flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => navigate(`/bookshelf/channel/${book.channel.id}`)}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={book.channel.avatar_url || ""} />
                    <AvatarFallback>{book.channel.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{book.channel.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCount(book.channel.subscribers_count || 0)} subscribers
                    </p>
                  </div>
                  <Button size="sm" variant="secondary">Visit Channel</Button>
                </Card>

                {/* Channel Metrics Boxes */}
                {channelMetrics && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {/* Books */}
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 text-center">
                      <Book className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">{channelMetrics.totalBooks}</div>
                      <div className="text-xs text-muted-foreground">Books</div>
                    </div>

                    {/* Subscribers */}
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mx-auto mb-2 text-primary">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      <div className="text-2xl font-bold">{formatCount(channelMetrics.subscribers)}</div>
                      <div className="text-xs text-muted-foreground">Subscribers</div>
                    </div>

                    {/* Total Views */}
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 text-center">
                      <Eye className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">{formatCount(channelMetrics.totalViews)}</div>
                      <div className="text-xs text-muted-foreground">Total Views</div>
                    </div>

                    {/* Downloads */}
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 text-center">
                      <Download className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">{formatCount(channelMetrics.totalDownloads)}</div>
                      <div className="text-xs text-muted-foreground">Downloads</div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Stats */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {formatCount(book.views_count || 0)} views
              </span>
              <span className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                {formatCount(book.downloads_count || 0)} downloads
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                {book.rating_avg?.toFixed(1) || "0"} ({book.rating_count || 0})
              </span>
              {book.pages && (
                <span className="flex items-center gap-1">
                  <Book className="w-4 h-4" />
                  {book.pages} pages
                </span>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
              {book.category && <Badge variant="secondary">{book.category}</Badge>}
              {book.language && <Badge variant="outline">{book.language}</Badge>}
              {book.tags?.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              <Button
                onClick={handleStartReading}
                className="gap-2"
                title="Start reading this book"
              >
                <Play className="w-4 h-4" />
                Start Reading
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={incrementDownload.isPending || !book?.book_url}
                className="gap-2"
                title={book?.book_url ? "Download this book" : "Download not available"}
              >
                {incrementDownload.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download
                  </>
                )}
              </Button>
            </div>

            {/* Sponsored banner under action buttons */}
            <div className="mt-4">
              <BannerAd placement="bookshelf_detail_banner" />
            </div>
          </div>
        </div>

        {/* Prominent Interaction Buttons */}
        <div className="flex flex-wrap justify-center sm:justify-start gap-3 mb-6">
          {/* Like Button - YouTube Style */}
          <Button
            variant="outline"
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${isLiked ? "bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20" : "hover:bg-accent"}`}
            onClick={() => toggleLike.mutate()}
            disabled={toggleLike.isPending}
            title={isLiked ? "Unlike this book" : "Like this book"}
          >
            <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
            <span className="font-medium">{formatCount(book.likes_count || 0)}</span>
          </Button>

          {/* Rate Button - Real-time Rating */}
          <Button
            variant="outline"
            className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-accent"
            onClick={() => setShowRatingDialog(true)}
            title="Rate this book"
          >
            <Star className={`w-5 h-5 ${book.rating_avg ? "fill-yellow-500 text-yellow-500" : ""}`} />
            <span className="font-medium">
              {book.rating_count ? `${book.rating_avg?.toFixed(1) || "0"}` : "Rate"}
            </span>
          </Button>

          {/* Save Button - Toggle Blue When Saved */}
          <Button
            variant="outline"
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${isSaved ? "bg-blue-500/10 border-blue-500 text-blue-500 hover:bg-blue-500/20" : "hover:bg-accent"}`}
            onClick={() => toggleSave.mutate()}
            disabled={toggleSave.isPending}
            title={isSaved ? "Remove from library" : "Save to library"}
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
            <span className="font-medium">{isSaved ? "Saved" : "Save"}</span>
          </Button>

          {/* Share Button - Real-time Sharing Options */}
          <Button
            variant="outline"
            className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-accent"
            onClick={() => setShowShareDialog(true)}
            title="Share this book"
          >
            <Share2 className="w-5 h-5" />
            <span className="font-medium">Share</span>
          </Button>
        </div>

        {/* Description */}
        <Card className="p-4 mb-6">
          <button
            onClick={() => setDescriptionExpanded(!descriptionExpanded)}
            className="w-full flex items-center justify-between mb-2 hover:opacity-70 transition-opacity"
          >
            <h2 className="font-semibold">Description</h2>
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ${descriptionExpanded ? "rotate-0" : "-rotate-90"}`}
            />
          </button>
          {descriptionExpanded && (
            <p className="text-muted-foreground whitespace-pre-wrap">
              {book.description || "No description available."}
            </p>
          )}
        </Card>

        {/* 📚 Native Ad — sits between description and book info, high-CTR spot */}
        <div className="mb-6">
          <NativeAdCard placement="bookshelf_detail_banner" />
        </div>

        {/* Book Info */}
        <Card className="p-4 mb-6">
          <h2 className="font-semibold mb-3">Book Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Published</p>
              <p>{book.created_at ? formatDistanceToNow(new Date(book.created_at), { addSuffix: true }) : "Unknown"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Category</p>
              <p>{book.category || "Uncategorized"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Language</p>
              <p>{book.language || "English"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pages</p>
              <p>{book.pages || "Unknown"}</p>
            </div>
          </div>
        </Card>

        {/* Ratings & Reviews */}
        {(book as any).ratings_enabled !== false && (
          <Card className="p-4 mb-6">
            {/* Ratings Header - Expandable */}
            <button
              onClick={() => setRatingsExpanded(!ratingsExpanded)}
              className="w-full flex items-center justify-between mb-4 hover:opacity-70 transition-opacity"
            >
              <h2 className="font-semibold">Ratings & Reviews</h2>
              <div className="flex items-center gap-2">
                {(book as any).ratings_enabled !== false && (
                  <Button variant="outline" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    setShowRatingDialog(true);
                  }}>
                    Write Review
                  </Button>
                )}
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-200 ${ratingsExpanded ? "rotate-0" : "-rotate-90"}`}
                />
              </div>
            </button>

            {/* Ratings Content - Collapsible */}
            {ratingsExpanded && (
              <>
                {/* Rating Summary */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold">{book.rating_avg?.toFixed(1) || "0"}</div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${star <= (book.rating_avg || 0) ? "text-yellow-500 fill-current" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{book.rating_count || 0} ratings</p>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Reviews List */}
                <div className="space-y-4">
                  {ratings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No reviews yet. Be the first to review!</p>
                  ) : (
                    ratings.slice(0, 5).map((rating) => (
                      <div key={rating.id} className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={rating.profile?.avatar_url || ""} />
                          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{rating.profile?.display_name || "User"}</span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3 h-3 ${star <= rating.rating ? "text-yellow-500 fill-current" : "text-muted-foreground"}`}
                                />
                              ))}
                            </div>
                          </div>
                          {rating.review && <p className="text-sm text-muted-foreground">{rating.review}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </Card>
        )}


      </div>

      <BookRatingDialog
        open={showRatingDialog}
        onOpenChange={setShowRatingDialog}
        bookId={bookId!}
      />

      <BookDeletionDialog
        open={showDeletionDialog}
        onOpenChange={setShowDeletionDialog}
        bookId={bookId!}
        bookTitle={book.title}
      />

      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        postId={bookId || ''}
        postType="book"
        postContent={book.title}
        postImage={book.cover_url}
      />

      {/* Full Comment Section */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <CommentSection
          bookId={bookId || ''}
          channelId={book?.channel_id || ''}
          commentsEnabled={(book as any)?.comments_enabled !== false}
        />
      </div>
    </div>
  );
};

export default BookDetail;
