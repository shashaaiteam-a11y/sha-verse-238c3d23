# Groups Module

Self-contained groups / community feature.

## Folder layout

```
src/modules/groups/
├── pages/        Groups, GroupDetail, GroupAdmin
├── components/   Re-exports of group UI components
├── hooks/        Re-exports of group data hooks
└── index.ts      Public API
```

## Isolation rules

| From | To | Allowed? |
|------|----|----------|
| `modules/groups/*` | `@/shared/*`, `@/integrations/*`, `@/contexts/*` | ✅ |
| `modules/groups/*` | `modules/<other>/*` | ❌ |
| `modules/<other>/*` | `modules/groups/*` | ❌ — only via routes |

## Migration status

Phase 1: Re-export shims. Real source files still live at their legacy paths
(`src/pages/Group*.tsx`, `src/components/groups/*`, `src/hooks/useGroup*.ts`).
`App.tsx` routes through `@/modules/groups/pages/*`.
