
# Book Reader PDF/EPUB Rendering Implementation Plan

## Current Problem
The BookReader component at `src/pages/BookReader.tsx` displays placeholder Lorem Ipsum text instead of rendering actual PDF/EPUB content. When a book has a `book_url`, it shows an iframe which doesn't provide proper page-by-page navigation. The Table of Contents is also static with hardcoded chapters.

## Solution Overview
Implement a proper PDF renderer using **pdfjs-dist** (PDF.js) library with:
- Page-by-page rendering with canvas
- Dynamic page navigation
- Reading progress tracking (already exists, just needs proper integration)
- Support for EPUB fallback via iframe
- Dynamic Table of Contents extraction from PDF

## Technical Details

### 1. Install PDF.js Library
Add `pdfjs-dist` package for PDF rendering in the browser.

### 2. Create PDF Viewer Component
Create a new component `src/components/bookshelf/PDFViewer.tsx`:
- Load PDF document from URL using PDF.js
- Render individual pages to canvas element
- Handle page navigation (next/previous)
- Support zoom/scale controls
- Extract and display actual page count
- Handle loading and error states
- Mobile-responsive canvas sizing

### 3. Update BookReader Page
Modify `src/pages/BookReader.tsx`:
- Detect file type from `book_url` extension (PDF vs EPUB)
- Use PDFViewer component for PDF files
- Keep iframe fallback for EPUB/other formats
- Connect actual page count from PDF to progress tracking
- Extract Table of Contents from PDF outline (if available)
- Dynamic TOC generation based on PDF bookmarks

### 4. Key Features to Implement

**PDF Rendering:**
- Canvas-based page rendering
- Current page display with navigation
- Proper scaling for mobile/desktop
- Loading spinner during page render

**Page Navigation:**
- Previous/Next buttons (existing UI)
- Page slider (existing UI)
- Go to specific page (existing UI)
- Keyboard shortcuts (Left/Right arrows)

**Progress Tracking:**
- Use actual PDF page count for `totalPages`
- Save reading progress with real page numbers
- Resume from last read page on return

**Table of Contents:**
- Extract PDF outline/bookmarks if available
- Display dynamic chapter list
- Navigate to specific pages from TOC

### 5. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `pdfjs-dist` dependency |
| `src/components/bookshelf/PDFViewer.tsx` | Create | PDF rendering component with canvas |
| `src/pages/BookReader.tsx` | Modify | Integrate PDFViewer, dynamic TOC, file type detection |

### 6. Component Architecture

```text
BookReader (page)
    |
    +-- PDFViewer (for PDF files)
    |       |-- Canvas rendering
    |       |-- Page navigation
    |       |-- Zoom controls
    |       +-- TOC extraction
    |
    +-- iframe (fallback for EPUB/other)
```

### 7. PDF.js Integration Details

- Use PDF.js worker for background processing
- Configure worker path from CDN for simplicity
- Implement page caching for smoother navigation
- Handle CORS for Supabase Storage URLs
- Scale canvas based on container width for responsiveness

### 8. Mobile Responsiveness
- Canvas width adapts to screen size
- Touch swipe gestures for page navigation (optional enhancement)
- Pinch-to-zoom support via CSS transform

## Expected Outcome
After implementation:
- PDF files will render actual content page-by-page
- Users can navigate through real book pages
- Reading progress will save with correct page numbers
- TOC will show actual PDF bookmarks/outline
- EPUB files continue to work via iframe fallback
- All existing UI (dark mode, font size for text overlays, controls toggle) remains functional
