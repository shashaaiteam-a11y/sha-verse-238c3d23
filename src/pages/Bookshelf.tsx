import { useState } from "react";
import { SEO } from "@/components/seo/SEO";

import { useNavigate } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import { Book, Plus, Search, TrendingUp, Clock, Users, Grid, List, BookOpen, Heart, ChevronDown, ChevronUp, X } from "lucide-react";

import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Badge } from "@/components/ui/badge";

import { useBooks } from "@/hooks/useBooks";

import { useChannels } from "@/hooks/useChannels";

import { useSavedBooks, useSubscribedBookChannels, useVisibleBookChannels } from "@/hooks/useBookFeeds";

import { useAuth } from "@/contexts/AuthContext";

import { supabase } from "@/integrations/supabase/client";

import UploadBookDialog from "@/components/bookshelf/UploadBookDialog";

import CreateAuthorChannelDialog from "@/components/bookshelf/CreateAuthorChannelDialog";

import BookCard from "@/components/bookshelf/BookCard";

import { formatDistanceToNow } from "date-fns";

import { BOOK_CATEGORIES } from "@/lib/constants/bookshelf";

import { SponsoredBookCard } from "@/components/ads";
import AppLogoStatusRing from "@/components/promotions/AppLogoStatusRing";
import { BOOK_PUBLIC_COLUMNS } from "@/lib/constants/bookshelf";



