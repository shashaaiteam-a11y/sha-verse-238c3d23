import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBookInteractions } from "@/hooks/useBookInteractions";
import { useReaderBookmarks } from "@/hooks/useReaderBookmarks";
import PDFViewer, { PDFOutlineItem } from "@/components/bookshelf/PDFViewer";
import EPUBViewer, { TocItem } from "@/components/bookshelf/EPUBViewer";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Moon, Sun, Bookmark, BookmarkCheck, Settings,
  ZoomIn, ZoomOut, Book, List, X, FileText, Type, Minus, Plus, Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StickyBannerAd, BookReaderInlineAd } from "@/components/ads";

type ReaderTheme = "light" | "dark" | "sepia";

const getFileType = (url: string | null): "pdf" | "epub" | "unknown" => {
  if (!url) return "unknown";
  const lowerUrl = url.toLowerCase();
  // Strip query params for extension check
  const pathOnly = lowerUrl.split("?")[0];
  if (pathOnly.endsWith(".epub")) return "epub";
  if (pathOnly.endsWith(".pdf")) return "pdf";
  // Check within URL path segments for format hints
  if (lowerUrl.includes(".epub")) return "epub";
  if (lowerUrl.includes(".pdf")) return "pdf";
  // Default: treat storage URLs as PDF (most common), otherwise unknown
  if (lowerUrl.includes("/storage/v1/object/")) return "pdf";
  return "unknown";
};

const THEME_COLORS: Record<ReaderTheme, { bg: string; text: string; headerBg: string }> = {
  light: { bg: "bg-amber-50", text: "text-zinc-900", headerBg: "bg-white/95" },
  dark: { bg: "bg-zinc-900", text: "text-zinc-100", headerBg: "bg-zinc-800/95" },
  sepia: { bg: "bg-[#f4ecd8]", text: "text-[#5b4636]", headerBg: "bg-[#e8dcc8]/95" },
};

