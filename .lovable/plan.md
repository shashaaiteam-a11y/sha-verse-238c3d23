
Goal

Fix the Bookshelf reader so clicking Start Reading opens the book immediately and the page renders reliably, without touching any other module or changing unrelated UI.

What I verified

- The Start Reading flow already exists: `src/pages/BookDetail.tsx` navigates to `/bookshelf/read/:bookId`.
- The reader route already exists in `src/App.tsx`.
- The book record for the current failing case has a valid public `book_url` and `pages = 241`.
- The screenshot shows the reader screen opens and PDF metadata loads (`1 / 241` visible), but the actual page canvas stays blank.

Root cause

This is not mainly a button/navigation issue now. The book reader opens, but `src/components/bookshelf/PDFViewer.tsx` can skip rendering when `containerWidth === 0`. In that state, the PDF loads successfully, but the canvas never paints a page, so the user sees a blank rectangle.

Implementation plan

1. Stabilize `PDFViewer.tsx` initial rendering
- Remove the fragile dependency on a non-zero measured width before first render.
- Resolve width using a safe fallback chain:
  - container width
  - parent width
  - viewport width fallback
- If width is still unavailable momentarily, render with a safe fallback width instead of returning early.

2. Make first page render immediately after Start Reading
- Ensure page rendering runs as soon as the PDF document is ready.
- Keep responsive sizing, but do not let resize measurement block the first paint.
- Give the canvas explicit responsive sizing so the page is visible on desktop, tablet, and mobile.

3. Add Bookshelf-only resilience
- If PDF loading succeeds but page painting fails, show a proper retry/error state instead of a blank placeholder.
- Keep this fully isolated to the Bookshelf reader only.

4. Keep the existing Bookshelf reader UX intact
- Preserve current reader controls:
  - next/prev
  - slider progress
  - zoom
  - bookmarks
  - TOC
  - themes
  - progress saving
- No changes to chat, groups, posts, auth, movion, profile, or any other global UI/module.

Technical details

Files to update:
- `src/components/bookshelf/PDFViewer.tsx`
- Possibly `src/pages/BookReader.tsx` only for a minimal Bookshelf-specific fallback/remount safeguard if needed

Files not planned to change:
- `src/App.tsx` route structure
- `src/components/SwipeWrapper.tsx`
- `src/components/BottomNav.tsx`
- Any non-Bookshelf module

No backend changes needed:
- No database migration
- No auth/storage policy change
- No bucket/config change for this specific issue, because the current `book_url` is already valid and reachable

Verification after implementation

- Open a book detail page
- Click Start Reading
- Confirm the reader opens immediately
- Confirm page 1 is visible, not blank
- Confirm page count, next/prev, slider, zoom, bookmarks, and saved progress still work
- Confirm the fix works at the current desktop viewport and on mobile width

Expected result

Start Reading will continue to open the existing Bookshelf reader route, and the book page will render immediately instead of showing an empty canvas/blank placeholder.
