# Feature Template (Convex + React Native)

This document provides a complete template for creating a new feature module using Convex backend and React Native frontend.

---

## Quick Start

When creating a new feature called `{feature}`, create the following structure:

### Frontend Structure

```
features/{feature}/
├── components/
│   ├── {feature}-card.tsx
│   ├── {feature}-list.tsx
│   ├── {feature}-form.tsx
│   └── {feature}-detail.tsx
├── hooks/
│   ├── use-{feature}-data.ts      # Convex wrappers
│   └── use-{feature}-form.ts      # Form logic
├── stores/
│   └── {internal-alias}-store.ts      # UI state only
├── types/
│   └── {feature}.types.ts
└── index.ts                        # Public API
```

### Backend Structure (Convex)

```
convex/{feature}/
├── queries.ts                      # All queries
├── mutations.ts                    # All mutations
├── internal.ts                     # Internal functions
└── helpers.ts                      # Shared helpers (not exported)
```

---

## Backend Templates (Convex)

### 1. Schema Definition

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  {feature}s: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal('active'),
      v.literal('inactive'),
      v.literal('pending'),
    ),
    ownerId: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_ownerId', ['ownerId'])
    .index('by_status', ['status'])
    .index('by_createdAt', ['createdAt'])
    .searchIndex('search_name', {
      searchField: 'name',
    }),
});
```

### 2. Queries File

```typescript
// convex/{feature}/queries.ts
import { query } from '../_generated/server';
import { v } from 'convex/values';
import { getCurrentUserOrThrow } from '../users/helpers';

/**
 * List all {feature}s with optional filters
 */
export const list = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.union(v.literal('active'), v.literal('inactive'), v.literal('pending'))),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('{feature}s'),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      status: v.union(v.literal('active'), v.literal('inactive'), v.literal('pending')),
      ownerId: v.id('users'),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    let query = ctx.db.query('{feature}s');

    // Apply search filter
    if (args.search) {
      query = query.withSearchIndex('search_name', q =>
        q.search('name', args.search),
      );
    }

    // Apply status filter
    if (args.status) {
      query = query.withIndex('by_status', q => q.eq('status', args.status));
    }

    const {feature}s = await query.take(args.limit ?? 100);
    return {feature}s;
  },
});

/**
 * Get a single {feature} by ID
 */
export const getById = query({
  args: { {feature}Id: v.id('{feature}s') },
  returns: v.union(
    v.object({
      _id: v.id('{feature}s'),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      status: v.union(v.literal('active'), v.literal('inactive'), v.literal('pending')),
      ownerId: v.id('users'),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.{feature}Id);
  },
});

/**
 * Get {feature}s owned by a specific user
 */
export const listByUserId = query({
  args: { userId: v.id('users') },
  returns: v.array(
    v.object({
      _id: v.id('{feature}s'),
      name: v.string(),
      status: v.union(v.literal('active'), v.literal('inactive'), v.literal('pending')),
    }),
  ),
  handler: async (ctx, args) => {
    const {feature}s = await ctx.db
      .query('{feature}s')
      .withIndex('by_ownerId', q => q.eq('ownerId', args.userId))
      .collect();

    return {feature}s;
  },
});
```

### 3. Mutations File

```typescript
// convex/{feature}/mutations.ts
import { mutation } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { getCurrentUserOrThrow } from '../users/helpers';

/**
 * Create a new {feature}
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id('{feature}s'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Validation
    if (args.name.length < 2) {
      throw new ConvexError('Name must be at least 2 characters');
    }

    const now = Date.now();
    const {feature}Id = await ctx.db.insert('{feature}s', {
      name: args.name,
      description: args.description,
      status: 'active',
      ownerId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    return {feature}Id;
  },
});

/**
 * Update an existing {feature}
 */
export const update = mutation({
  args: {
    {feature}Id: v.id('{feature}s'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal('active'), v.literal('inactive'), v.literal('pending'))),
  },
  returns: v.id('{feature}s'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    const {feature} = await ctx.db.get(args.{feature}Id);
    if (!{feature}) {
      throw new ConvexError('{Feature} not found');
    }

    // Check ownership
    if ({feature}.ownerId !== user._id) {
      throw new ConvexError('Not authorized');
    }

    // Prepare update object
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.{feature}Id, updates);
    return args.{feature}Id;
  },
});

