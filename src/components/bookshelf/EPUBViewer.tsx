import { useEffect, useRef, useState, useCallback } from "react";
import ePub, { Book, Rendition } from "epubjs";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EPUBViewerProps {
  url: string;
  initialCfi?: string;
  onLocationChange?: (cfi: string, page: number, totalPages: number) => void;
  onTocExtracted?: (toc: TocItem[]) => void;
  theme?: "light" | "dark" | "sepia";
  fontSize?: number;
  className?: string;
}

export interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

const THEME_STYLES: Record<string, Record<string, string>> = {
  light: {
    body: "background-color: #fffbf0 !important; color: #1a1a1a !important;",
  },
  dark: {
    body: "background-color: #1a1a1a !important; color: #e0e0e0 !important;",
  },
  sepia: {
    body: "background-color: #f4ecd8 !important; color: #5b4636 !important;",
  },
};

const EPUBViewer = ({
  url,
  initialCfi,
  onLocationChange,
  onTocExtracted,
  theme = "light",
  fontSize = 16,
  className,
}: EPUBViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize book
  useEffect(() => {
    if (!viewerRef.current) return;

    let isMounted = true;
    const container = viewerRef.current;

    const initBook = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Clean up previous
        if (bookRef.current) {
          bookRef.current.destroy();
        }

        const book = ePub(url);
        bookRef.current = book;

        const rendition = book.renderTo(container, {
          width: "100%",
          height: "100%",
          spread: "none",
          flow: "paginated",
        });

        renditionRef.current = rendition;

        // Apply initial theme
        Object.entries(THEME_STYLES).forEach(([name, styles]) => {
          rendition.themes.register(name, styles);
        });
        rendition.themes.select(theme);
        rendition.themes.fontSize(`${fontSize}px`);

        // Display from saved position or start
        if (initialCfi) {
          await rendition.display(initialCfi);
        } else {
          await rendition.display();
        }

        // Generate locations for progress tracking
        await book.locations.generate(1024);

        // Extract TOC
        const navigation = await book.loaded.navigation;
        if (navigation?.toc && onTocExtracted) {
          const toc: TocItem[] = navigation.toc.map((item: any) => ({
            label: item.label?.trim() || "Untitled",
            href: item.href,
            subitems: item.subitems?.map((sub: any) => ({
              label: sub.label?.trim() || "Untitled",
              href: sub.href,
            })),
          }));
          onTocExtracted(toc);
        }

        // Track location changes
        rendition.on("relocated", (location: any) => {
          if (!isMounted) return;
          const cfi = location.start.cfi;
          const loc = book.locations.locationFromCfi(cfi);
          const currentPage = typeof loc === 'number' ? loc : 0;
          const totalPages = (book.locations as any).total || (book.locations as any)._locations?.length || 1;
          onLocationChange?.(cfi, currentPage + 1, totalPages);
        });

        if (isMounted) setIsLoading(false);
      } catch (err) {
        console.error("[EPUBViewer] Error:", err);
        if (isMounted) {
          setError("Failed to load EPUB. The file may be corrupted.");
          setIsLoading(false);
        }
      }
    };

    initBook();

    return () => {
      isMounted = false;
      if (bookRef.current) {
        bookRef.current.destroy();
        bookRef.current = null;
        renditionRef.current = null;
      }
    };
    // Only re-init on URL change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Update theme
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.select(theme);
    }
  }, [theme]);

  // Update font size
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontSize}px`);
    }
  }, [fontSize]);

  // Navigation methods exposed via ref
  const nextPage = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  const prevPage = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  const goToHref = useCallback((href: string) => {
    renditionRef.current?.display(href);
  }, []);

  const goToCfi = useCallback((cfi: string) => {
    renditionRef.current?.display(cfi);
  }, []);

  // Expose methods on the DOM element for parent access
  useEffect(() => {
    if (viewerRef.current) {
      (viewerRef.current as any).__epubMethods = {
        nextPage,
        prevPage,
        goToHref,
        goToCfi,
      };
    }
  }, [nextPage, prevPage, goToHref, goToCfi]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)} style={{ minHeight: "70vh", height: "70vh" }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading EPUB...</p>
          </div>
        </div>
      )}
      <div
        ref={viewerRef}
        className="w-full h-full"
        style={{
          minHeight: "70vh",
          backgroundColor:
            theme === "dark" ? "#1a1a1a" : theme === "sepia" ? "#f4ecd8" : "#fffbf0",
        }}
      />
    </div>
  );
};

export default EPUBViewer;
