import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBookInteractions } from "@/hooks/useBookInteractions";
import { useReaderBookmarks } from "@/hooks/useReaderBookmarks";
import PDFViewer, { PDFOutlineItem } from "@/components/bookshelf/PDFViewer";
import EPUBViewer, { TocItem } from "@/components/bookshelf/EPUBViewer";
import ReflowReader from "@/components/bookshelf/reader/ReflowReader";
import ReaderSettingsPanel from "@/components/bookshelf/reader/ReaderSettingsPanel";
import ReaderSearchPanel from "@/components/bookshelf/reader/ReaderSearchPanel";
import { useReflowBook } from "@/hooks/useReflowBook";
import { useReaderHighlights } from "@/hooks/useReaderHighlights";
import { useReaderSettings } from "@/lib/reader/settings";
import { loadAnchor, saveAnchor } from "@/lib/reader/cache";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Moon, Sun, Bookmark, BookmarkCheck, Settings,
  ZoomIn, ZoomOut, Book, List, X, FileText, Type, Minus, Plus, Palette,
  Search, BookOpen, ScanLine, Loader2
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
import { useIsMobile } from "@/hooks/use-mobile";
import { BOOK_PUBLIC_COLUMNS } from "@/lib/constants/bookshelf";

// Mobile panel positioning: sits just above the bottom nav (h-14 = 56px) + 12px gap + safe area.
// Mobile panel positioning: sits just above the reader's bottom controls + safe area.
const MOBILE_PANEL_BOTTOM_OFFSET = "calc(112px + env(safe-area-inset-bottom))";
const MOBILE_PANEL_MAX_HEIGHT = "calc(70vh - env(safe-area-inset-bottom))";

type ReaderTheme = "light" | "dark" | "sepia";

const VIEW_MODE_KEY = "shaverse:reader-view-mode:v1";

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
  light: { bg: "bg-white", text: "text-zinc-900", headerBg: "bg-white/95" },
  dark: { bg: "bg-zinc-900", text: "text-zinc-100", headerBg: "bg-zinc-800/95" },
  sepia: { bg: "bg-[#f4ecd8]", text: "text-[#5b4636]", headerBg: "bg-[#e8dcc8]/95" },
};


