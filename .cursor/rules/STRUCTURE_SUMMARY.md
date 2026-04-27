# Project Structure Summary

This document summarizes the project organization standards for this repository.

---

## Frontend: Feature-Based Architecture

### Structure

```
features/{feature}/
├── components/           # Feature-specific components
│   ├── {feature}-card.tsx
│   ├── {feature}-list.tsx
│   └── {feature}-form.tsx
├── hooks/               # Convex wrappers + custom logic
│   └── use-{feature}-data.ts
├── stores/              # UI state ONLY (never server data)
│   └── {feature}-ui-store.ts
├── types/
│   └── {feature}.types.ts
└── index.ts            # Public API (barrel export)
```

### Key Principles

1. **Features are vertical slices** - Everything a feature needs lives together
2. **Export through index.ts** - Other features import from the public API
3. **No deep imports** - Never import feature internals directly
4. **UI state only in stores** - Never duplicate Convex data in Zustand

### Example Import

```typescript
// ✅ CORRECT
import { UserCard, useUserList } from '@/features/users';

// ❌ WRONG
import { UserCard } from '@/features/users/components/user-card';
```

### Index.ts Export Patterns

Choose the pattern based on feature size:

**Small Features (<10 files per subfolder) - Use Explicit Exports**

```typescript
// features/users/index.ts
export { useCurrentUser } from './hooks/use-current-user';
export { useUpdateDisplayName } from './hooks/use-update-display-name';
export type { User } from './types/user.types';
```

✅ Pros: Clear public API, better IDE navigation, easier to review  
❌ Cons: More verbose (acceptable for small features)

**Large Features (10+ files per subfolder) - Use Subfolder Indexes**

```typescript
// features/projects/hooks/index.ts
export { useProjects } from './use-projects';
export { useProject } from './use-project';
export { useCreateProject } from './use-create-project';
// ... 8 more exports

// features/projects/index.ts
export * from './hooks';
export * from './components';
export * from './types';
```

✅ Pros: Less maintenance, easier to add new files  
❌ Cons: Extra indirection, harder to see full public API

**Decision Rule:**
- Count files in each subfolder (hooks/, components/, etc.)
- If ANY subfolder has 10+ files → Add subfolder indexes
- If ALL subfolders have <10 files → Use explicit exports in root index only

---

## Backend: Domain-Based Organization (Medium Strategy)

### Structure

```
convex/{domain}/
├── queries.ts           # All queries for this domain
├── mutations.ts         # All mutations for this domain
├── internal.ts          # Internal-only functions
└── helpers.ts           # Shared logic (not exported to client)
```

### File-Based Routing

- `convex/users/queries.ts` → `api.users.queries.list`
- `convex/users/mutations.ts` → `api.users.mutations.create`
- `convex/users/internal.ts` → `internal.users.internal.upsertFromClerk`

### Key Principles

1. **Split by function type** - queries.ts, mutations.ts, actions.ts, internal.ts
2. **Keep helpers internal** - helpers.ts is NOT exported to client
3. **Always use validators** - Every function must have args and returns validators
4. **Document public functions** - Use JSDoc comments

### Example Function

```typescript
// convex/users/queries.ts
import { query } from '../_generated/server';
import { v } from 'convex/values';

/**
 * Get all users with optional search
 */
export const list = query({
  args: {
    search: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id('users'),
      displayName: v.string(),
      email: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    let query = ctx.db.query('users');
    
    if (args.search) {
      query = query.withSearchIndex('search_displayName', q =>
        q.search('displayName', args.search),
      );
    }
    
    return await query.collect();
  },
});
```

---

## Shared Components & Layouts

### Structure

```
components/
├── ui/                  # UI primitives (shadcn/ui for RN)
│   ├── button.tsx
│   ├── card.tsx
│   └── input.tsx
├── layout/              # Reusable layouts
│   ├── screen-wrapper.tsx
│   ├── list-screen.tsx
│   └── detail-screen.tsx
└── shared/              # Business components used across features
    ├── loading-spinner.tsx
    └── empty-state.tsx
```

