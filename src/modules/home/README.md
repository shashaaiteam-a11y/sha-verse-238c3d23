# Home Module

Facebook-style home feed, posts, stories, notifications, saved posts.

## Folder layout

```
src/modules/home/
├── pages/        Home, SavedPosts, Notifications
├── components/   PostCard, FeedCard, CreatePostCard, PostComments,
│                 StoriesBar, StoryViewer, WhatsAppStoriesBar, stories/*
├── hooks/        useFeed, usePosts, useStories, useReactions, useSavedPosts
└── index.ts      Public API
```

## Isolation rules

| From | To | Allowed? |
|------|----|----------|
| `modules/home/*` | `@/shared/*`, `@/integrations/*`, `@/contexts/*` | ✅ |
| `modules/home/*` | `modules/<other>/*` | ❌ |
| `modules/<other>/*` | `modules/home/*` | ❌ — only via routes |

## Migration status

Phase 1: Re-export shims. Real source files still live at their legacy paths
(`src/pages/Home.tsx`, `src/components/PostCard.tsx`, `src/hooks/useFeed.ts`, etc.).
`App.tsx` routes through `@/modules/home/pages/*`.
