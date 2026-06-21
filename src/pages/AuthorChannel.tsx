import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBooks } from "@/hooks/useBooks";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Book, Users, Eye, Grid, List, Settings, Share2, Bell, BellOff, Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookCard from "@/components/bookshelf/BookCard";
import { ShareDialog } from "@/components/ShareDialog";
import { BOOK_PUBLIC_COLUMNS } from "@/lib/constants/bookshelf";
import { excludeSeedBooks } from "@/modules/bookshelf/lib/seedFilter";
import { toast } from "sonner";

const AuthorChannel = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showShareDialog, setShowShareDialog] = useState(false);

  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ["author-channel", channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("id", channelId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!channelId,
  });

  // Fetch books with real-time updates
  const { data: books = [], isLoading: booksLoading } = useQuery({
    queryKey: ["author-books", channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select(`
          ${BOOK_PUBLIC_COLUMNS},
          channel:channels!books_channel_id_fkey(id, name, avatar_url, user_id)
        `)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!channelId,
  });

  // Fetch real-time channel metrics with proper cleanup
  const { data: channelMetrics } = useQuery({
    queryKey: ["channel-metrics", channelId],
    queryFn: async () => {
      if (!channelId) return null;
      
      // Get total views and downloads from all books in this channel
      const { data: bookStats, error: statsError } = await supabase
        .from("books")
        .select("views_count, downloads_count")
        .eq("channel_id", channelId);
      
      if (statsError) throw statsError;
      
      const totalViews = bookStats?.reduce((sum, book) => sum + (book.views_count || 0), 0) || 0;
      const totalDownloads = bookStats?.reduce((sum, book) => sum + (book.downloads_count || 0), 0) || 0;
      
      return {
        totalViews,
        totalDownloads,
        booksCount: bookStats?.length || 0
      };
    },
    enabled: !!channelId,
  });

  const { data: isSubscribed } = useQuery({
    queryKey: ["author-subscribed", channelId, user?.id],
    queryFn: async () => {
      if (!user?.id || !channelId) return false;
      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("channel_id", channelId)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!channelId && !!user?.id,
  });

  const toggleSubscribe = useMutation({
    mutationFn: async () => {
      if (!user?.id || !channelId) throw new Error("Not authenticated");
      if (isSubscribed) {
        const { error } = await (supabase as any).rpc("unsubscribe_from_channel", { target_channel_id: channelId });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).rpc("subscribe_to_channel", { target_channel_id: channelId });
        if (error) throw error;
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["author-channel", channelId] });
      await queryClient.cancelQueries({ queryKey: ["author-subscribed", channelId, user?.id] });
      const prevChannel = queryClient.getQueryData(["author-channel", channelId]);
      const prevSubscribed = queryClient.getQueryData(["author-subscribed", channelId, user?.id]);
      queryClient.setQueryData(["author-subscribed", channelId, user?.id], !isSubscribed);
      queryClient.setQueryData(["author-channel", channelId], (old: any) => old ? {
        ...old,
        subscribers_count: isSubscribed
          ? Math.max(0, (old.subscribers_count || 0) - 1)
          : (old.subscribers_count || 0) + 1,
      } : old);
      return { prevChannel, prevSubscribed };
    },
    onError: (_err: any, _vars: any, context: any) => {
      queryClient.setQueryData(["author-channel", channelId], context?.prevChannel);
      queryClient.setQueryData(["author-subscribed", channelId, user?.id], context?.prevSubscribed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["author-subscribed", channelId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["author-channel", channelId] });
      queryClient.invalidateQueries({ queryKey: ["channel-metrics", channelId] });
      queryClient.invalidateQueries({ queryKey: ["channels", "books"] });
      queryClient.invalidateQueries({ queryKey: ["books", "subscribed"] });
      toast.success(isSubscribed ? "Unsubscribed" : "Subscribed!");
    },
  });

  // Realtime listener: subscriber count + subscription changes
  useEffect(() => {
    if (!channelId) return;
    const rt = supabase
      .channel(`author-channel-rt-${channelId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'channels', filter: `id=eq.${channelId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["author-channel", channelId] });
        queryClient.invalidateQueries({ queryKey: ["channel-metrics", channelId] });
        queryClient.invalidateQueries({ queryKey: ["channels", "books"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `channel_id=eq.${channelId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["author-channel", channelId] });
        queryClient.invalidateQueries({ queryKey: ["author-subscribed", channelId, user?.id] });
        queryClient.invalidateQueries({ queryKey: ["books", "subscribed"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(rt); };
  }, [channelId, user?.id, queryClient]);

  // handleShare removed - using ShareDialog instead

  const isOwner = channel?.user_id === user?.id;
  // Use real-time metrics instead of calculated values
  const totalViews = channelMetrics?.totalViews || 0;
  const totalDownloads = channelMetrics?.totalDownloads || 0;
  const booksCount = channelMetrics?.booksCount || books.length;

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (channelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold">Author not found</h1>
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
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold truncate flex-1">{channel.name}</h1>
          {isOwner && (
            <Button variant="ghost" size="icon" onClick={() => navigate(`/bookshelf/channel/${channelId}/edit`)}>
              <Settings className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Banner */}
      <div className="h-32 sm:h-48 bg-gradient-primary relative">
        {channel.banner_url && (
          <img
            src={channel.banner_url}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Channel Info */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-8 mb-6">
          <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-background shadow-lg">
            <AvatarImage src={channel.avatar_url || ""} />
            <AvatarFallback className="text-3xl">{channel.name.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-2xl font-bold">{channel.name}</h1>
              <Badge variant="secondary">Author</Badge>
            </div>
            <p className="text-muted-foreground mb-2">
              {formatCount(channel.subscribers_count || 0)} subscribers • {formatCount(booksCount)} books
            </p>
            {channel.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{channel.description}</p>
            )}
          </div>

          <div className="flex gap-2">
            {!isOwner && (
              <Button
                variant={isSubscribed ? "outline" : "default"}
                onClick={() => toggleSubscribe.mutate(undefined)}
                disabled={!user}
              >
                {isSubscribed ? (
                  <>
                    <BellOff className="w-4 h-4 mr-2" />
                    Unsubscribe
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Subscribe
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowShareDialog(true)}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            {isOwner && (
              <Button variant="outline" onClick={() => navigate(`/bookshelf/channel/${channelId}/edit`)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 text-center">
            <Book className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{formatCount(booksCount)}</div>
            <div className="text-xs text-muted-foreground">Books</div>
          </Card>
          <Card className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{formatCount(channel.subscribers_count || 0)}</div>
            <div className="text-xs text-muted-foreground">Subscribers</div>
          </Card>
          <Card className="p-4 text-center">
            <Eye className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{formatCount(totalViews)}</div>
            <div className="text-xs text-muted-foreground">Total Views</div>
          </Card>
          <Card className="p-4 text-center">
            <Book className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{formatCount(totalDownloads)}</div>
            <div className="text-xs text-muted-foreground">Downloads</div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="books">
          <TabsList className="mb-4">
            <TabsTrigger value="books">Books</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="books">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">All Books ({formatCount(booksCount)})</h2>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "bg-accent" : ""}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-accent" : ""}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {booksLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="aspect-[2/3] bg-muted" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : books.length === 0 ? (
              <Card className="p-8 text-center">
                <Book className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No books yet</h3>
                <p className="text-muted-foreground text-sm">
                  {isOwner ? "Upload your first book to get started!" : "This author hasn't published any books yet."}
                </p>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {books.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {books.map((book) => (
                  <Card
                    key={book.id}
                    className="p-4 flex gap-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      void (supabase as any).rpc("increment_book_views", { book_id: book.id });
                      navigate(`/bookshelf/book/${book.id}`, { state: { countedView: true } });
                    }}
                  >
                    <div className="w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-primary">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Book className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-1">{book.title}</h3>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{book.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {formatCount(book.views_count || 0)}
                        </span>
                        <span>{formatDistanceToNow(new Date(book.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about">
            <Card className="p-6">
              <h2 className="font-semibold mb-4">About {channel.name}</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {channel.description || "This author hasn't added a description yet."}
              </p>
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium mb-2">Statistics</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Joined {channel.created_at ? formatDistanceToNow(new Date(channel.created_at), { addSuffix: true }) : "Unknown"}</li>
                  <li>{formatCount(booksCount)} books published</li>
                  <li>{formatCount(channel.subscribers_count || 0)} subscribers</li>
                  <li>{formatCount(totalViews)} total views</li>
                </ul>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        postId={channelId || ''}
        postType="book"
        postContent={`Check out ${channel?.name}'s bookshelf channel!`}
        postImage={channel?.avatar_url}
      />
    </div>
  );
};

export default AuthorChannel;
