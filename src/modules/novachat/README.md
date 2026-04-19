# NovaChat Module

ChatGPT-style AI chat (Gemini 2.5 Flash) feature.

## Folder layout

```
src/modules/novachat/
├── pages/        NovaChat
├── components/   ChatInput, ChatMessage, ChatSidebar, WelcomeScreen
├── hooks/        useNovaChat
└── index.ts      Public API
```

## Isolation rules

| From | To | Allowed? |
|------|----|----------|
| `modules/novachat/*` | `@/shared/*`, `@/integrations/*`, `@/contexts/*` | ✅ |
| `modules/novachat/*` | `modules/<other>/*` | ❌ |
| `modules/<other>/*` | `modules/novachat/*` | ❌ — only via routes |

## Migration status

Phase 1: Re-export shims. Real source files still live at their legacy paths
(`src/pages/NovaChat.tsx`, `src/components/novachat/*`, `src/hooks/useNovaChat.ts`).
`App.tsx` routes through `@/modules/novachat/pages/*`.
