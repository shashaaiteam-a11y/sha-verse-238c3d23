# Bookshelf Module

Self-contained books / author-channel / reader feature.

## Folder layout

```
src/modules/bookshelf/
├── pages/        Routable pages (Bookshelf, BookDetail, BookReader, EditBook, AuthorChannel, EditAuthorChannel)
├── components/   Re-exports of bookshelf UI components
├── hooks/        Re-exports of book/channel data hooks
├── constants.ts  Re-exports BOOK_CATEGORIES
└── index.ts      Public API
```

## Isolation rules

| From | To | Allowed? |
|------|----|----------|
| `modules/bookshelf/*` | `@/shared/*`, `@/integrations/*`, `@/contexts/*` | ✅ |
| `modules/bookshelf/*` | `modules/<other>/*` | ❌ |
| `modules/<other>/*` | `modules/bookshelf/*` | ❌ — only via routes |
| `shared/*` | `modules/bookshelf/*` | ❌ |

## Migration status

Phase 1: Re-export shims. Real source files still live at `src/components/bookshelf/*`,
`src/hooks/useBooks.ts` etc. `App.tsx` routes through `@/modules/bookshelf/pages/*`.
Legacy `src/pages/Bookshelf.tsx` (and siblings) become shim re-exports for back-compat.