const BookReader = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const epubRef = useRef<HTMLDivElement>(null);
  const lastSavedProgressRef = useRef<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [theme, setTheme] = useState<ReaderTheme>("light");
  const [showControls, setShowControls] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [pdfOutline, setPdfOutline] = useState<PDFOutlineItem[]>([]);
  const [epubToc, setEpubToc] = useState<TocItem[]>([]);
  const [scale, setScale] = useState(1.5);
  const [epubCfi, setEpubCfi] = useState<string | undefined>();

  // 📖 Inline reader-ad state — every 4 pages, skip first 2 + last
  const [adKey, setAdKey] = useState(0);
  const [adDismissedFor, setAdDismissedFor] = useState<number | null>(null);

  const { data: book, isLoading } = useQuery({
    queryKey: ["book", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", bookId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookId,
  });

  const { readingProgress, updateProgress } = useBookInteractions(bookId);
  const { bookmarks, addBookmark, removeBookmark, isPageBookmarked, getBookmarkForPage } = useReaderBookmarks(bookId);
  const saveProgressRef = useRef(updateProgress.mutate);

  const fileType = getFileType(book?.book_url);
  const colors = THEME_COLORS[theme];

  useEffect(() => {
    saveProgressRef.current = updateProgress.mutate;
  }, [updateProgress.mutate]);

  // Load saved progress
  useEffect(() => {
    const savedPage = readingProgress?.current_page;
    const savedTotalPages = readingProgress?.total_pages;

    if (savedPage && savedPage > 0) {
      setCurrentPage(savedPage);
    }

    if (savedTotalPages && savedTotalPages > 0) {
      setTotalPages(savedTotalPages);
    }

    if (savedPage && savedTotalPages) {
      lastSavedProgressRef.current = `${savedPage}:${savedTotalPages}`;
    }
  }, [readingProgress]);

  useEffect(() => {
    if (!totalPages && book?.pages && book.pages > 0) {
      setTotalPages(book.pages);
    }
  }, [book?.pages, totalPages]);

  // Save progress without creating a refetch loop
  useEffect(() => {
    if (!bookId || currentPage < 1 || totalPages < 1) return;

    const progressKey = `${currentPage}:${totalPages}`;
    if (lastSavedProgressRef.current === progressKey) return;

    const timeout = window.setTimeout(() => {
      if (lastSavedProgressRef.current === progressKey) return;
      lastSavedProgressRef.current = progressKey;
      saveProgressRef.current({ currentPage, totalPages });
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [currentPage, totalPages, bookId]);

  // Increment view count
  useEffect(() => {
    if (bookId) {
      void (supabase as any).rpc("increment_book_views", { book_id: bookId });
    }
  }, [bookId]);

  // 📖 Re-mount the inline ad whenever the user lands on a "trigger" page,
  // so a fresh creative is fetched each time.
  useEffect(() => {
    setAdKey((k) => k + 1);
    // Reset dismissal when user moves to a new trigger page
    if (adDismissedFor !== null && adDismissedFor !== currentPage) {
      setAdDismissedFor(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // 📖 Compute whether the current page is an ad-eligible page.
  // Rules (from strategy):
  //   - First 2 pages → NO ADS
  //   - Last page → NO ADS
  //   - Every 4 pages thereafter → INLINE AD
  //   - Every ~10% milestone → CHAPTER-END style (HIGH-MONEY spot)
  const isInlineAdPage =
    totalPages > 6 &&
    currentPage > 2 &&
    currentPage < totalPages &&
    (currentPage - 2) % 4 === 0;

  const isChapterEndAdPage =
    totalPages > 12 &&
    currentPage > 4 &&
    currentPage < totalPages &&
    Math.abs((currentPage / totalPages) * 10 - Math.round((currentPage / totalPages) * 10)) < 0.05 &&
    Math.round((currentPage / totalPages) * 10) % 2 === 0; // every ~20%

  const showReaderAd = (isInlineAdPage || isChapterEndAdPage) && adDismissedFor !== currentPage;

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const handleTotalPagesChange = useCallback((pages: number) => {
    setTotalPages(pages);
  }, []);

  const handleOutlineExtracted = useCallback((outline: PDFOutlineItem[]) => {
    setPdfOutline(outline);
  }, []);

  const handleEpubTocExtracted = useCallback((toc: TocItem[]) => {
    setEpubToc(toc);
  }, []);

  const handleEpubLocationChange = useCallback((cfi: string, page: number, total: number) => {
    setEpubCfi(cfi);
    setCurrentPage(page);
    setTotalPages(total);
  }, []);

  const toggleControls = () => setShowControls((prev) => !prev);

  // Auto-hide controls after 3s of inactivity
  useEffect(() => {
    if (!showControls) return;
    const timer = window.setTimeout(() => setShowControls(false), 3000);
    return () => window.clearTimeout(timer);
  }, [showControls, currentPage]);

  // Keyboard navigation (desktop): ArrowLeft/Right to flip, Escape to toggle controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (fileType === "epub") epubPrev();
        else setCurrentPage((p) => Math.max(1, p - 1));
        setShowControls(true);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (fileType === "epub") epubNext();
        else setCurrentPage((p) => (totalPages > 0 ? Math.min(totalPages, p + 1) : p + 1));
        setShowControls(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowControls((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileType, totalPages]);

  const handleBookmarkToggle = () => {
    if (isPageBookmarked(currentPage)) {
      const bm = getBookmarkForPage(currentPage);
      if (bm) removeBookmark.mutate(bm.id);
    } else {
      addBookmark.mutate({
        location: fileType === "epub" && epubCfi ? { cfi: epubCfi } : { page: currentPage },
        label: `Page ${currentPage}`,
      });
    }
  };

  // EPUB navigation
  const epubNext = () => {
    const el = epubRef.current;
    if (el && (el as any).__epubMethods) {
      (el as any).__epubMethods.nextPage();
    }
  };
  const epubPrev = () => {
    const el = epubRef.current;
    if (el && (el as any).__epubMethods) {
      (el as any).__epubMethods.prevPage();
    }
  };
  const epubGoToHref = (href: string) => {
    const el = epubRef.current;
    if (el && (el as any).__epubMethods) {
      (el as any).__epubMethods.goToHref(href);
    }
  };
  const epubGoToCfi = (cfi: string) => {
    const el = epubRef.current;
    if (el && (el as any).__epubMethods) {
      (el as any).__epubMethods.goToCfi(cfi);
    }
  };

  const renderOutlineItems = (items: PDFOutlineItem[], depth = 0) => {
    return items.map((item, index) => (
      <div key={`${item.title}-${index}`}>
        <Button
          variant="ghost"
          className="w-full justify-start text-left"
          style={{ paddingLeft: `${16 + depth * 16}px` }}
          onClick={() => { goToPage(item.pageNumber); setShowToc(false); }}
        >
          <span className="truncate">{item.title}</span>
          <span className="ml-auto text-xs text-muted-foreground">p.{item.pageNumber}</span>
        </Button>
        {item.items && item.items.length > 0 && renderOutlineItems(item.items, depth + 1)}
      </div>
    ));
  };

  const renderEpubTocItems = (items: TocItem[], depth = 0) => {
    return items.map((item, index) => (
      <div key={`${item.label}-${index}`}>
        <Button
          variant="ghost"
          className="w-full justify-start text-left"
          style={{ paddingLeft: `${16 + depth * 16}px` }}
          onClick={() => { epubGoToHref(item.href); setShowToc(false); }}
        >
          <span className="truncate">{item.label}</span>
        </Button>
        {item.subitems && item.subitems.length > 0 && renderEpubTocItems(item.subitems, depth + 1)}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Book className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold">Book not found</h1>
        <Button variant="link" onClick={() => navigate("/bookshelf")}>Back to Bookshelf</Button>
      </div>
    );
  }

  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  const isCurrentPageBookmarked = isPageBookmarked(currentPage);

  return (
    <div
      className={cn("fixed inset-0 w-screen h-screen overflow-hidden transition-colors duration-300", colors.bg, colors.text)}
      onClick={toggleControls}
    >
      {/* Top Bar */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-transform duration-300",
          colors.headerBg, "backdrop-blur-sm border-b",
          showControls ? "translate-y-0" : "-translate-y-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="hidden sm:block">
              <h1 className="font-semibold truncate max-w-[200px]">{book.title}</h1>
              <p className="text-xs text-muted-foreground">{book.author} · {progressPercent}%</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {fileType === "pdf" && (
              <>
                <Button variant="ghost" size="icon" onClick={() => setScale(prev => Math.max(prev - 0.25, 0.5))}>
                  <ZoomOut className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setScale(prev => Math.min(prev + 0.25, 3))}>
                  <ZoomIn className="w-5 h-5" />
                </Button>
              </>
            )}

            {/* Bookmark Toggle */}
            <Button variant="ghost" size="icon" onClick={handleBookmarkToggle}>
              {isCurrentPageBookmarked ? (
                <BookmarkCheck className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </Button>

            {/* TOC */}
            <Button variant="ghost" size="icon" onClick={() => { setShowToc(!showToc); setShowBookmarks(false); }}>
              <List className="w-5 h-5" />
            </Button>

            {/* Bookmarks List */}
            <Button variant="ghost" size="icon" onClick={() => { setShowBookmarks(!showBookmarks); setShowToc(false); }}>
              <Bookmark className="w-5 h-5" />
            </Button>

            {/* Settings */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Reading Settings</SheetTitle>
                </SheetHeader>
                <div className="py-6 space-y-6">
                  {/* Theme */}
                  <div>
                    <label className="text-sm font-medium mb-3 block flex items-center gap-2">
                      <Palette className="w-4 h-4" /> Theme
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        onClick={() => setTheme("light")}
                        className="px-2"
                      >
                        <Sun className="w-4 h-4 shrink-0" />
                        <span className="hidden sm:inline ml-1 text-xs">Light</span>
                      </Button>
                      <Button
                        variant={theme === "sepia" ? "default" : "outline"}
                        onClick={() => setTheme("sepia")}
                        className="px-2"
                        style={theme === "sepia" ? { backgroundColor: "#d4a574", color: "#3d2b1f" } : {}}
                      >
                        <Type className="w-4 h-4 shrink-0" />
                        <span className="hidden sm:inline ml-1 text-xs">Sepia</span>
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        onClick={() => setTheme("dark")}
                        className="px-2"
                      >
                        <Moon className="w-4 h-4 shrink-0" />
                        <span className="hidden sm:inline ml-1 text-xs">Dark</span>
                      </Button>
                    </div>
                  </div>

                  {/* Font Size (EPUB only) */}
                  {fileType === "epub" && (
                    <div>
                      <label className="text-sm font-medium mb-3 block flex items-center gap-2">
                        <Type className="w-4 h-4" /> Font Size: {fontSize}px
                      </label>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setFontSize(prev => Math.max(prev - 2, 10))}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Slider
                          value={[fontSize]}
                          onValueChange={(v) => setFontSize(v[0])}
                          min={10}
                          max={32}
                          step={1}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setFontSize(prev => Math.min(prev + 2, 32))}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Zoom (PDF only) */}
                  {fileType === "pdf" && (
                    <div>
                      <label className="text-sm font-medium mb-3 block">Zoom: {Math.round(scale * 100)}%</label>
                      <div className="flex items-center gap-4">
                        <ZoomOut className="w-4 h-4" />
                        <Slider
                          value={[scale * 100]}
                          onValueChange={(v) => setScale(v[0] / 100)}
                          min={50}
                          max={300}
                          step={25}
                        />
                        <ZoomIn className="w-4 h-4" />
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Go to Page */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Go to Page</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={currentPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value) || 1;
                          goToPage(page);
                        }}
                        min={1}
                        max={Math.max(totalPages, 1)}
                        className="w-20 px-3 py-2 border rounded-md text-center bg-background"
                      />
                      <span className="text-muted-foreground">of {totalPages}</span>
                    </div>
                  </div>

                  {/* Reading Progress */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Progress</label>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-primary h-3 rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{progressPercent}% complete</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Table of Contents Sidebar */}
      {showToc && (
        <div
          className={cn(
            "fixed top-0 left-0 bottom-0 w-72 z-50 border-r shadow-lg",
            theme === "dark" ? "bg-zinc-800" : theme === "sepia" ? "bg-[#e8dcc8]" : "bg-white"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Table of Contents</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowToc(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="p-2">
              {fileType === "epub" && epubToc.length > 0 ? (
                renderEpubTocItems(epubToc)
              ) : pdfOutline.length > 0 ? (
                renderOutlineItems(pdfOutline)
              ) : (
                <>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { goToPage(1); setShowToc(false); }}>
                    <FileText className="w-4 h-4 mr-2" /> Start (Page 1)
                  </Button>
                  {totalPages > 10 && (
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { goToPage(Math.floor(totalPages * 0.25)); setShowToc(false); }}>
                      <FileText className="w-4 h-4 mr-2" /> 25% (Page {Math.floor(totalPages * 0.25)})
                    </Button>
                  )}
                  {totalPages > 5 && (
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { goToPage(Math.floor(totalPages * 0.5)); setShowToc(false); }}>
                      <FileText className="w-4 h-4 mr-2" /> Middle (Page {Math.floor(totalPages * 0.5)})
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { goToPage(totalPages); setShowToc(false); }}>
                    <FileText className="w-4 h-4 mr-2" /> End (Page {totalPages})
                  </Button>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Bookmarks Sidebar */}
      {showBookmarks && (
        <div
          className={cn(
            "fixed top-0 right-0 bottom-0 w-72 z-50 border-l shadow-lg",
            theme === "dark" ? "bg-zinc-800" : theme === "sepia" ? "bg-[#e8dcc8]" : "bg-white"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Bookmarks ({bookmarks.length})</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowBookmarks(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="p-2 space-y-1">
              {bookmarks.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No bookmarks yet. Tap the bookmark icon to add one.
                </p>
              ) : (
                bookmarks.map((bm) => (
                  <div key={bm.id} className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      className="flex-1 justify-start text-left"
                      onClick={() => {
                        if (bm.location?.page) {
                          goToPage(bm.location.page);
                        } else if (bm.location?.cfi) {
                          epubGoToCfi(bm.location.cfi);
                        }
                        setShowBookmarks(false);
                      }}
                    >
                      <BookmarkCheck className="w-4 h-4 mr-2 text-yellow-500" />
                      <span className="truncate">{bm.label || `Page ${bm.location?.page || '?'}`}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeBookmark.mutate(bm.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* 📖 Inline Reader Ad — appears at the top of the reading area on
          ad-eligible pages (every 4 pages, skipping first 2 + last). It sits
          above the viewer so it never breaks paragraph flow inside the document. */}
      {showReaderAd && (
        <div
          className={cn(
            "fixed left-0 right-0 z-40 pointer-events-none transition-transform duration-300",
            showControls ? "top-14" : "top-0"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pointer-events-auto">
            <BookReaderInlineAd
              key={`reader-ad-${adKey}`}
              variant={isChapterEndAdPage ? "chapter_end" : "inline"}
              theme={theme}
              onDismiss={() => setAdDismissedFor(currentPage)}
            />
          </div>
        </div>
      )}

      {/* Main Content — edge-to-edge, fills the screen between header & footer.
          Uses CSS env to compute exact available height so the book truly
          occupies all space (mobile / tablet / desktop). */}
      <main
        className={cn(
          "absolute inset-x-0 flex overflow-hidden transition-[top,bottom] duration-300",
          // Top edge: under header (56px) when controls visible, else flush to 0
          showControls
            ? showReaderAd
              ? isChapterEndAdPage
                ? "top-[19rem] sm:top-[17rem]"
                : "top-[14rem] sm:top-[13rem]"
              : "top-14"
            : "top-0",
          // Bottom edge: above footer (~150px with sticky ad) when controls visible, else flush to 0
          showControls ? "bottom-[150px] sm:bottom-[140px]" : "bottom-0"
        )}
      >
        <div className="flex-1 flex items-stretch justify-center w-full h-full overflow-auto">
          {/* PDF Viewer */}
          {fileType === "pdf" && book.book_url && (
            <PDFViewer
              key={`${book.id}-${book.book_url}`}
              url={book.book_url}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onTotalPagesChange={handleTotalPagesChange}
              onOutlineExtracted={handleOutlineExtracted}
              isDarkMode={theme === "dark"}
              scale={scale}
              className="w-full h-full"
            />
          )}

          {/* EPUB Viewer */}
          {fileType === "epub" && book.book_url && (
            <div ref={epubRef} className="w-full h-full flex">
              <EPUBViewer
                url={book.book_url}
                initialCfi={epubCfi}
                onLocationChange={handleEpubLocationChange}
                onTocExtracted={handleEpubTocExtracted}
                theme={theme}
                fontSize={fontSize}
                className="w-full h-full"
              />
            </div>
          )}

          {/* No file fallback */}
          {(fileType === "unknown" || !book.book_url) && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <Card className={cn(
                "p-8 sm:p-12 max-w-2xl w-full",
                theme === "dark" ? "bg-zinc-800 border-zinc-700" : ""
              )}>
                <div className="prose max-w-none dark:prose-invert">
                  <h2 className="text-center mb-8">{book.title}</h2>
                  <div className="flex flex-col items-center justify-center gap-4 py-8">
                    <Book className="w-16 h-16 text-muted-foreground" />
                    <p className="text-center text-muted-foreground">
                      {book.description || "This book doesn't have a readable file attached."}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Please upload a PDF or EPUB file to enable reading.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <footer
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300",
          colors.headerBg, "backdrop-blur-sm border-t",
          showControls ? "translate-y-0" : "translate-y-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sponsored sticky banner above pagination */}
        <StickyBannerAd placement="bookshelf_reader_sticky" />
        <div className="px-4 py-3">
          {/* Progress Bar */}
          <div className="mb-3">
            <Slider
              value={[currentPage]}
              onValueChange={(v) => {
                if (fileType === "epub") {
                  // For EPUB, we just update the page tracker
                  setCurrentPage(v[0]);
                } else {
                  setCurrentPage(v[0]);
                }
              }}
              min={1}
              max={Math.max(totalPages, 1)}
              step={1}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileType === "epub" ? epubPrev() : goToPage(currentPage - 1)}
              disabled={fileType !== "epub" && currentPage <= 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>

            <span className="text-sm font-medium">
              {currentPage} / {totalPages} · {progressPercent}%
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileType === "epub" ? epubNext() : goToPage(currentPage + 1)}
              disabled={fileType !== "epub" && currentPage >= totalPages}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BookReader;
