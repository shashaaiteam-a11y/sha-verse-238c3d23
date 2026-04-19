# Chats Module

Self-contained chats / messaging feature for SHA-VERSE.

## Folder layout

```
src/modules/chats/
├── pages/        Routable pages (Messages.tsx)
├── components/   UI components (MessengerChat, ChatDialog, etc.)
├── hooks/        Data + realtime hooks (useMessages, useConversations, etc.)
└── index.ts      Public API
```

## Isolation rules

| From | To | Allowed? |
|------|----|----------|
| `modules/chats/*` | `@/shared/*`, `@/integrations/*`, `@/contexts/*` | ✅ |
| `modules/chats/*` | `modules/<other>/*` | ❌ |
| `modules/<other>/*` | `modules/chats/*` | ❌ — only via `/messages` route |
| `shared/*` | `modules/chats/*` | ❌ |

If Home or Profile needs the unread badge count, they should use
`@/shared/hooks/useUnreadCount` (a thin selector that queries the same DB tables
without coupling to chats internals) — NOT import `useBadgeCount` from chats.

## Migration status

Currently the underlying source files still live at their legacy paths
(`src/components/MessengerChat.tsx`, `src/hooks/useMessages.ts`, etc.).
The files inside this module are thin **re-export shims** that point at those
legacy locations. This lets `App.tsx` import from the module boundary
(`@/modules/chats/...`) immediately while we incrementally physically move
files in follow-up passes — without breaking the rest of the codebase.

When all consumers outside this module stop importing the legacy paths, the
real files can be moved here and the legacy files deleted.
