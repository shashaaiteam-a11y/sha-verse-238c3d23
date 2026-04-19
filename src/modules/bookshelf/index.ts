/**
 * Bookshelf Module - Public API
 *
 * MODULE ISOLATION RULES:
 * 1. Other modules MUST NOT import from src/modules/bookshelf/* directly.
 *    They consume bookshelf only via routes (/bookshelf, /bookshelf/book/:id, etc.).
 * 2. This module MAY import from @/shared/*, @/integrations/*, @/contexts/*.
 * 3. This module MUST NOT import from any other src/modules/<name>/*.
 *
 * Owned by Bookshelf:
 *   - Pages: Bookshelf, BookDetail, BookReader, EditBook, AuthorChannel, EditAuthorChannel
 *   - Components: BookCard, BookDetailPage, EPUBViewer, PDFViewer, UploadBookDialog,
 *     EnhancedUploadBookDialog, CreateAuthorChannelDialog, BookRatingDialog,
 *     BookDeletionDialog, CommentSection, Comment, AnalyticsDashboard
 *   - Hooks: useBooks, useBookFeeds, useBookComments, useBookInteractions,
 *     useChannels, useChannelApproval, useReaderBookmarks, useCopyrightSystem
 *   - Constants: BOOK_CATEGORIES (lib/constants/bookshelf)
 */
export { default as Bookshelf } from './pages/Bookshelf';
export { default as BookDetail } from './pages/BookDetail';
export { default as BookReader } from './pages/BookReader';
export { default as EditBook } from './pages/EditBook';
export { default as AuthorChannel } from './pages/AuthorChannel';
export { default as EditAuthorChannel } from './pages/EditAuthorChannel';
