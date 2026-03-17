import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Configure PDF.js worker from CDN (compatible with pdfjs-dist v5)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface PDFOutlineItem {
  title: string;
  pageNumber: number;
  items?: PDFOutlineItem[];
}

interface PDFViewerProps {
  url: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (totalPages: number) => void;
  onOutlineExtracted?: (outline: PDFOutlineItem[]) => void;
  isDarkMode?: boolean;
  scale?: number;
  className?: string;
}

const PDFViewer = ({
  url,
  currentPage,
  onPageChange,
  onTotalPagesChange,
  onOutlineExtracted,
  isDarkMode = false,
  scale = 1.5,
  className,
}: PDFViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Load PDF document
  useEffect(() => {
    let isMounted = true;

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument({
          url,
          cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });

        const pdf = await loadingTask.promise;

        if (!isMounted) return;

        setPdfDoc(pdf);
        onTotalPagesChange(pdf.numPages);

        // Extract outline/TOC
        try {
          const outline = await pdf.getOutline();
          if (outline && onOutlineExtracted) {
            const processedOutline = await processOutline(pdf, outline);
            onOutlineExtracted(processedOutline);
          }
        } catch (outlineError) {
          console.warn("Could not extract PDF outline:", outlineError);
        }

        setIsLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading PDF:", err);
        setError("Failed to load PDF. Please try again.");
        setIsLoading(false);
      }
    };

    loadPDF();

    return () => {
      isMounted = false;
    };
  }, [url, onTotalPagesChange, onOutlineExtracted]);

  // Process PDF outline to extract page numbers
  const processOutline = async (
    pdf: pdfjsLib.PDFDocumentProxy,
    outline: any[]
  ): Promise<PDFOutlineItem[]> => {
    const result: PDFOutlineItem[] = [];

    for (const item of outline) {
      let pageNumber = 1;

      try {
        if (item.dest) {
          const dest = typeof item.dest === "string" 
            ? await pdf.getDestination(item.dest) 
            : item.dest;
          
          if (dest && dest[0]) {
            const pageRef = dest[0];
            const pageIndex = await pdf.getPageIndex(pageRef);
            pageNumber = pageIndex + 1;
          }
        }
      } catch (e) {
        console.warn("Could not get page number for outline item:", item.title);
      }

      const outlineItem: PDFOutlineItem = {
        title: item.title,
        pageNumber,
      };

      if (item.items && item.items.length > 0) {
        outlineItem.items = await processOutline(pdf, item.items);
      }

      result.push(outlineItem);
    }

    return result;
  };

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || containerWidth === 0) return;

    try {
      setIsPageLoading(true);

      // Cancel any existing render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      // Calculate scale to fit container width
      const originalViewport = page.getViewport({ scale: 1 });
      const responsiveScale = Math.min(
        (containerWidth - 32) / originalViewport.width,
        scale
      );
      const viewport = page.getViewport({ scale: responsiveScale });

      // Set canvas dimensions
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = viewport.width * pixelRatio;
      canvas.height = viewport.height * pixelRatio;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.scale(pixelRatio, pixelRatio);

      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Render page
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;

      setIsPageLoading(false);
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("Error rendering page:", err);
        setError("Failed to render page.");
      }
      setIsPageLoading(false);
    }
  }, [pdfDoc, currentPage, containerWidth, scale]);

  // Render page when dependencies change
  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!pdfDoc) return;

      if (e.key === "ArrowLeft" && currentPage > 1) {
        onPageChange(currentPage - 1);
      } else if (e.key === "ArrowRight" && currentPage < pdfDoc.numPages) {
        onPageChange(currentPage + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pdfDoc, currentPage, onPageChange]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col items-center justify-center w-full",
        className
      )}
    >
      <div className="relative">
        {isPageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={cn(
            "rounded-lg shadow-lg",
            isDarkMode ? "filter invert hue-rotate-180" : ""
          )}
        />
      </div>
    </div>
  );
};

export default PDFViewer;
