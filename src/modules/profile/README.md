# Profile Module

Self-contained user-profile / friends / settings feature.

## Folder layout

```
src/modules/profile/
├── pages/        Profile, Friends, Settings
├── components/   Re-exports of profile UI components
├── hooks/        Re-exports of profile data hooks
└── index.ts      Public API
```

## Isolation rules

| From | To | Allowed? |
|------|----|----------|
| `modules/profile/*` | `@/shared/*`, `@/integrations/*`, `@/contexts/*` | ✅ |
| `modules/profile/*` | `modules/<other>/*` | ❌ |
| `modules/<other>/*` | `modules/profile/*` | ❌ — only via routes |
| `shared/*` | `modules/profile/*` | ❌ |

## Migration status

Phase 1: Re-export shims. Real source files still live at their legacy paths
(`src/pages/Profile.tsx`, `src/components/profile/*`, `src/hooks/useProfile*.ts`).
`App.tsx` routes through `@/modules/profile/pages/*`.