/**
 * Delete a {feature}
 */
export const delete{Feature} = mutation({
  args: { {feature}Id: v.id('{feature}s') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    const {feature} = await ctx.db.get(args.{feature}Id);
    if (!{feature}) {
      throw new ConvexError('{Feature} not found');
    }

    // Check ownership
    if ({feature}.ownerId !== user._id) {
      throw new ConvexError('Not authorized');
    }

    await ctx.db.delete(args.{feature}Id);
    return null;
  },
});

/**
 * Update {feature} status
 */
export const updateStatus = mutation({
  args: {
    {feature}Id: v.id('{feature}s'),
    status: v.union(v.literal('active'), v.literal('inactive'), v.literal('pending')),
  },
  returns: v.id('{feature}s'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    const {feature} = await ctx.db.get(args.{feature}Id);
    if (!{feature}) {
      throw new ConvexError('{Feature} not found');
    }

    if ({feature}.ownerId !== user._id) {
      throw new ConvexError('Not authorized');
    }

    await ctx.db.patch(args.{feature}Id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return args.{feature}Id;
  },
});
```

### 4. Helpers File

```typescript
// convex/{feature}/helpers.ts
import type { QueryCtx, MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { ConvexError } from 'convex/values';

/**
 * Get {feature} by ID and verify ownership
 */
export async function get{Feature}WithOwnership(
  ctx: QueryCtx | MutationCtx,
  {feature}Id: Id<'{feature}s'>,
  userId: Id<'users'>,
) {
  const {feature} = await ctx.db.get({feature}Id);
  
  if (!{feature}) {
    throw new ConvexError('{Feature} not found');
  }

  if ({feature}.ownerId !== userId) {
    throw new ConvexError('Not authorized');
  }

  return {feature};
}

/**
 * Validate {feature} name
 */
export function validate{Feature}Name(name: string): void {
  if (name.length < 2) {
    throw new ConvexError('Name must be at least 2 characters');
  }
  if (name.length > 100) {
    throw new ConvexError('Name must be less than 100 characters');
  }
}
```

---

## Frontend Templates (React Native)

### 1. Types File

```typescript
// features/{feature}/types/{feature}.types.ts
import type { Doc } from '@/convex/_generated/dataModel';

// ✅ Use Convex's auto-generated Doc<> type
// This includes all schema fields + system fields (_id, _creationTime)
export type {Feature} = Doc<'{feature}s'>;

// ✅ Define custom types for UI/forms (not from database)
export type {Feature}Status = 'active' | 'inactive' | 'pending';

export interface {Feature}FormValues {
  name: string;
  description?: string;
}

export interface Update{Feature}FormValues {
  name?: string;
  description?: string;
  status?: {Feature}Status;
}
```

### 2. Hooks File (Convex Wrappers)

```typescript
// features/{feature}/hooks/use-{feature}-data.ts
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { {Feature}Status } from '../types/{feature}.types';

/**
 * Get all {feature}s with optional filters
 */
export function use{Feature}List(filters?: {
  search?: string;
  status?: {Feature}Status;
}) {
  return useQuery(api.{feature}.queries.list, filters || {});
}

/**
 * Get a single {feature} by ID
 */
export function use{Feature}({feature}Id: Id<'{feature}s'>) {
  return useQuery(api.{feature}.queries.getById, { {feature}Id });
}

/**
 * Get {feature}s for a specific user
 */
export function use{Feature}sByUserId(userId: Id<'users'>) {
  return useQuery(api.{feature}.queries.listByUserId, { userId });
}

/**
 * Create a new {feature}
 */
export function useCreate{Feature}() {
  return useMutation(api.{feature}.mutations.create);
}

/**
 * Update an existing {feature}
 */
export function useUpdate{Feature}() {
  return useMutation(api.{feature}.mutations.update);
}

/**
 * Delete a {feature}
 */
export function useDelete{Feature}() {
  return useMutation(api.{feature}.mutations.delete{Feature});
}

/**
 * Update {feature} status
 */
export function useUpdate{Feature}Status() {
  return useMutation(api.{feature}.mutations.updateStatus);
}
```

### 3. UI Store File

```typescript
// features/{feature}/stores/{feature}-ui-store.ts
import { create } from 'zustand';
import type { Id } from '@/convex/_generated/dataModel';
import type { {Feature}Status } from '../types/{feature}.types';

interface {Feature}UIState {
  // Filters
  searchQuery: string;
  statusFilter: {Feature}Status | 'all';

  // Sheets/Modals
  isCreateSheetOpen: boolean;
  isEditSheetOpen: boolean;
  isDeleteSheetOpen: boolean;
  
  // Selection
  selectedId: Id<'{feature}s'> | null;
  deleteTargetId: Id<'{feature}s'> | null;
}

interface {Feature}UIActions {
  // Filters
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: {Feature}Status | 'all') => void;
  resetFilters: () => void;

  // Sheets
  openCreateSheet: () => void;
  closeCreateSheet: () => void;
  openEditSheet: (id: Id<'{feature}s'>) => void;
  closeEditSheet: () => void;
  openDeleteSheet: (id: Id<'{feature}s'>) => void;
  closeDeleteSheet: () => void;

  // Selection
  setSelectedId: (id: Id<'{feature}s'> | null) => void;
}

const initialState: {Feature}UIState = {
  searchQuery: '',
  statusFilter: 'all',
  isCreateSheetOpen: false,
  isEditSheetOpen: false,
  isDeleteSheetOpen: false,
  selectedId: null,
  deleteTargetId: null,
};

export const use{Feature}UIStore = create<{Feature}UIState & {Feature}UIActions>(set => ({
  ...initialState,

  setSearchQuery: query => set({ searchQuery: query }),
  setStatusFilter: status => set({ statusFilter: status }),
  resetFilters: () =>
    set({ searchQuery: '', statusFilter: 'all' }),

  openCreateSheet: () => set({ isCreateSheetOpen: true }),
  closeCreateSheet: () => set({ isCreateSheetOpen: false }),

  openEditSheet: id =>
    set({ isEditSheetOpen: true, selectedId: id }),
  closeEditSheet: () =>
    set({ isEditSheetOpen: false, selectedId: null }),

  openDeleteSheet: id =>
    set({ isDeleteSheetOpen: true, deleteTargetId: id }),
  closeDeleteSheet: () =>
    set({ isDeleteSheetOpen: false, deleteTargetId: null }),

  setSelectedId: id => set({ selectedId: id }),
}));
```

### 4. Card Component

```typescript
// features/{feature}/components/{feature}-card.tsx
import { memo } from 'react';
import { View, Pressable } from 'react-native';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { router } from 'expo-router';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react-native';
import type { Id } from '@/convex/_generated/dataModel';
import type { {Feature}Status } from '../types/{feature}.types';

interface {Feature}CardProps {
  item: {
    _id: Id<'{feature}s'>;
    name: string;
    description?: string;
    status: {Feature}Status;
  };
  onEdit?: (id: Id<'{feature}s'>) => void;
  onDelete?: (id: Id<'{feature}s'>) => void;
}

function {Feature}CardComponent({ item, onEdit, onDelete }: {Feature}CardProps) {
  function handlePress() {
    router.push(`/{feature}s/${item._id}`);
  }

  function handleEditPress() {
    onEdit?.(item._id);
  }

  function handleDeletePress() {
    onDelete?.(item._id);
  }

  const statusConfig = getStatusConfig(item.status);

  return (
    <Pressable onPress={handlePress}>
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <Text className="text-lg font-semibold flex-1">{item.name}</Text>
          <Badge variant={statusConfig.variant}>
            <Text>{statusConfig.label}</Text>
          </Badge>
        </CardHeader>

        <CardContent>
          {item.description && (
            <Text className="text-sm text-muted-foreground mb-4">
              {item.description}
            </Text>
          )}

          <View className="flex-row gap-2">
            <Button variant="outline" size="sm" onPress={handleEditPress}>
              <Pencil size={16} />
              <Text>Edit</Text>
            </Button>
            <Button variant="destructive" size="sm" onPress={handleDeletePress}>
              <Trash2 size={16} />
              <Text>Delete</Text>
            </Button>
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );
}

// Status configuration
const STATUS_CONFIG = {
  active: { label: 'Active', variant: 'success' as const },
  inactive: { label: 'Inactive', variant: 'secondary' as const },
  pending: { label: 'Pending', variant: 'warning' as const },
} as const;

function getStatusConfig(status: {Feature}Status) {
  return STATUS_CONFIG[status];
}

export const {Feature}Card = memo({Feature}CardComponent);
```

### 5. List Component

```typescript
// features/{feature}/components/{feature}-list.tsx
import { ListScreenLayout } from '@/components/layout/list-screen';
import { {Feature}Card } from './{feature}-card';
import { use{Feature}List } from '../hooks/use-{feature}-data';
import { use{Feature}UIStore } from '../stores/{feature}-ui-store';

export function {Feature}List() {
  const { searchQuery, setSearchQuery, statusFilter, openDeleteSheet } =
    use{Feature}UIStore();

  const {feature}s = use{Feature}List({
    search: searchQuery || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  function handleEdit(id: Id<'{feature}s'>) {
    // Navigate to edit screen or open sheet
  }

  return (
    <ListScreenLayout
      data={{feature}s}
      renderItem={item => (
        <{Feature}Card
          item={item}
          onEdit={handleEdit}
          onDelete={openDeleteSheet}
        />
      )}
      keyExtractor={item => item._id}
      estimatedItemSize={120}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search {feature}s..."
      emptyMessage="No {feature}s found"
    />
  );
}
```

### 6. Barrel Export (Feature Index)

**Choose Pattern Based on Feature Size:**

#### Pattern A: Explicit Exports (For Small Features)

Use this when **all subfolders have <10 files each**.

```typescript
// features/{feature}/index.ts

// Components (assume 4 files)
export { {Feature}Card } from './components/{feature}-card';
export { {Feature}List } from './components/{feature}-list';
export { {Feature}Form } from './components/{feature}-form';
export { {Feature}Detail } from './components/{feature}-detail';

// Hooks (assume 7 files)
export {
  use{Feature}List,
  use{Feature},
  use{Feature}sByUserId,
  useCreate{Feature},
  useUpdate{Feature},
  useDelete{Feature},
  useUpdate{Feature}Status,
} from './hooks/use-{feature}-data';

// Stores (assume 1 file)
export { use{Feature}UIStore } from './stores/{feature}-ui-store';

// Types (assume 1 file)
export type {
  {Feature},
  {Feature}Status,
  {Feature}FormValues,
  Update{Feature}FormValues,
} from './types/{feature}.types';
```

**Benefits:**
- ✅ Clear public API at a glance
- ✅ Better "Go to Definition" in IDE
- ✅ Easier code review
- ✅ Better tree-shaking

**Use When:**
- Feature is small to medium size
- All subfolders have <10 files
- Public API is stable

#### Pattern B: Subfolder Indexes (For Large Features)

Use this when **any subfolder has 10+ files**.

```typescript
// features/{feature}/components/index.ts (12 component files)
export { {Feature}Card } from './{feature}-card';
export { {Feature}List } from './{feature}-list';
export { {Feature}Form } from './{feature}-form';
export { {Feature}Detail } from './{feature}-detail';
export { {Feature}Grid } from './{feature}-grid';
export { {Feature}Table } from './{feature}-table';
export { {Feature}Filter } from './{feature}-filter';
export { {Feature}Sort } from './{feature}-sort';
export { {Feature}Actions } from './{feature}-actions';
export { {Feature}Header } from './{feature}-header';
export { {Feature}Footer } from './{feature}-footer';
export { {Feature}Skeleton } from './{feature}-skeleton';

// features/{feature}/hooks/index.ts (15 hook files)
export { use{Feature}List } from './use-{feature}-list';
export { use{Feature} } from './use-{feature}';
export { useCreate{Feature} } from './use-create-{feature}';
export { useUpdate{Feature} } from './use-update-{feature}';
export { useDelete{Feature} } from './use-delete-{feature}';
// ... 10 more exports

// features/{feature}/index.ts (root - just re-export from subfolders)
export * from './components';
export * from './hooks';
export * from './stores';
export type * from './types';
```

**Benefits:**
- ✅ Less maintenance for large features
- ✅ Easy to add new files (just export in subfolder index)
- ✅ Organized by domain

**Use When:**
- ANY subfolder has 10+ files
- Feature is complex/large
- Public API changes frequently

#### Decision Algorithm

```
FOR EACH subfolder in feature (hooks/, components/, types/, stores/):
  count = number of files in subfolder
  IF count >= 10:
    RETURN "Use Pattern B (Subfolder Indexes)"
  END IF
END FOR

RETURN "Use Pattern A (Explicit Exports)"
```

#### Anti-Pattern: Avoid Premature Subfolder Indexes

```typescript
// ❌ BAD - Unnecessary subfolder index for 2 hooks
// features/users/hooks/index.ts
export * from './use-current-user';
export * from './use-update-display-name';

// features/users/index.ts
export * from './hooks';

// ✅ GOOD - Direct exports for small feature
// features/users/index.ts
export { useCurrentUser } from './hooks/use-current-user';
export { useUpdateDisplayName } from './hooks/use-update-display-name';
```

**Why avoid premature subfolder indexes:**
- Adds unnecessary files and indirection
- Makes "Go to Definition" slower (extra hop)
- Harder to see full API
- No real benefit for small features

---

## Screen Template

```typescript
// app/(protected)/{feature}s/index.tsx
import { Stack } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/screen-wrapper';
import { {Feature}List } from '@/features/{feature}';

export default function {Feature}sScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: '{Feature}s',
          headerLargeTitle: true,
        }}
      />
      <ScreenWrapper scrollable={false} padding={false}>
        <{Feature}List />
      </ScreenWrapper>
    </>
  );
}
```

---

## Checklist

When creating a new feature, ensure you have:

### Backend (Convex)
- [ ] Added table to `convex/schema.ts`
- [ ] Created `convex/{feature}/queries.ts` with all query functions
- [ ] Created `convex/{feature}/mutations.ts` with all mutation functions
- [ ] Created `convex/{feature}/helpers.ts` for shared logic (if needed)
- [ ] Added proper validators to all functions
- [ ] Added JSDoc comments for public functions
- [ ] Added proper error handling with `ConvexError`
- [ ] Tested all functions work correctly

### Frontend (React Native)
- [ ] Created feature folder structure
- [ ] Defined TypeScript types
- [ ] Created Convex wrapper hooks
- [ ] Created Zustand UI store (for UI state only)
- [ ] Created core components (card, list, form, detail)
- [ ] Created barrel export file
- [ ] Added feature to routes
- [ ] Tested all components render correctly
- [ ] Added to navigation (if visible to users)

### Testing
- [ ] Tested create/update/delete flows
- [ ] Tested loading states
- [ ] Tested empty states
- [ ] Tested error handling
- [ ] Tested permissions/authorization