### When to Use

| Create in `components/` when... | Create in `features/{feature}/` when... |
|--------------------------------|----------------------------------------|
| Used by 3+ features | Only used by 1-2 features |
| Purely presentational | Has feature-specific logic |
| No business logic | Has feature-specific state |
| Generic/reusable | Feature-specific |

---

## Full Project Structure

```
expo-mobile-starter/
├── app/                          # Expo Router (screens only)
│   ├── (auth)/
│   ├── (protected)/
│   └── {feature}s/
│       ├── index.tsx
│       └── [id].tsx
│
├── convex/                       # Backend (domain folders)
│   ├── _generated/
│   ├── schema.ts
│   ├── http.ts
│   ├── users/
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   ├── internal.ts
│   │   └── helpers.ts
│   └── messages/
│       ├── queries.ts
│       ├── mutations.ts
│       └── helpers.ts
│
├── features/                     # Frontend features
│   ├── users/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── types/
│   │   └── index.ts
│   └── messages/
│       └── ...
│
├── components/                   # Shared components
│   ├── ui/
│   ├── layout/
│   └── shared/
│
├── hooks/                        # Shared hooks
├── stores/                       # Global Zustand stores
├── lib/                          # Utilities
├── providers/                    # Context providers
└── types/                        # Shared types
```

---

## State Management Rules

### ✅ DO:

- Store database data in Convex (use `useQuery`, `useMutation`)
- Store UI state in Zustand (modals, filters, selections)
- Store form data in React Hook Form
- Store component-local state in `useState`
- Use Convex's `Doc<'tableName'>` for database entity types

### ❌ DON'T:

- Duplicate Convex data in Zustand or `useState`
- Store API responses in local state
- Pass Convex data through props drilling (call `useQuery` directly)
- Manually duplicate Convex types (use `Doc<>` instead)

---

## Migration Path

### Current (Start Simple)
```
convex/
├── users.ts          # All user functions in one file
└── messages.ts       # All message functions in one file
```

### Medium (When files > 200 lines) - **WE ARE HERE**
```
convex/
├── users/
│   ├── queries.ts
│   ├── mutations.ts
│   ├── internal.ts
│   └── helpers.ts
└── messages/
    ├── queries.ts
    └── mutations.ts
```

### Large (When 20+ tables or 10+ functions per domain)
```
convex/
├── users/
│   ├── profile/
│   ├── settings/
│   └── helpers.ts
└── workspace/
    ├── projects/
    └── tasks/
```

---

## Quick Reference

| Aspect | Standard |
|--------|----------|
| Frontend organization | Feature-based (vertical slices) |
| Backend organization | Domain-based (split by function type) |
| File naming | kebab-case.tsx |
| Function style | Regular functions (not arrow) |
| Server state | Convex hooks |
| UI state | Zustand |
| Forms | React Hook Form + Zod |
| Lists | FlashList (not FlatList) |
| Styling | NativeWind (Tailwind) |
| Navigation | Expo Router |
| Database types | `Doc<'tableName'>` (auto-generated) |

---

## Documentation Files

- **CONVENTIONS.mdc** - Core coding conventions and patterns
- **FEATURE_TEMPLATE.md** - Complete templates for creating new features
- **AGENTS.md** - Comprehensive AI-optimized guidelines
- **STRUCTURE_SUMMARY.md** - This file (quick reference)

---

## Next Steps

When creating a new feature:

1. Read **FEATURE_TEMPLATE.md** for complete examples
2. Follow the checklist at the end of the template
3. Export everything through the feature's `index.ts`
4. Keep screens thin (just composition)
5. Keep Convex functions focused (single responsibility)

When you have questions about:
- **How to organize**: Read this file
- **How to code**: Read CONVENTIONS.mdc
- **How to create a feature**: Read FEATURE_TEMPLATE.md
- **Deep dive on patterns**: Read AGENTS.md
