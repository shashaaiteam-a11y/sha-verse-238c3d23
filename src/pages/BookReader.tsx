import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBookInteractions } from "@/hooks/useBookInteractions";
import PDFViewer, { PDFOutlineItem } from "@/components/bookshelf/PDFViewer";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Moon, Sun, Bookmark, Settings,
  ZoomIn, ZoomOut, Book, List, X, FileText
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

// Helper to detect file type from URL
const getFileType = (url: string | null): "pdf" | "epub" | "unknown" => {
  if (!url) return "unknown";
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith(".pdf") || lowerUrl.includes(".pdf?")) return "pdf";
  if (lowerUrl.endsWith(".epub") || lowerUrl.includes(".epub?")) return "epub";
  // Check for common patterns in Supabase URLs
  if (lowerUrl.includes("/files/") && !lowerUrl.includes(".epub")) return "pdf";
  return "unknown";
};

const BookReader = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fontSize, setFontSize] = useState(16);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const [pdfOutline, setPdfOutline] = useState<PDFOutlineItem[]>([]);
  const [scale, setScale] = useState(1.5);

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

  const fileType = getFileType(book?.book_url);

  // Load saved progress
  useEffect(() => {
    if (readingProgress?.current_page) {
      setCurrentPage(readingProgress.current_page);
    }
  }, [readingProgress]);

  // Save progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (bookId && totalPages > 0) {
        updateProgress.mutate({ currentPage, totalPages });
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [currentPage, totalPages, bookId, updateProgress]);

  // Save progress on page change
  useEffect(() => {
    if (bookId && totalPages > 0) {
      updateProgress.mutate({ currentPage, totalPages });
    }
  }, [currentPage, totalPages, bookId, updateProgress]);

  // Increment view count with cleanup
  useEffect(() => {
    let cancelled = false;
    
    if (bookId) {
      supabase
        .from("books")
        .select("views_count")
        .eq("id", bookId)
        .single()
        .then(({ data }) => {
          if (!cancelled) {
            supabase
              .from("books")
              .update({ views_count: (data?.views_count || 0) + 1 })
              .eq("id", bookId);
          }
        });
    }
    
    return () => {
      cancelled = true;
    };
  }, [bookId]);

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

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  // Render TOC items recursively
  const renderOutlineItems = (items: PDFOutlineItem[], depth = 0) => {
    return items.map((item, index) => (
      <div key={`${item.title}-${index}`}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-left",
            depth > 0 && `pl-${4 + depth * 4}`
          )}
          style={{ paddingLeft: `${16 + depth * 16}px` }}
          onClick={() => {
            goToPage(item.pageNumber);
            setShowToc(false);
          }}
        >
          <span className="truncate">{item.title}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            p.{item.pageNumber}
          </span>
        </Button>
        {item.items && item.items.length > 0 && renderOutlineItems(item.items, depth + 1)}
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
        <Button variant="link" onClick={() => navigate("/bookshelf")}>
          Back to Bookshelf
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-300",
        isDarkMode ? "bg-zinc-900 text-zinc-100" : "bg-amber-50 text-zinc-900"
      )}
      onClick={toggleControls}
    >
      {/* Top Bar */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-transform duration-300",
          isDarkMode ? "bg-zinc-800/95" : "bg-white/95",
          "backdrop-blur-sm border-b",
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
              <p className="text-xs text-muted-foreground">{book.author}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fileType === "pdf" && (
              <>
                <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="w-5 h-5" />
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

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
                  {fileType === "pdf" && (
                    <div>
                      <label className="text-sm font-medium mb-3 block">Zoom Level</label>
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
                      <p className="text-xs text-muted-foreground mt-2">{Math.round(scale * 100)}%</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-3 block">Theme</label>
                    <div className="flex gap-2">
                      <Button
                        variant={!isDarkMode ? "default" : "outline"}
                        onClick={() => setIsDarkMode(false)}
                        className="flex-1"
                      >
                        <Sun className="w-4 h-4 mr-2" /> Light
                      </Button>
                      <Button
                        variant={isDarkMode ? "default" : "outline"}
                        onClick={() => setIsDarkMode(true)}
                        className="flex-1"
                      >
                        <Moon className="w-4 h-4 mr-2" /> Dark
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-3 block">Go to Page</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={currentPage}
                        onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                        min={1}
                        max={totalPages}
                        className="w-20 px-3 py-2 border rounded-md text-center"
                      />
                      <span className="text-muted-foreground">of {totalPages}</span>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="icon" onClick={() => setShowToc(!showToc)}>
              <List className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="icon">
              <Bookmark className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Table of Contents Sidebar */}
      {showToc && (
        <div
          className={cn(
            "fixed top-0 left-0 bottom-0 w-72 z-50",
            isDarkMode ? "bg-zinc-800" : "bg-white",
            "border-r shadow-lg"
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
              {pdfOutline.length > 0 ? (
                renderOutlineItems(pdfOutline)
              ) : (
                // Fallback TOC based on page count
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => { goToPage(1); setShowToc(false); }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Start (Page 1)
                  </Button>
                  {totalPages > 10 && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => { goToPage(Math.floor(totalPages * 0.25)); setShowToc(false); }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      25% (Page {Math.floor(totalPages * 0.25)})
                    </Button>
                  )}
                  {totalPages > 5 && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => { goToPage(Math.floor(totalPages * 0.5)); setShowToc(false); }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Middle (Page {Math.floor(totalPages * 0.5)})
                    </Button>
                  )}
                  {totalPages > 10 && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => { goToPage(Math.floor(totalPages * 0.75)); setShowToc(false); }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      75% (Page {Math.floor(totalPages * 0.75)})
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => { goToPage(totalPages); setShowToc(false); }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    End (Page {totalPages})
                  </Button>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Content */}
      <main
        className="min-h-screen flex items-center justify-center p-4 pt-20 pb-24"
      >
        <div className="max-w-4xl w-full">
          {/* PDF Viewer for PDF files */}
          {fileType === "pdf" && book.book_url && (
            <PDFViewer
              url={book.book_url}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onTotalPagesChange={handleTotalPagesChange}
              onOutlineExtracted={handleOutlineExtracted}
              isDarkMode={isDarkMode}
              scale={scale}
            />
          )}

          {/* Iframe fallback for EPUB or other formats */}
          {fileType === "epub" && book.book_url && (
            <iframe
              src={book.book_url}
              className="w-full h-[70vh] rounded-lg border"
              title={book.title}
            />
          )}

          {/* Fallback for books without proper file */}
          {(fileType === "unknown" || !book.book_url) && (
            <Card className={cn(
              "p-8 sm:p-12 min-h-[60vh]",
              isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white"
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
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <footer
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300",
          isDarkMode ? "bg-zinc-800/95" : "bg-white/95",
          "backdrop-blur-sm border-t",
          showControls ? "translate-y-0" : "translate-y-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3">
          {/* Progress Bar */}
          <div className="mb-3">
            <Slider
              value={[currentPage]}
              onValueChange={(v) => setCurrentPage(v[0])}
              min={1}
              max={totalPages}
              step={1}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Previous
            </Button>

            <span className="text-sm font-medium">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BookReader;