const Bookshelf = () => {

  const navigate = useNavigate();

  const { user } = useAuth();



  // Independent pagination states for different tabs could be better, 

  // but to keep UI simple we'll reset page on tab switch.

  const [activeTab, setActiveTab] = useState("discover");

  const [page, setPage] = useState(0);



  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [searchQuery, setSearchQuery] = useState("");
  const [copyrightOpen, setCopyrightOpen] = useState(false);

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

  // Hide seed-only demo author channels from public author listings
  // (non-destructive — see useVisibleBookChannels / HIDE_SEED_BOOKS).
  const visibleChannels = useVisibleBookChannels(channels);



  // Get user's book channel

  const userChannel = channels?.find((c) => c.user_id === user?.id);



  // (Subscribed tab now shows channels, not books — see useSubscribedBookChannels below)

  // Saved Books (Server-Side Filtered & Paginated)

  const { data: savedBooks = [] } = useSavedBooks({

    search: searchQuery,

    category: selectedCategory,

    page: activeTab === 'library' ? page : 0,

    limit: 20

  });

  // Subscribed book channels (for Subscribed tab)
  const { data: subscribedChannels = [] } = useSubscribedBookChannels();



  // Fetch reading history (Keep existing logic, maybe move to hook later)

  const { data: readingHistory = [] } = useQuery({

    queryKey: ["reading-history", user?.id],

    queryFn: async () => {

      if (!user?.id) return [];



      const { data } = await (supabase as any)

        .from("book_reading_progress")

        .select(`

          id, current_page, total_pages, completed, last_read_at,

          book:books(${BOOK_PUBLIC_COLUMNS}, channel:channels!books_channel_id_fkey(id, name, avatar_url, user_id))

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

  // Interleaves a SponsoredBookCard (book-shaped native ad) every `every` items.
  const renderBooksWithAds = (items: any[], every = 4, keyPrefix = "ad") => {
    return items.flatMap((book, idx) => {
      const card = <BookCard key={book.id} book={book} />;
      if ((idx + 1) % every === 0 && idx !== items.length - 1) {
        return [card, <SponsoredBookCard key={`${keyPrefix}-${book.id}`} />];
      }
      return [card];
    });
  };



  return (

    <div className="min-h-screen bg-gradient-subtle pb-20">

      <SEO
        title="Bookshelf — Read & Share Books on Sha-Verse"
        description="Discover, read, and share books on the Sha-Verse Bookshelf. Browse author channels, track reading progress, and build your library."
        path="/bookshelf"
      />


      {/* Header */}

      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">

          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-2">

              <AppLogoStatusRing
                src="/sha-verse-logo.jpeg"
                alt="Sha-Verse"
                size="w-7 h-7 sm:w-8 sm:h-8"
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

        {/* Copyright Warning - Collapsible */}
        <div
          role="alert"
          className="mb-4 rounded-lg border-2 border-destructive/40 bg-destructive/10 dark:bg-destructive/15 shadow-sm overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setCopyrightOpen((v) => !v)}
            aria-expanded={copyrightOpen}
            aria-controls="copyright-warning-body"
            className="w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 text-left hover:bg-destructive/5 transition-colors"
          >
            <span aria-hidden className="text-lg sm:text-xl leading-none">⚠️</span>
            <h3 className="flex-1 font-bold text-destructive text-sm sm:text-base">
              Copyright Warning
            </h3>
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-destructive/20 text-destructive shrink-0"
              aria-hidden
            >
              {copyrightOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>
          {copyrightOpen && (
            <div id="copyright-warning-body" className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0">
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                Uploading or sharing copyrighted books without proper authorization is strictly prohibited on{" "}
                <strong>SHA-VERSE</strong>. Any violation may result in immediate permanent suspension of the account
                and legal action in accordance with the copyright laws and regulations applicable in the user's
                respective country.
              </p>
            </div>
          )}
        </div>

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

          <TabsList
            data-no-swipe-nav="true"
            className="grid grid-cols-4 w-full max-w-md relative z-10"
          >

            <TabsTrigger value="discover" data-no-swipe-nav="true">Discover</TabsTrigger>

            <TabsTrigger value="trending" data-no-swipe-nav="true">Trending</TabsTrigger>

            <TabsTrigger value="subscribed" data-no-swipe-nav="true">Subscribed</TabsTrigger>

            <TabsTrigger value="library" data-no-swipe-nav="true">Library</TabsTrigger>

          </TabsList>



          <TabsContent value="discover" className="space-y-6">

            {/* 1️⃣ Recently Added (now FIRST) */}
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

              {viewMode === "grid" ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
                  {renderBooksWithAds(books, 4, "recent-ad")}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {books.map((book) => (
                    <Card
                      key={book.id}
                      className="p-3 flex gap-3 items-center hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/bookshelf/book/${book.id}`)}
                    >
                      <div className="w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-gradient-primary">
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Book className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm line-clamp-1">{book.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {(book.views_count || 0)} views{book.pages ? ` • ${book.pages} pages` : ""}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {isLoading && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3 mt-4">
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

            {/* 2️⃣ Trending Books */}
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Trending Books
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
                {renderBooksWithAds(trendingBooks.slice(0, 12), 4, "trend-ad")}
              </div>
            </section>

            {/* 3️⃣ Popular Authors (Channels) */}
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Popular Authors
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {visibleChannels?.slice(0, 6).map((channel) => (
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

            {/* Trending Books with native ads every 4 */}
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Trending Books
              </h2>
              {trendingBooks.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
                  {renderBooksWithAds(trendingBooks, 4, "trending-tab-ad")}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No trending books in this category</h3>
                  <p className="text-muted-foreground text-sm">Try selecting a different category</p>
                </Card>
              )}
            </section>

            {/* Trending Author Channels */}
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Trending Author Channels
              </h2>
              {visibleChannels && visibleChannels.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {visibleChannels.slice(0, 12).map((channel) => (
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
              ) : (
                <Card className="p-6 text-center">
                  <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">No author channels yet</p>
                </Card>
              )}
            </section>

          </TabsContent>



          <TabsContent value="subscribed">

            {subscribedChannels.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {subscribedChannels.map((channel: any) => (
                  <Card
                    key={channel.id}
                    className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/bookshelf/channel/${channel.id}`)}
                  >
                    <Avatar className="w-16 h-16 mx-auto mb-2">
                      <AvatarImage src={channel.avatar_url || ""} />
                      <AvatarFallback>{channel.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-sm line-clamp-1">{channel.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {channel.subscribers_count || 0} subscribers
                    </p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Subscribed
                    </Badge>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No Subscriptions Yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Subscribe to author channels to see them here
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

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">

                    {renderBooksWithAds(savedBooks, 4, "saved-ad")}

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

