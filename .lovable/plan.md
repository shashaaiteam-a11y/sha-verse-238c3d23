

## Fix: Book Reader Full-Screen Layout (All Devices)

### Problem
The book reader has width constraints (`max-w-4xl`) and padding (`p-4`) that prevent the PDF from filling the entire screen. The theme background color (yellow/sepia) is visible around the book content instead of the book covering the full viewport.

### Root Cause
- `BookReader.tsx` line 548: `<div className="max-w-4xl w-full">` caps the content width
- `BookReader.tsx` line 547: `<main className="... p-4 pt-20 pb-24">` adds padding around the content
- `PDFViewer.tsx` line 236: `availableWidth = effectiveContainerWidth - 32` subtracts 32px unnecessarily
- `PDFViewer.tsx` line 340: `min-h-[70vh]` instead of filling the full available height

### Plan

**File 1: `src/pages/BookReader.tsx`** (lines 547-548)
- Remove `max-w-4xl` constraint — let content fill full width
- Remove horizontal padding (`p-4`) — keep only vertical padding for header/footer clearance
- Change `min-h-screen` to `h-screen` with overflow auto so the PDF fills the viewport

**File 2: `src/components/bookshelf/PDFViewer.tsx`**
- Line 236: Remove the `-32` padding subtraction so the PDF uses the full container width
- Line 340: Change `min-h-[70vh]` to `flex-1 min-h-0` so it fills available space
- Remove `rounded-lg shadow-lg` from the canvas (line 353) since it's now edge-to-edge

### Files NOT changed
- No changes to any other module, route, or component
- No database/backend changes

### Result
The PDF will render edge-to-edge on desktop, tablet, and mobile — no visible background around the book content.