const BookReader = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const epubRef = useRef<HTMLDivElement>(null);
  const lastSavedProgressRef = useRef<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<ReaderTheme>("light");
  const [showControls, setShowControls] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [pdfOutline, setPdfOutline] = useState<PDFOutlineItem[]>([]);
  const [epubToc, setEpubToc] = useState<TocItem[]>([]);
  // Zoom factor where 1.0 = fully fit page inside viewport (both width & height).
  // 1.0 = 100% (default), up to 3.0 = 300%.
  const [scale, setScale] = useState(1);
  const [epubCfi, setEpubCfi] = useState<string | undefined>();

  // 📖 Inline reader-ad state — every 4 pages, skip first 2 + last
  const [adKey, setAdKey] = useState(0);
  const [adDismissedFor, setAdDismissedFor] = useState<number | null>(null);

  const { data: book, isLoading } = useQuery({
    queryKey: ["book", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select(BOOK_PUBLIC_COLUMNS)
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

  /* ------------------------------- Reader Mode ------------------------------ */
  // Reader Mode = reflowable text extracted from the PDF (default).
  // Original PDF Mode = the existing page-image renderer (fallback).
  const [viewMode, setViewMode] = useState<"reader" | "original">(() => {
    if (typeof window === "undefined") return "reader";
    return window.localStorage.getItem(VIEW_MODE_KEY) === "original" ? "original" : "reader";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [jumpTo, setJumpTo] = useState<{ blockIndex: number; token: number } | null>(null);
  const jumpTokenRef = useRef(0);
  const anchorRestoredRef = useRef(false);

  const {
    settings: readerSettings,
    update: updateReaderSetting,
    reset: resetReaderSettings,
  } = useReaderSettings();

  const isReaderMode = fileType === "pdf" && viewMode === "reader";

  const reflow = useReflowBook({
    bookId,
    url: book?.book_url ?? undefined,
    title: book?.title,
    author: book?.author,
    enabled: isReaderMode && !!book?.book_url,
    ocr: true,
  });

  const { highlights, addHighlight, removeHighlight, updateHighlight } =
    useReaderHighlights(bookId);

  // page -> first block index, for page/bookmark navigation inside Reader Mode.
  const pageStartIndex = useMemo(() => {
    const map = new Map<number, number>();
    reflow.book?.blocks.forEach((block, index) => {
      if (!map.has(block.page)) map.set(block.page, index);
    });
    return map;
  }, [reflow.book]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode]);

  // Keep the reader chrome in sync with the Reader Mode theme.
  useEffect(() => {
    if (!isReaderMode) return;
    setTheme(readerSettings.theme === "black" ? "dark" : readerSettings.theme);
  }, [isReaderMode, readerSettings.theme]);

  useEffect(() => {
    anchorRestoredRef.current = false;
  }, [bookId, isReaderMode]);

  useEffect(() => {
    if (isReaderMode && reflow.totalPages > 0) setTotalPages(reflow.totalPages);
  }, [isReaderMode, reflow.totalPages]);

  const jumpToBlock = useCallback((blockIndex: number) => {
    jumpTokenRef.current += 1;
    setJumpTo({ blockIndex, token: jumpTokenRef.current });
  }, []);

  // Restore the saved reading anchor once enough of the book is available.
  useEffect(() => {
    if (!isReaderMode || !bookId || anchorRestoredRef.current) return;
    const blocks = reflow.book?.blocks;
    if (!blocks?.length) return;

    anchorRestoredRef.current = true;
    void loadAnchor(bookId).then((anchor) => {
      if (!anchor) return;
      const byId = blocks.findIndex((b) => b.id === anchor.blockId);
      const bySnippet =
        byId >= 0
          ? byId
          : blocks.findIndex((b) => "text" in b && anchor.snippet && b.text.startsWith(anchor.snippet));
      const index = bySnippet >= 0 ? bySnippet : pageStartIndex.get(anchor.page) ?? -1;
      if (index >= 0) jumpToBlock(index);
    });
  }, [isReaderMode, bookId, reflow.book, pageStartIndex, jumpToBlock]);

  const handleReaderLocation = useCallback(
    (location: { blockIndex: number; blockId: string; page: number; percent: number; snippet: string }) => {
      setCurrentPage((prev) => (prev === location.page ? prev : location.page));
      if (bookId) {
        void saveAnchor(bookId, {
          blockId: location.blockId,
          blockIndex: location.blockIndex,
          charOffset: 0,
          snippet: location.snippet,
          page: location.page,
          updatedAt: Date.now(),
        });
      }
    },
    [bookId]
  );

  const handleCreateHighlight = useCallback(
    (payload: { blockId: string; start: number; end: number; text: string; withNote: boolean }) => {
      const created = addHighlight({
        blockId: payload.blockId,
        start: payload.start,
        end: payload.end,
        text: payload.text,
      });
      if (created && payload.withNote) {
        const note = window.prompt("Add a note", "");
        if (note && note.trim()) updateHighlight(created.id, { note: note.trim() });
        else if (note === null) removeHighlight(created.id);
      }
    },
    [addHighlight, updateHighlight, removeHighlight]
  );


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
      if (isReaderMode) {
        const index = pageStartIndex.get(page);
        if (index !== undefined) jumpToBlock(index);
      }
    }
  }, [totalPages, isReaderMode, pageStartIndex, jumpToBlock]);

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
      className={cn("fixed inset-0 w-screen overflow-hidden transition-colors duration-300", colors.bg, colors.text)}
      style={{ height: "100dvh" }}
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
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
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
                {isReaderMode ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Search in book"
                    onClick={() => { setShowSearch(true); setShowToc(false); setShowBookmarks(false); }}
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => setScale(prev => Math.max(prev - 0.25, 1))}>
                      <ZoomOut className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => setScale(prev => Math.min(prev + 0.25, 3))}>
                      <ZoomIn className="w-5 h-5" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={isReaderMode ? "Switch to original PDF" : "Switch to Reader Mode"}
                  title={isReaderMode ? "Original PDF" : "Reader Mode"}
                  onClick={() => setViewMode(isReaderMode ? "original" : "reader")}
                >
                  {isReaderMode ? <ScanLine className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
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
              <SheetContent
                side={isMobile ? "bottom" : "right"}
                className={cn(
                  isMobile &&
                    "rounded-t-2xl border-t border-x-0 border-b-0 p-4 max-h-[70vh] overflow-y-auto"
                )}
                style={
                  isMobile
                    ? {
                        bottom: MOBILE_PANEL_BOTTOM_OFFSET,
                        top: "auto",
                        maxHeight: MOBILE_PANEL_MAX_HEIGHT,
                      }
                    : undefined
                }
              >
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

                  {/* Zoom (Original PDF mode only) */}
                  {fileType === "pdf" && !isReaderMode && (
                    <div>
                      <label className="text-sm font-medium mb-3 block">Zoom: {Math.round(scale * 100)}%</label>
                      <div className="flex items-center gap-4">
                        <ZoomOut className="w-4 h-4" />
                        <Slider
                          value={[scale * 100]}
                          onValueChange={(v) => setScale(v[0] / 100)}
                          min={100}
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
            "fixed z-50 shadow-lg animate-in",
            isMobile
              ? "left-2 right-2 rounded-2xl border slide-in-from-bottom-4"
              : "top-0 left-0 bottom-0 w-72 border-r slide-in-from-left",
            theme === "dark" ? "bg-zinc-800" : theme === "sepia" ? "bg-[#e8dcc8]" : "bg-white"
          )}
          style={
            isMobile
              ? {
                  bottom: MOBILE_PANEL_BOTTOM_OFFSET,
                  maxHeight: MOBILE_PANEL_MAX_HEIGHT,
                  display: "flex",
                  flexDirection: "column",
                }
              : undefined
          }
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <h2 className="font-semibold">Table of Contents</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowToc(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className={isMobile ? "flex-1 min-h-0" : "h-[calc(100%-60px)]"}>
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
        <>
          {isMobile && (
            <div
              className="fixed inset-0 z-40 bg-black/40 animate-in fade-in-0"
              onClick={() => setShowBookmarks(false)}
            />
          )}
        <div
          className={cn(
            "fixed z-50 shadow-lg flex flex-col",
            isMobile
              ? "left-2 right-2 rounded-2xl border animate-in slide-in-from-bottom-4"
              : "top-0 right-0 bottom-0 w-72 border-l",
            theme === "dark" ? "bg-zinc-800" : theme === "sepia" ? "bg-[#e8dcc8]" : "bg-white"
          )}
          style={
            isMobile
              ? {
                  bottom: MOBILE_PANEL_BOTTOM_OFFSET,
                  maxHeight: MOBILE_PANEL_MAX_HEIGHT,
                }
              : undefined
          }
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Bookmarks ({bookmarks.length})</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowBookmarks(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className={isMobile ? "flex-1 min-h-0" : "h-[calc(100%-60px)]"}>
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
        </>
      )}

      {/* Main Content — true edge-to-edge. Always fills 100vh minus
          (header when shown) and (footer when shown). Ads NEVER displace it. */}
      <main
        className={cn(
          "absolute inset-x-0 overflow-hidden transition-[top,bottom] duration-300",
          showControls ? "top-14" : "top-0",
          showControls ? "bottom-24 sm:bottom-20" : "bottom-0"
        )}
      >
        <div className={cn("relative w-full h-full overflow-hidden", colors.bg)}>
          {/* PDF Viewer — wrapper paints theme bg behind canvas so any
              side gutters from natural aspect ratio match the reader theme. */}
          {fileType === "pdf" && book.book_url && (
            <div className={cn("w-full h-full overflow-auto overscroll-contain", colors.bg)} style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y pinch-zoom" }}>
              <PDFViewer
                key={`${book.id}-${book.book_url}`}
                url={book.book_url}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onTotalPagesChange={handleTotalPagesChange}
                onOutlineExtracted={handleOutlineExtracted}
                isDarkMode={theme === "dark"}
                scale={scale}
                className="max-w-full"
              />
            </div>
          )}

          {/* EPUB Viewer — Tailwind arbitrary child selectors override the
              hard-coded 70vh inline styles so EPUB fills the full viewport. */}
          {fileType === "epub" && book.book_url && (
            <div
              ref={epubRef}
              className={cn(
                "w-full h-full block [&>div]:!h-full [&>div]:!min-h-[unset] [&_iframe]:!h-full",
                colors.bg
              )}
            >
              <EPUBViewer
                url={book.book_url}
                initialCfi={epubCfi}
                onLocationChange={handleEpubLocationChange}
                onTocExtracted={handleEpubTocExtracted}
                theme={theme}
                fontSize={fontSize}
                className="!h-full !min-h-0 w-full"
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

          {/* Tap zones for mobile/tablet — invisible, only visible on touch.
              Left 25% prev, center 50% toggle controls, right 25% next.
              For PDFs we DISABLE the tap-zone overlay so vertical scrolling
              works natively when the page is zoomed beyond viewport. EPUB
              is paginated (no scroll needed) so tap zones stay active.
              Hidden on desktop (md+) where keyboard arrows are used. */}
          {fileType === "epub" && (
            <div className="absolute inset-0 z-30 md:hidden flex pointer-events-none">
              <button
                type="button"
                aria-label="Previous page"
                className="h-full w-[30%] pointer-events-auto bg-transparent"
                style={{ touchAction: "pan-y" }}
                onClick={(e) => {
                  e.stopPropagation();
                  epubPrev();
                }}
              />
              <button
                type="button"
                aria-label="Toggle controls"
                className="h-full w-[40%] pointer-events-auto bg-transparent"
                style={{ touchAction: "pan-y" }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleControls();
                }}
              />
              <button
                type="button"
                aria-label="Next page"
                className="h-full w-[30%] pointer-events-auto bg-transparent"
                style={{ touchAction: "pan-y" }}
                onClick={(e) => {
                  e.stopPropagation();
                  epubNext();
                }}
              />
            </div>
          )}

          {/* 📖 Floating inline reader ad — docked above footer area, never
              shrinks the reading content. Dismissible per page. */}
          {showReaderAd && (
            <div
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-2 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <BookReaderInlineAd
                key={`reader-ad-${adKey}`}
                variant={isChapterEndAdPage ? "chapter_end" : "inline"}
                theme={theme}
                onDismiss={() => setAdDismissedFor(currentPage)}
              />
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
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Sponsored sticky banner above pagination — height-constrained
            so footer stays a predictable ~96px mobile / ~80px desktop. */}
        <div className="max-h-[50px] overflow-hidden">
          <StickyBannerAd placement="bookshelf_reader_sticky" />
        </div>
        <div className="px-4 py-2 sm:py-1.5">
          {/* Progress Bar */}
          <div className="mb-2">
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
