# Movion Module

YouTube-style video platform — already physically isolated at `src/movion/`
with its own pages, components, hooks, contexts, store, algorithms, types,
and constants.

This folder (`src/modules/movion/`) is a thin symmetry wrapper so all
7 modules expose the same public-API shape (`src/modules/<name>/pages/...`,
`/components/...`, `/hooks/...`, `index.ts`).

## Folder layout

```
src/modules/movion/
├── pages/        Re-export shims for Movion, VideoWatch, ChannelPage,
│                 CreatorStudio, MovionLibrary, MovionAdmin
└── index.ts      Public API
```

The actual feature code stays in `src/movion/` (do not duplicate it here).

## Isolation rules

| From | To | Allowed? |
|------|----|----------|
| `modules/movion/*` / `src/movion/*` | `@/shared/*`, `@/integrations/*`, `@/contexts/*` | ✅ |
| `modules/movion/*` / `src/movion/*` | `modules/<other>/*` | ❌ |
| `modules/<other>/*` | `modules/movion/*` / `src/movion/*` | ❌ — only via routes |
| `shared/*` | `modules/movion/*` / `src/movion/*` | ❌ |
