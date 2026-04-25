import { useState } from "react";

import { useNavigate } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import { Book, Plus, Search, TrendingUp, Clock, Star, Users, Eye, MessageCircle, ThumbsUp, Grid, List, BookOpen, Heart } from "lucide-react";

import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Badge } from "@/components/ui/badge";

import { useBooks } from "@/hooks/useBooks";

import { useChannels } from "@/hooks/useChannels";

import { useSubscribedBooks, useSavedBooks } from "@/hooks/useBookFeeds";

import { useAuth } from "@/contexts/AuthContext";

import { supabase } from "@/integrations/supabase/client";

import UploadBookDialog from "@/components/bookshelf/UploadBookDialog";

import CreateAuthorChannelDialog from "@/components/bookshelf/CreateAuthorChannelDialog";

import BookCard from "@/components/bookshelf/BookCard";

import { formatDistanceToNow } from "date-fns";

import { BOOK_CATEGORIES } from "@/lib/constants/bookshelf";

import { NativeAdCard, SponsoredBookCard } from "@/components/ads";



const Bookshelf = () => {

  const navigate = useNavigate();

  const { user } = useAuth();



  // Independent pagination states for different tabs could be better, 

  // but to keep UI simple we'll reset page on tab switch.

  const [activeTab, setActiveTab] = useState("discover");

  const [page, setPage] = useState(0);



  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("All");

  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const [showCreateChannelDialog, setShowCreateChannelDialog] = useState(false);



  // Main Feed & Trending (via useBooks wrapper)

  const { books, trendingBooks, isLoading } = useBooks({

    page,

    limit: 20,

    search: searchQuery,

    category: selectedCategory,

  });



  const { channels } = useChannels("books");



  // Get user's book channel

  const userChannel = channels?.find((c) => c.user_id === user?.id);



  // Subscribed Books (Server-Side Filtered & Paginated)

  const { data: subscribedBooks = [] } = useSubscribedBooks({

    search: searchQuery,

    category: selectedCategory,

    page: activeTab === 'subscribed' ? page : 0,

    limit: 20

  });



  // Saved Books (Server-Side Filtered & Paginated)

  const { data: savedBooks = [] } = useSavedBooks({

    search: searchQuery,

    category: selectedCategory,

    page: activeTab === 'library' ? page : 0,

    limit: 20

  });



  // Subscribed Channels (for the "Subscribed" tab — shows channels, not books)

  const { data: subscribedChannels = [] } = useQuery({

    queryKey: ["subscribed-channels", user?.id, "books"],

    queryFn: async () => {

      if (!user?.id) return [];

      const { data: subs } = await (supabase as any)

        .from("subscriptions")

        .select("channel_id")

        .eq("user_id", user.id);

      if (!subs || subs.length === 0) return [];

      const ids = subs.map((s: any) => s.channel_id);

      const { data } = await (supabase as any)

        .from("channels")

        .select("*")

        .in("id", ids)

        .eq("channel_type", "books")

        .order("subscribers_count", { ascending: false });

      return data || [];

    },

    enabled: !!user?.id,

  });



  // Fetch reading history (Keep existing logic, maybe move to hook later)

  const { data: readingHistory = [] } = useQuery({

    queryKey: ["reading-history", user?.id],

    queryFn: async () => {

      if (!user?.id) return [];



      const { data } = await (supabase as any)

        .from("book_reading_progress")

        .select(`

          id, current_page, total_pages, completed, last_read_at,

          book:books(*, channel:channels!books_channel_id_fkey(id, name, avatar_url, user_id))

        `)

        .eq("user_id", user.id)

        .order("last_read_at", { ascending: false })

        .limit(20);



      return data || [];

    },

    enabled: !!user?.id,

  });



  const categories = [

    { name: "All", icon: Grid },

    ...BOOK_CATEGORIES.map(cat => ({ name: cat, icon: Book }))

  ];



  const handleTabChange = (value: string) => {

    setActiveTab(value);

    setPage(0); // Reset pagination on tab change

  };



  const renderPagination = (itemsCount: number) => {

    if (itemsCount === 0 && page === 0) return null;



    return (

      <div className="flex items-center justify-center gap-4 mt-6">

        <Button

          variant="outline"

          onClick={() => setPage(p => Math.max(0, p - 1))}

          disabled={page === 0}

        >

          Previous

        </Button>

        <span className="text-sm text-muted-foreground">Page {page + 1}</span>

        <Button

          variant="outline"

          onClick={() => setPage(p => p + 1)}

          disabled={itemsCount < 20}

        >

          Next

        </Button>

      </div>

    );

  };



  return (

    <div className="min-h-screen bg-gradient-subtle pb-20">

      {/* Header */}

      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">

          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-2">

              <img

                src="/sha-verse-logo.jpeg"

                alt="Sha-Verse"

                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"

              />

              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">

                Bookshelf

              </h1>

            </div>



            <div className="flex-1 max-w-md hidden sm:block">

              <div className="relative">

                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                <Input

                  placeholder="Search books or authors..."

                  value={searchQuery}

                  onChange={(e) => {

                    setSearchQuery(e.target.value);

                    setPage(0); // Reset page on search

                  }}

                  className="pl-10"

                />

              </div>

            </div>



            <div className="flex items-center gap-3">

              {userChannel ? (

                <>

                  <Button

                    onClick={() => setShowUploadDialog(true)}

                    size="icon"

                    variant="ghost"

                    className="rounded-full w-9 h-9 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"

                  >

                    <Plus className="w-5 h-5" />

                  </Button>



                  <div

                    className="relative cursor-pointer group"

                    onClick={() => navigate(`/bookshelf/channel/${userChannel.id}`)}

                  >

                    <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full opacity-75 group-hover:opacity-100 blur-[2px] transition duration-200"></div>

                    <Avatar className="w-9 h-9 border-2 border-background relative">

                      <AvatarImage src={userChannel.avatar_url || ""} className="object-cover" />

                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs">

                        {userChannel.name.charAt(0)}

                      </AvatarFallback>

                    </Avatar>

                  </div>

                </>

              ) : (

                <Button onClick={() => setShowCreateChannelDialog(true)} size="sm" className="bg-gradient-primary text-white border-0">

                  <Plus className="w-4 h-4 mr-1" />

                  Become an Author

                </Button>

              )}

            </div>

          </div>



          {/* Mobile Search */}

          <div className="mt-3 sm:hidden">

            <div className="relative">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

              <Input

                placeholder="Search books..."

                value={searchQuery}

                onChange={(e) => {

                  setSearchQuery(e.target.value);

                  setPage(0);

                }}

                className="pl-10"

              />

            </div>

          </div>

        </div>

      </header>



      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">

        {/* Category Tabs */}

        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">

          {categories.map((cat) => (

            <Button

              key={cat.name}

              variant={selectedCategory === cat.name ? "default" : "outline"}

              size="sm"

              className="flex-shrink-0"

              onClick={() => {

                setSelectedCategory(cat.name);

                setPage(0);

              }}

            >

              <cat.icon className="w-4 h-4 mr-1" />

              {cat.name}

            </Button>

          ))}

        </div>



        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">

          <TabsList className="grid grid-cols-4 w-full max-w-md">

            <TabsTrigger value="discover">Discover</TabsTrigger>

            <TabsTrigger value="trending">Trending</TabsTrigger>

            <TabsTrigger value="subscribed">Subscribed</TabsTrigger>

            <TabsTrigger value="library">Library</TabsTrigger>

          </TabsList>



          <TabsContent value="discover" className="space-y-6">

            {/* Recently Added (now FIRST) */}

            <section>

              <div className="flex items-center justify-between mb-4">

                <h2 className="text-lg font-semibold flex items-center gap-2">

                  <Clock className="w-5 h-5 text-primary" />

                  Recently Added

                </h2>

                <div className="flex items-center gap-2">

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



              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">

                {books.flatMap((book, idx) => {

                  const node = <BookCard key={book.id} book={book} />;

                  // 📚 Native book-shaped ad every 4 books

                  if ((idx + 1) % 4 === 0) {

                    return [node, <SponsoredBookCard key={`ad-recent-${book.id}`} />];

                  }

                  return [node];

                })}

              </div>



              {isLoading && (

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 mt-3">

                  {[1, 2, 3, 4, 5, 6].map((i) => (

                    <Card key={i} className="overflow-hidden animate-pulse">

                      <div className="aspect-[2/3] bg-muted" />

                      <div className="p-3 space-y-2">

                        <div className="h-4 bg-muted rounded" />

                        <div className="h-3 bg-muted rounded w-2/3" />

                      </div>

                    </Card>

                  ))}

                </div>

              )}



              {!isLoading && books.length === 0 && (

                <Card className="p-8 text-center">

                  <Book className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />

                  <h3 className="font-semibold mb-2">No books found</h3>

                  <p className="text-muted-foreground text-sm">

                    {searchQuery ? "Try a different search term" : "Be the first to upload a book!"}

                  </p>

                </Card>

              )}



              {renderPagination(books.length)}

            </section>



            {/* Trending Books (now SECOND) */}

            <section>

              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">

                <TrendingUp className="w-5 h-5 text-primary" />

                Trending Books

              </h2>



              {viewMode === "grid" ? (

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">

                  {trendingBooks.slice(0, 12).flatMap((book, idx) => {

                    const card = <BookCard key={book.id} book={book} />;

                    // 📚 Inject Sponsored Book (book-shaped native ad) every 4 books
                    if ((idx + 1) % 4 === 0) {

                      return [

                        card,

                        <SponsoredBookCard key={`sponsored-${book.id}`} />

                      ];

                    }

                    return [card];

                  })}

                </div>

              ) : (

                <div className="space-y-3">

                  {trendingBooks.slice(0, 10).map((book) => (

                    <Card

                      key={book.id}

                      className="p-4 flex gap-4 hover:shadow-md transition-shadow cursor-pointer"

                    >

                      <div className="w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-primary">

                        {book.cover_url ? (

                          <img

                            src={book.cover_url}

                            alt={book.title}

                            className="w-full h-full object-cover"

                          />

                        ) : (

                          <div className="w-full h-full flex items-center justify-center">

                            <Book className="w-8 h-8 text-white" />

                          </div>

                        )}

                      </div>

                      <div className="flex-1 min-w-0">

                        <h3 className="font-semibold line-clamp-1">{book.title}</h3>

                        <p className="text-sm text-muted-foreground">{book.author}</p>

                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">

                          {book.description || "No description"}

                        </p>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">

                          <span className="flex items-center gap-1">

                            <Eye className="w-3 h-3" />

                            {book.views_count || 0}

                          </span>

                          <span className="flex items-center gap-1">

                            <ThumbsUp className="w-3 h-3" />

                            {book.likes_count || 0}

                          </span>

                          <span className="flex items-center gap-1">

                            <MessageCircle className="w-3 h-3" />

                            {book.comments_count || 0}

                          </span>

                        </div>

                      </div>

                    </Card>

                  ))}

                </div>

              )}

            </section>



            {/* Popular Authors */}

            <section>

              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">

                <Users className="w-5 h-5 text-primary" />

                Popular Authors

              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">

                {channels?.slice(0, 6).map((channel) => (

                  <Card

                    key={channel.id}

                    className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer"

                    onClick={() => navigate(`/bookshelf/channel/${channel.id}`)}

                  >

                    <Avatar className="w-16 h-16 mx-auto mb-2">

                      <AvatarImage src={channel.avatar_url || ""} />

                      <AvatarFallback>{channel.name.charAt(0)}</AvatarFallback>

                    </Avatar>

                    <h3 className="font-semibold text-sm line-clamp-1">{channel.name}</h3>

                    <p className="text-xs text-muted-foreground">

                      {channel.subscribers_count || 0} subscribers

                    </p>

                    <Badge variant="secondary" className="mt-2 text-xs">

                      Author

                    </Badge>

                  </Card>

                ))}

              </div>

            </section>

          </TabsContent>



          <TabsContent value="trending" className="space-y-6">

            {trendingBooks.length > 0 ? (

              <section>

                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">

                  <TrendingUp className="w-5 h-5 text-primary" />

                  Trending Books

                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">

                  {trendingBooks.flatMap((book, idx) => {

                    const card = <BookCard key={book.id} book={book} />;

                    if ((idx + 1) % 4 === 0) {

                      return [card, <SponsoredBookCard key={`trending-ad-${book.id}`} />];

                    }

                    return [card];

                  })}

                </div>

              </section>

            ) : (

              <Card className="p-8 text-center">

                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />

                <h3 className="font-semibold mb-2">No trending books in this category</h3>

                <p className="text-muted-foreground text-sm">Try selecting a different category</p>

              </Card>

            )}



            {/* Trending Author Channels */}

            {channels && channels.length > 0 && (

              <section>

                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">

                  <Users className="w-5 h-5 text-primary" />

                  Trending Author Channels

                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">

                  {channels.slice(0, 12).map((channel) => (

                    <Card

                      key={channel.id}

                      className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer"

                      onClick={() => navigate(`/bookshelf/channel/${channel.id}`)}

                    >

                      <Avatar className="w-16 h-16 mx-auto mb-2">

                        <AvatarImage src={channel.avatar_url || ""} />

                        <AvatarFallback>{channel.name.charAt(0)}</AvatarFallback>

                      </Avatar>

                      <h3 className="font-semibold text-sm line-clamp-1">{channel.name}</h3>

                      <p className="text-xs text-muted-foreground">

                        {channel.subscribers_count || 0} subscribers

                      </p>

                      <Badge variant="secondary" className="mt-2 text-xs">

                        Author

                      </Badge>

                    </Card>

                  ))}

                </div>

              </section>

            )}

          </TabsContent>



          <TabsContent value="subscribed">

            {subscribedBooks.length > 0 ? (

              <>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">

                  {subscribedBooks.map((book: any) => (

                    <BookCard key={book.id} book={book} />

                  ))}

                </div>

                {renderPagination(subscribedBooks.length)}

              </>

            ) : (

              <Card className="p-8 text-center">

                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />

                <h3 className="font-semibold mb-2">No Subscriptions Yet</h3>

                <p className="text-muted-foreground text-sm mb-4">

                  Subscribe to authors to see their books here

                </p>

                <Button onClick={() => setActiveTab("discover")}>

                  Discover Authors

                </Button>

              </Card>

            )}

          </TabsContent>



          <TabsContent value="library" className="space-y-6">

            {/* Saved Books Section */}

            <section>

              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">

                <Heart className="w-5 h-5 text-primary" />

                Saved Books ({savedBooks.length})

              </h2>

              {savedBooks.length > 0 ? (

                <>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">

                    {savedBooks.map((book: any) => (

                      <BookCard key={book.id} book={book} />

                    ))}

                  </div>

                  {renderPagination(savedBooks.length)}

                </>

              ) : (

                <Card className="p-6 text-center">

                  <Heart className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />

                  <p className="text-muted-foreground text-sm">No saved books yet</p>

                </Card>

              )}

            </section>



            {/* Reading History Section */}

            <section>

              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">

                <BookOpen className="w-5 h-5 text-primary" />

                Continue Reading

              </h2>

              {readingHistory.length > 0 ? (

                <div className="space-y-3">

                  {readingHistory.map((item: any) => item.book && (

                    <Card

                      key={item.id}

                      className="p-4 flex gap-4 hover:shadow-md transition-shadow cursor-pointer"

                      onClick={() => {

                        if (item.book.book_url) {

                          window.open(item.book.book_url, "_blank");

                        }

                      }}

                    >

                      <div className="w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-primary">

                        {item.book.cover_url ? (

                          <img src={item.book.cover_url} alt={item.book.title} className="w-full h-full object-cover" />

                        ) : (

                          <div className="w-full h-full flex items-center justify-center">

                            <Book className="w-6 h-6 text-white" />

                          </div>

                        )}

                      </div>

                      <div className="flex-1 min-w-0">

                        <h3 className="font-semibold line-clamp-1">{item.book.title}</h3>

                        <p className="text-sm text-muted-foreground">{item.book.author}</p>

                        <div className="mt-2">

                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">

                            <span>Page {item.current_page || 1} of {item.total_pages || item.book.pages || 100}</span>

                            <span>{Math.round(((item.current_page || 1) / (item.total_pages || item.book.pages || 100)) * 100)}%</span>

                          </div>

                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">

                            <div

                              className="h-full bg-primary rounded-full transition-all"

                              style={{ width: `${((item.current_page || 1) / (item.total_pages || item.book.pages || 100)) * 100}%` }}

                            />

                          </div>

                        </div>

                        <p className="text-xs text-muted-foreground mt-2">

                          Last read {item.last_read_at ? formatDistanceToNow(new Date(item.last_read_at), { addSuffix: true }) : "recently"}

                        </p>

                      </div>

                      <Button size="sm" variant="outline">Continue</Button>

                    </Card>

                  ))}

                </div>

              ) : (

                <Card className="p-6 text-center">

                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />

                  <p className="text-muted-foreground text-sm">Start reading to see your history</p>

                </Card>

              )}

            </section>

          </TabsContent>

        </Tabs>

      </div>



      {/* Dialogs */}

      <UploadBookDialog

        open={showUploadDialog}

        onOpenChange={setShowUploadDialog}

        channelId={userChannel?.id || ""}

      />



      <CreateAuthorChannelDialog

        open={showCreateChannelDialog}

        onOpenChange={setShowCreateChannelDialog}

      />

    </div >

  );

};



export default Bookshelf;

