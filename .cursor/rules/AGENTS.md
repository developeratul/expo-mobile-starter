# AGENTS.md — Application Guidelines

> **Purpose**: AI-optimized guide for maintaining, generating, and refactoring the codebase.
> Humans may find it useful, but guidance here is optimized for automation and consistency by AI-assisted workflows.

---

## Quick Reference

| Aspect         | Standard                                                             |
| -------------- | -------------------------------------------------------------------- |
| File naming    | `kebab-case.tsx`, `use-user.ts`, `format-number.ts`                  |
| Functions      | Regular functions for main logic, arrow functions for callbacks only |
| Backend        | Convex — real-time database with type-safe functions                 |
| State (server) | Convex hooks (`useQuery`, `useMutation`) — auto-syncing             |
| State (UI)     | Zustand — modals, sidebars, temporary selections                     |
| Forms          | React Hook Form + Zod validation                                     |
| Styling        | Tailwind CSS + NativeWind + RN Reusables (shadcn/ui-based)          |
| Routing        | Expo Router (file-based routing)                                     |
| Auth           | Clerk + Convex auth integration                                      |
| Code Quality   | DRY (extract repeated code), no props drilling                       |

---

## 1. Project Structure (Feature-First)

```
project-root/
├── app/                    # Expo Router (file-based routing)
│   ├── (auth)/            # Auth group (sign-in, sign-up)
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── (protected)/       # Protected routes (require auth)
│   │   ├── _layout.tsx
│   │   ├── index.tsx      # Home screen
│   │   ├── profile.tsx    # Profile screen
│   │   └── settings.tsx   # Settings screen
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Landing/redirect
│   └── +not-found.tsx     # 404 screen
│
├── convex/                 # Convex backend (domain-based)
│   ├── _generated/        # Auto-generated (DO NOT edit)
│   │   ├── api.d.ts       # Function references
│   │   ├── dataModel.d.ts # Type definitions
│   │   └── server.d.ts    # Server types
│   ├── schema.ts          # Database schema
│   ├── http.ts            # HTTP endpoints (webhooks)
│   │
│   ├── users/             # User domain (split by function type)
│   │   ├── queries.ts     # All user queries
│   │   ├── mutations.ts   # All user mutations
│   │   ├── internal.ts    # Internal-only functions
│   │   └── helpers.ts     # Shared helpers (not exported)
│   │
│   └── messages/          # Message domain
│       ├── queries.ts
│       ├── mutations.ts
│       └── helpers.ts
│
├── features/               # Frontend features (vertical slices)
│   ├── users/
│   │   ├── components/    # User-specific components
│   │   ├── hooks/         # Convex wrappers
│   │   ├── stores/        # UI state only
│   │   ├── types/
│   │   └── index.ts       # Public API
│   └── messages/
│       ├── components/
│       ├── hooks/
│       ├── stores/
│       └── index.ts
│
├── components/             # Shared components
│   ├── ui/                # UI primitives (RN Reusables)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   ├── layout/            # Layout components
│   │   ├── screen-wrapper.tsx
│   │   └── list-screen.tsx
│   └── shared/            # Shared business components
│
├── lib/                    # Utility functions
│   ├── utils.ts           # Generic utilities
│   ├── theme.ts           # Theme configuration
│   └── env.ts             # Environment variables
│
├── hooks/                  # Custom React hooks
│   ├── use-auth.ts
│   └── use-theme.ts
│
├── providers/              # Context providers
│   ├── clerk.tsx          # Clerk auth provider
│   ├── convex.tsx         # Convex client provider
│   └── index.ts
│
├── types/                  # Shared TypeScript types
│   └── base.d.ts
│
├── stores/                 # Zustand stores (UI state only)
│   ├── use-user-store.ts
│   └── use-theme-store.ts
│
├── assets/                 # Static assets (images, fonts)
│   └── images/
│
├── global.css              # Global Tailwind styles
├── tailwind.config.js      # Tailwind configuration
├── app.config.ts           # Expo configuration
└── package.json
```

### Architecture Rules (STRICT)

These rules are **non-negotiable** and must be followed for all new code:

| Layer          | Rule                                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `app/`         | **Route screens only.** Screens contain minimal logic, mainly composition and navigation. Business logic belongs in components.   |
| `components/`  | **Feature-based organization.** Group components by domain (users, projects, messages). Keep domain logic colocated.             |
| `convex/`      | **Backend functions.** Organize by domain/feature. Use file-based routing. Keep related functions together.                       |
| `lib/`         | **Truly generic utilities.** No feature-specific code. Must work across all features.                                            |

**Dependency Flow (one-way only):**

```
app/ (screens) → components/ (features) → lib/ (utilities)
                       ↓
                  convex/ (backend)
```

**What belongs where:**

| Location       | Contains                                                           | Cannot Import From      |
| -------------- | ------------------------------------------------------------------ | ----------------------- |
| `app/`         | Route screens, layouts, navigation setup                           | Component internals     |
| `components/`  | Feature components, domain logic, UI composition                   | Other feature internals |
| `convex/`      | Database queries, mutations, actions, business logic               | Frontend code           |
| `lib/`         | Generic utilities, theme, helpers, shared types                    | Features, components    |

### Import Rules (CRITICAL)

```typescript
// ✅ ALLOWED imports
import { Button } from '@/components/ui/button'; // UI primitives
import { UserCard } from '@/components/users/user-card'; // Feature components
import { api } from '@/convex/_generated/api'; // Convex functions
import { formatDate } from '@/lib/utils'; // Shared utilities
import { useAuth } from '@clerk/clerk-expo'; // External libraries

// ✅ Convex imports
import { useQuery, useMutation } from 'convex/react';
import { query, mutation } from './_generated/server'; // In convex files
import type { Id } from '@/convex/_generated/dataModel'; // Type imports

// ❌ FORBIDDEN imports
import { UserCardInternal } from '@/components/users/internal/user-card-internal'; // BAD: internal
import { userStore } from '@/components/users/store'; // BAD: should be in stores/
import '../../../lib/utils'; // BAD: relative imports across folders

// ✅ CORRECT: use absolute imports with @/ alias
import { formatDate } from '@/lib/utils';
```

### Feature Index Export Patterns (AI Decision Logic)

**Rule: Choose export pattern based on subfolder file count**

```python
def choose_export_pattern(feature_path):
    """
    Algorithm for AI agents to decide which export pattern to use
    """
    subfolders = ['hooks/', 'components/', 'types/', 'stores/']
    max_file_count = 0
    
    for subfolder in subfolders:
        file_count = count_files(f"{feature_path}/{subfolder}")
        max_file_count = max(max_file_count, file_count)
    
    if max_file_count >= 10:
        return "PATTERN_B_SUBFOLDER_INDEXES"
    else:
        return "PATTERN_A_EXPLICIT_EXPORTS"
```

#### Pattern A: Explicit Exports (Default for Small Features)

**When:** All subfolders have <10 files

```typescript
// features/users/index.ts
// File counts: hooks=2, components=0, types=1, stores=0
// Max=2 → Use Pattern A

export { useCurrentUser } from './hooks/use-current-user';
export { useUpdateDisplayName } from './hooks/use-update-display-name';
export type { User } from './types/user.types';
```

**Why this is better:**
- Direct IDE navigation to actual file
- Clear public API visibility
- Better tree-shaking
- Simpler for code review

#### Pattern B: Subfolder Indexes (For Large Features)

**When:** ANY subfolder has 10+ files

```typescript
// features/projects/hooks/index.ts (15 files in hooks/)
export { useProjects } from './use-projects';
export { useProject } from './use-project';
export { useCreateProject } from './use-create-project';
export { useUpdateProject } from './use-update-project';
export { useDeleteProject } from './use-delete-project';
export { useProjectMembers } from './use-project-members';
export { useProjectSettings } from './use-project-settings';
export { useProjectTasks } from './use-project-tasks';
export { useProjectFiles } from './use-project-files';
export { useProjectActivity } from './use-project-activity';
export { useProjectAnalytics } from './use-project-analytics';
export { useProjectExport } from './use-project-export';
export { useProjectImport } from './use-project-import';
export { useProjectShare } from './use-project-share';
export { useProjectArchive } from './use-project-archive';

// features/projects/index.ts (root)
export * from './hooks';
export * from './components';
export type * from './types';
```

**Why use this for large features:**
- Less maintenance (just add to subfolder index)
- Organized by domain
- Root index stays clean

#### Anti-Pattern: Premature Optimization

```typescript
// ❌ DON'T DO THIS: Subfolder index for tiny feature
// features/users/hooks/index.ts (only 2 hooks!)
export * from './use-current-user';
export * from './use-update-display-name';

// features/users/index.ts
export * from './hooks';  // Unnecessary indirection
```

**Why this is bad:**
- Extra file with no benefit
- Slower IDE navigation (extra hop)
- Can't see full API at a glance
- Adds complexity for no gain

**AI Agent Checklist:**
- [ ] Count files in each subfolder
- [ ] If max_count >= 10 → Use Pattern B (subfolder indexes)
- [ ] If max_count < 10 → Use Pattern A (explicit exports)
- [ ] Never create subfolder indexes for <10 files

---

## 2. Naming Conventions

### Files (kebab-case)

```
✅ CORRECT                    ❌ WRONG
user-profile.tsx              UserProfile.tsx
use-auth.ts                   useAuth.ts
format-currency.ts            formatCurrency.ts
client-keys.ts                clientKeys.ts
auth.types.ts                 auth.types.ts (✅ this is fine)
```

### Functions

```typescript
// ✅ Main functions: regular function declarations
function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  })
  return formatter.format(amount)
}

// ✅ React components: regular function declarations
function UserProfile({ userId }: UserProfileProps) {
  const { data: user } = useUser(userId)
  return <div>{user?.name}</div>
}

// ✅ Hooks: regular function declarations
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// ✅ Callbacks: regular function declarations
function handleSubmit(event: FormEvent) {
  event.preventDefault()
  // ...
}

// ✅ Callbacks within function/method: arrow functions
const filteredItems = items.filter((item) => item.isActive)

const mappedData = data.map((item) => ({
  id: item.id,
  label: item.name,
}))
```

### Variables and Parameters (Descriptive Names)

```typescript
// ❌ WRONG: cryptic names
const [d, setD] = useState([]);
items.forEach((e, i) => console.log(i, e));
function calc(a, b) {
  return a + b;
}

// ✅ CORRECT: descriptive names
const [clients, setClients] = useState<Client[]>([]);
items.forEach((item, index) => console.log(index, item));
function calculateTotal(subtotal: number, taxRate: number): number {
  return subtotal * (1 + taxRate);
}

// ✅ Loop variables should describe what they contain
for (const client of clients) {
  /* ... */
}
for (const [fieldName, fieldValue] of Object.entries(formData)) {
  /* ... */
}

// ✅ Event handlers should indicate the event type
function handleUserClick(event: MouseEvent) {
  /* ... */
}
function handleFormSubmit(event: FormEvent) {
  /* ... */
}
function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
  /* ... */
}
```

---

## 3. Convex Backend Pattern

> **This project uses Convex** — a real-time database with type-safe functions, not REST APIs.

### 3.1 Convex File Organization (Feature-Based)

Organize Convex functions by feature/domain in the `convex/` directory:

```
convex/
├── _generated/          # Auto-generated Convex types (DO NOT edit)
│   ├── api.d.ts
│   ├── api.js
│   ├── dataModel.d.ts
│   ├── server.d.ts
│   └── server.js
├── schema.ts            # Database schema definition
├── http.ts              # HTTP endpoints (webhooks, etc.)
├── users.ts             # User-related functions
├── messages.ts          # Message functions
├── projects/            # Feature folders (optional)
│   ├── queries.ts
│   ├── mutations.ts
│   └── helpers.ts       # Internal helper functions
└── README.md
```

**Key principles:**
- **File-based routing**: A function `list` in `convex/messages.ts` → `api.messages.list`
- **Organize by domain**: Group related functions (users, messages, projects, etc.)
- **No API wrappers needed**: Call functions directly using Convex hooks
- **Type safety built-in**: Convex generates types automatically

### 3.2 Defining Convex Functions

**Always use the new function syntax** with explicit validators:

```typescript
// convex/users.ts
import { query, mutation, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';

// ─────────────────────────────────────────────────────────────
// QUERIES (read-only, real-time)
// ─────────────────────────────────────────────────────────────

export const current = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      clerkId: v.string(),
      displayName: v.string(),
      email: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', identity.subject))
      .unique();
  },
});

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
    let users = ctx.db.query('users');

    // Filter by search if provided
    if (args.search) {
      users = users.withSearchIndex('search_displayName', q =>
        q.search('displayName', args.search),
      );
    }

    return await users.collect();
  },
});

// ─────────────────────────────────────────────────────────────
// MUTATIONS (write operations)
// ─────────────────────────────────────────────────────────────

export const updateDisplayName = mutation({
  args: {
    displayName: v.string(),
  },
  returns: v.id('users'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    await ctx.db.patch(user._id, { displayName: args.displayName });
    return user._id;
  },
});

export const create = mutation({
  args: {
    clerkId: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
  },
  returns: v.id('users'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('users', args);
  },
});

// ─────────────────────────────────────────────────────────────
// INTERNAL FUNCTIONS (not exposed to client)
// ─────────────────────────────────────────────────────────────

export const upsertFromClerk = internalMutation({
  args: { data: v.any() }, // Clerk webhook data
  returns: v.null(),
  handler: async (ctx, { data }) => {
    const displayName = `${data.first_name || ''} ${data.last_name || ''}`.trim();

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', data.id))
      .unique();

    if (!user) {
      await ctx.db.insert('users', {
        clerkId: data.id,
        displayName,
        email: data.email_addresses?.[0]?.email_address,
        avatarUrl: data.image_url,
      });
    } else {
      await ctx.db.patch(user._id, { displayName, email: data.email_addresses?.[0]?.email_address });
    }

    return null;
  },
});
```

### 3.3 Convex Schema Definition

Define your schema in `convex/schema.ts`:

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  })
    .index('by_clerkId', ['clerkId'])
    .index('by_email', ['email']),

  messages: defineTable({
    text: v.string(),
    authorId: v.id('users'),
    channelId: v.optional(v.string()),
    isCompleted: v.boolean(),
  })
    .index('by_authorId', ['authorId'])
    .index('by_channelId', ['channelId']),

  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id('users'),
    status: v.union(v.literal('active'), v.literal('archived'), v.literal('draft')),
  })
    .index('by_ownerId', ['ownerId'])
    .index('by_status', ['status']),
});
```

**Schema rules:**
- Always include index fields in the index name: `by_field1_and_field2`
- System fields (`_id`, `_creationTime`) are added automatically
- Use `v.optional()` for nullable fields
- Create indexes for fields you'll query frequently

### 3.4 Using Convex Functions in React Components

**NO API wrappers or query keys needed** — just call functions directly:

```typescript
// app/(protected)/users.tsx
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

function UsersPage() {
  // ✅ Queries (read-only, auto-syncing)
  const currentUser = useQuery(api.users.current);
  const users = useQuery(api.users.list, { search: '' });

  // ✅ Mutations (write operations)
  const updateDisplayName = useMutation(api.users.updateDisplayName);
  const createUser = useMutation(api.users.create);

  // Handle loading states
  if (currentUser === undefined || users === undefined) {
    return <LoadingSpinner />;
  }

  // Handle null user (not authenticated)
  if (!currentUser) {
    return <SignInPrompt />;
  }

  async function handleUpdateName(newName: string) {
    try {
      await updateDisplayName({ displayName: newName });
      toast.success('Name updated!');
    } catch (error) {
      toast.error('Failed to update name');
    }
  }

  return (
    <View>
      <Text>Current User: {currentUser.displayName}</Text>
      <Button onPress={() => handleUpdateName('New Name')}>
        Update Name
      </Button>
      
      {users.map(user => (
        <UserCard key={user._id} user={user} />
      ))}
    </View>
  );
}
```

**Key differences from REST APIs:**
- `undefined` = loading (not yet fetched)
- `null` = data doesn't exist (e.g., no user found)
- Data updates **automatically in real-time** when database changes
- No need for `invalidateQueries` or manual cache management
- Type safety enforced at compile time

### 3.5 Calling Internal Functions

Internal functions can only be called from other Convex functions:

```typescript
// convex/projects.ts
import { mutation, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id('projects'),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const projectId = await ctx.db.insert('projects', {
      name: args.name,
      description: args.description,
      ownerId: userId,
      status: 'draft',
    });

    // Schedule internal task
    await ctx.scheduler.runAfter(0, internal.projects.sendWelcomeEmail, {
      projectId,
      userId,
    });

    return projectId;
  },
});

// Internal function (not accessible from client)
export const sendWelcomeEmail = internalMutation({
  args: {
    projectId: v.id('projects'),
    userId: v.id('users'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    const user = await ctx.db.get(args.userId);
    
    // Send email logic here
    console.log(`Sending welcome email for project: ${project?.name} to ${user?.email}`);
    
    return null;
  },
});
```

### 3.6 HTTP Endpoints (Webhooks)

For external integrations like Clerk webhooks:

```typescript
// convex/http.ts
import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';
import { Webhook } from 'svix';

const http = httpRouter();

http.route({
  path: '/clerk-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response('Missing webhook secret', { status: 500 });
    }

    // Verify webhook signature
    const svix_id = req.headers.get('svix-id');
    const svix_timestamp = req.headers.get('svix-timestamp');
    const svix_signature = req.headers.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response('Missing svix headers', { status: 400 });
    }

    const body = await req.text();
    const wh = new Webhook(webhookSecret);

    let payload;
    try {
      payload = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
    } catch (error) {
      return new Response('Invalid signature', { status: 400 });
    }

    // Call internal mutation to handle the webhook
    await ctx.runMutation(internal.users.upsertFromClerk, { data: payload.data });

    return new Response('OK', { status: 200 });
  }),
});

export default http;
```

---

## 4. React Native / Expo Patterns

### 4.1 Component Naming & Structure

**Use React Native components** (not web elements):

```typescript
// ❌ WRONG: web components
<div className="container">
  <p className="text">Hello</p>
  <button onClick={handleClick}>Click</button>
</div>

// ✅ CORRECT: React Native components
<View className="container">
  <Text className="text">Hello</Text>
  <Pressable onPress={handleClick}>
    <Text>Click</Text>
  </Pressable>
</View>
```

**Use RN Reusables UI components** (shadcn/ui for React Native):

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text'; // Themed text component

// ✅ CORRECT
<Card>
  <CardHeader>
    <Text className="text-xl font-bold">Title</Text>
  </CardHeader>
  <CardContent>
    <Input placeholder="Enter name" />
    <Button onPress={handleSubmit}>
      <Text>Submit</Text>
    </Button>
  </CardContent>
</Card>
```

### 4.2 Navigation with Expo Router

**File-based routing** (similar to Next.js):

```typescript
// app/(protected)/profile.tsx
import { Stack } from 'expo-router';

export default function ProfileScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerBackTitle: 'Back',
        }}
      />
      <View className="flex-1 p-4">
        <Text>Profile Content</Text>
      </View>
    </>
  );
}

// Navigation
import { router } from 'expo-router';

// Navigate to screen
router.push('/profile');
router.push('/users/123'); // Dynamic route

// Go back
router.back();
```

### 4.3 Styling with NativeWind (Tailwind for RN)

```typescript
// ✅ Use className with Tailwind classes
<View className="flex-1 bg-background p-4">
  <Text className="text-2xl font-bold text-foreground">
    Hello World
  </Text>
  <Button className="mt-4 bg-primary">
    <Text className="text-primary-foreground">Click Me</Text>
  </Button>
</View>

// ✅ Conditional classes
<View className={cn(
  'p-4 rounded-lg',
  isActive ? 'bg-primary' : 'bg-secondary',
  isLarge && 'p-6',
)}>
  <Text>Content</Text>
</View>
```

### 4.4 Lists & Performance

**Use FlashList** (not FlatList) for better performance:

```typescript
import { FlashList } from '@shopify/flash-list';

function UserList({ users }: { users: User[] }) {
  return (
    <FlashList
      data={users}
      estimatedItemSize={80} // Required for FlashList
      keyExtractor={item => item._id}
      renderItem={({ item }) => <UserCard user={item} />}
      contentContainerClassName="gap-2 p-4"
      ListEmptyComponent={<EmptyState />}
    />
  );
}
```

---

## 5. State Management

### 5.1 Convex (Server State) — OWNS ALL DATABASE DATA

```typescript
// ✅ Convex handles:
// - Real-time data syncing (automatically updates when DB changes)
// - Optimistic updates
// - Loading/error states
// - Type safety
// - Authentication state
// - No manual caching needed

// ❌ DO NOT store Convex data in Zustand or any other state
// ❌ DO NOT duplicate server state
```

**Loading states in Convex:**
- `undefined` = loading (query not yet resolved)
- `null` = no data found (e.g., user doesn't exist)
- `data` = actual data

```typescript
function UserProfile() {
  const user = useQuery(api.users.current);

  // undefined = loading
  if (user === undefined) {
    return <LoadingSpinner />;
  }

  // null = not authenticated or user doesn't exist
  if (user === null) {
    return <SignInPrompt />;
  }

  // user exists
  return <Text>{user.displayName}</Text>;
}
```

### 5.2 Zustand (UI State Only)

```typescript
// features/clients/stores/client-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ClientUIState {
  // Filter state
  searchQuery: string;
  selectedStatus: 'all' | 'active' | 'inactive';

  // UI state
  isCreateModalOpen: boolean;
  isDeleteModalOpen: boolean;
  selectedClientId: string | null;

  // View preferences
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

interface ClientUIActions {
  setSearchQuery: (query: string) => void;
  setSelectedStatus: (status: ClientUIState['selectedStatus']) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openDeleteModal: (clientId: string) => void;
  closeDeleteModal: () => void;
  setViewMode: (mode: ClientUIState['viewMode']) => void;
  setSorting: (sortBy: ClientUIState['sortBy'], sortOrder: ClientUIState['sortOrder']) => void;
  reset: () => void;
}

const initialState: ClientUIState = {
  searchQuery: '',
  selectedStatus: 'all',
  isCreateModalOpen: false,
  isDeleteModalOpen: false,
  selectedClientId: null,
  viewMode: 'list',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const useClientUIStore = create<ClientUIState & ClientUIActions>()(
  devtools(
    set => ({
      ...initialState,

      setSearchQuery: query => set({ searchQuery: query }),

      setSelectedStatus: status => set({ selectedStatus: status }),

      openCreateModal: () => set({ isCreateModalOpen: true }),

      closeCreateModal: () => set({ isCreateModalOpen: false }),

      openDeleteModal: clientId =>
        set({
          isDeleteModalOpen: true,
          selectedClientId: clientId,
        }),

      closeDeleteModal: () =>
        set({
          isDeleteModalOpen: false,
          selectedClientId: null,
        }),

      setViewMode: mode => set({ viewMode: mode }),

      setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),

      reset: () => set(initialState),
    }),
    { name: 'client-store' },
  ),
);
```

### 5.3 When to Use What

| Data Type             | Solution            | Example                     |
| --------------------- | ------------------- | --------------------------- |
| Database data         | Convex hooks        | User profile, messages      |
| Loading state         | Convex hooks        | `data === undefined`        |
| Auth state            | Convex + Clerk      | `ctx.auth.getUserIdentity()`|
| Modal open/close      | Zustand             | `isCreateModalOpen`         |
| Sheet/drawer state    | Zustand             | `isDrawerOpen`              |
| Temporary selections  | Zustand             | `selectedIds`               |
| Theme preference      | Zustand (persisted) | `theme: 'light' \| 'dark'`  |
| Form input values     | React Hook Form     | Controlled by form library  |
| Component-local state | useState            | Temporary, component-scoped |
| Navigation params     | Expo Router         | Route params, search params |

### 5.4 Avoiding Props Drilling

**Never pass props through multiple component levels.** Use Zustand or React Context instead.

```typescript
// ❌ BAD: Props drilling through 4+ levels
function ClientsPage() {
  const [selectedId, setSelectedId] = useState(null)
  return <ClientsLayout selectedId={selectedId} setSelectedId={setSelectedId} />
}

function ClientsLayout({ selectedId, setSelectedId }) {
  return <ClientsSidebar selectedId={selectedId} setSelectedId={setSelectedId} />
}

function ClientsSidebar({ selectedId, setSelectedId }) {
  return <ClientsList selectedId={selectedId} setSelectedId={setSelectedId} />
}

function ClientsList({ selectedId, setSelectedId }) {
  // Finally used here after passing through 3 components!
}

// ✅ GOOD: Use Zustand store
// stores/clients-store.ts
export const useClientsUIStore = create((set) => ({
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),
}))

// Any component can access directly
function ClientsList() {
  const { selectedId, setSelectedId } = useClientsUIStore()
  // No props needed!
}

function ClientsHeader() {
  const { selectedId } = useClientsUIStore()
  // Can also access without drilling
}
```

**Rule of thumb:** If a prop passes through **2+ intermediate components** that don't use it, refactor to Zustand or Context.

**When to use Context vs Zustand:**

| Use React Context for      | Use Zustand for          |
| -------------------------- | ------------------------ |
| Theme provider             | Complex UI state         |
| Auth/user provider         | Cross-feature state      |
| Feature-scoped state       | Global app state         |
| Infrequently changing data | Frequently changing data |

---

## 6. Component Patterns

### 6.1 Component Structure

```typescript
// components/users/user-card.tsx
import { memo } from 'react';
import { View, Pressable } from 'react-native';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { formatDate } from '@/lib/utils';
import type { Id } from '@/convex/_generated/dataModel';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface UserCardProps {
  user: {
    _id: Id<'users'>;
    displayName: string;
    email?: string;
    status: 'active' | 'inactive' | 'suspended';
    _creationTime: number;
  };
  onEdit: (userId: Id<'users'>) => void;
  onDelete: (userId: Id<'users'>) => void;
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

function UserCardComponent({ user, onEdit, onDelete }: UserCardProps) {
  function handleEditPress() {
    onEdit(user._id);
  }

  function handleDeletePress() {
    onDelete(user._id);
  }

  const statusVariant = getStatusVariant(user.status);

  return (
    <Card className="p-4">
      <CardHeader className="flex-row items-start justify-between pb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold">{user.displayName}</Text>
          {user.email && (
            <Text className="text-sm text-muted-foreground">{user.email}</Text>
          )}
        </View>
        <Badge variant={statusVariant}>
          <Text>{user.status}</Text>
        </Badge>
      </CardHeader>

      <CardContent>
        <Text className="text-sm text-muted-foreground">
          Created: {formatDate(user._creationTime)}
        </Text>

        <View className="mt-4 flex-row gap-2">
          <Button variant="outline" size="sm" onPress={handleEditPress}>
            <Text>Edit</Text>
          </Button>
          <Button variant="destructive" size="sm" onPress={handleDeletePress}>
            <Text>Delete</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function getStatusVariant(
  status: 'active' | 'inactive' | 'suspended',
): 'default' | 'success' | 'destructive' {
  const STATUS_VARIANTS = {
    active: 'success',
    inactive: 'default',
    suspended: 'destructive',
  } as const;

  return STATUS_VARIANTS[status] ?? 'default';
}

// ─────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────

export const UserCard = memo(UserCardComponent);
```

### 6.2 Container/Presenter Pattern (When Needed)

```typescript
// components/users/user-list.tsx
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { View, Text, FlatList } from 'react-native';

// ─────────────────────────────────────────────────────────────
// CONTAINER (handles data & logic)
// ─────────────────────────────────────────────────────────────

function UserListContainer() {
  const { searchQuery } = useUserUIStore();

  // Convex query (auto-syncs in real-time)
  const users = useQuery(api.users.list, {
    search: searchQuery,
  });

  const deleteUser = useMutation(api.users.delete);

  function handleDelete(userId: Id<'users'>) {
    deleteUser({ userId });
  }

  // undefined = loading
  if (users === undefined) {
    return <UserListSkeleton />;
  }

  // Empty state
  if (users.length === 0) {
    return <EmptyState />;
  }

  return (
    <UserListPresenter
      users={users}
      onDelete={handleDelete}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// PRESENTER (pure UI, easy to test)
// ─────────────────────────────────────────────────────────────

interface UserListPresenterProps {
  users: Array<{
    _id: Id<'users'>;
    displayName: string;
    email?: string;
  }>;
  onDelete: (userId: Id<'users'>) => void;
}

function UserListPresenter({ users, onDelete }: UserListPresenterProps) {
  return (
    <FlatList
      data={users}
      keyExtractor={item => item._id}
      renderItem={({ item }) => (
        <UserCard user={item} onDelete={onDelete} />
      )}
      contentContainerClassName="gap-2 p-4"
    />
  );
}

export { UserListContainer as UserList };
```

---

## 7. Conditional Logic Patterns

### 7.1 Avoid Complex Ternaries

```typescript
// ❌ WRONG: nested ternaries
const statusColor =
  status === 'active'
    ? 'green'
    : status === 'pending'
      ? 'yellow'
      : status === 'error'
        ? 'red'
        : 'gray';

// ✅ CORRECT: object lookup
const STATUS_COLORS = {
  active: 'green',
  pending: 'yellow',
  error: 'red',
  default: 'gray',
} as const;

function getStatusColor(status: string): string {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.default;
}

// ✅ CORRECT: simple ternary for binary choice
const buttonText = isLoading ? 'Saving...' : 'Save';
```

### 7.2 Use Object Maps for Multiple Conditions

```typescript
// ❌ WRONG: long if/else chain
function getIcon(type: string) {
  if (type === 'success') return <CheckIcon />
  else if (type === 'error') return <XIcon />
  else if (type === 'warning') return <AlertIcon />
  else if (type === 'info') return <InfoIcon />
  else return <QuestionIcon />
}

// ✅ CORRECT: object map
const ICONS = {
  success: CheckIcon,
  error: XIcon,
  warning: AlertIcon,
  info: InfoIcon,
} as const

function getIcon(type: keyof typeof ICONS) {
  const Icon = ICONS[type]
  return <Icon />
}
```

### 7.3 Early Returns for Guard Clauses

```typescript
// ❌ WRONG: deeply nested conditions
function processUser(user: User | null) {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission) {
        // actual logic here
      } else {
        return { error: 'No permission' };
      }
    } else {
      return { error: 'User inactive' };
    }
  } else {
    return { error: 'No user' };
  }
}

// ✅ CORRECT: early returns
function processUser(user: User | null) {
  if (!user) {
    return { error: 'No user' };
  }

  if (!user.isActive) {
    return { error: 'User inactive' };
  }

  if (!user.hasPermission) {
    return { error: 'No permission' };
  }

  // actual logic here - no nesting
  return { success: true };
}
```

### 7.4 Switch for Explicit Cases

```typescript
// ✅ When you need fall-through or complex logic per case
function handleAction(action: Action): Result {
  switch (action.type) {
    case 'CREATE':
      return handleCreate(action.payload);

    case 'UPDATE':
      return handleUpdate(action.payload);

    case 'DELETE':
      return handleDelete(action.payload);

    default: {
      // TypeScript exhaustiveness check
      const exhaustiveCheck: never = action.type;
      throw new Error(`Unhandled action type: ${exhaustiveCheck}`);
    }
  }
}
```

---

## 8. Form Patterns (React Hook Form + Zod)

### 8.1 Form with Validation

```typescript
// features/clients/components/client-form.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Select, Form, FormField } from '@design-system'

// ─────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────

const clientFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z
    .string()
    .email('Invalid email address'),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
    .optional(),
  status: z.enum(['active', 'inactive', 'pending']),
})

type ClientFormValues = z.infer<typeof clientFormSchema>

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

interface ClientFormProps {
  defaultValues?: Partial<ClientFormValues>
  onSubmit: (data: ClientFormValues) => void
  isSubmitting?: boolean
}

function ClientForm({ defaultValues, onSubmit, isSubmitting }: ClientFormProps) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      status: 'active',
      ...defaultValues,
    },
  })

  function handleFormSubmit(data: ClientFormValues) {
    onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <Input
              label="Name"
              placeholder="Enter client name"
              error={form.formState.errors.name?.message}
              {...field}
            />
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <Input
              label="Email"
              type="email"
              placeholder="client@example.com"
              error={form.formState.errors.email?.message}
              {...field}
            />
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <Select
              label="Status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending', label: 'Pending' },
              ]}
              error={form.formState.errors.status?.message}
              {...field}
            />
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Client'}
        </Button>
      </form>
    </Form>
  )
}

export { ClientForm }
```

### 8.2 Form with Convex Mutation

```typescript
// components/users/create-user-sheet.tsx
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';

function CreateUserSheet() {
  const { isCreateSheetOpen, closeCreateSheet } = useUserUIStore();
  const createUser = useMutation(api.users.create);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: UserFormValues) {
    setIsSubmitting(true);
    try {
      await createUser({
        displayName: data.displayName,
        email: data.email,
      });
      closeCreateSheet();
      toast.success('User created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={isCreateSheetOpen} onOpenChange={closeCreateSheet}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create User</SheetTitle>
        </SheetHeader>

        <UserForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </SheetContent>
    </Sheet>
  );
}
```

---

## 9. Error Handling

### 9.1 Convex Error Handling

**In Convex functions** (queries/mutations):

```typescript
// convex/users.ts
import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';

export const updateProfile = mutation({
  args: {
    displayName: v.string(),
  },
  returns: v.id('users'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError('Not authenticated');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError('User not found');
    }

    if (args.displayName.length < 2) {
      throw new ConvexError('Display name must be at least 2 characters');
    }

    await ctx.db.patch(user._id, { displayName: args.displayName });
    return user._id;
  },
});
```

**In React components** (handling Convex errors):

```typescript
// app/(protected)/profile.tsx
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ConvexError } from 'convex/values';
import { toast } from 'sonner';

function ProfilePage() {
  const updateProfile = useMutation(api.users.updateProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleUpdate(displayName: string) {
    setIsSubmitting(true);
    try {
      await updateProfile({ displayName });
      toast.success('Profile updated!');
    } catch (error) {
      // Handle Convex errors
      if (error instanceof ConvexError) {
        toast.error(error.data);
      } else {
        toast.error('Failed to update profile');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (/* ... */);
}
```

---

## 10. Performance Rules (Critical)

### 10.1 Eliminate Waterfalls (CRITICAL)

```typescript
// ❌ WRONG: sequential awaits
async function loadDashboard(userId: string) {
  const user = await fetchUser(userId); // 200ms
  const settings = await fetchSettings(userId); // 200ms
  const notifications = await fetchNotifications(userId); // 200ms
  // Total: 600ms (sequential)
  return { user, settings, notifications };
}

// ✅ CORRECT: parallel requests
async function loadDashboard(userId: string) {
  const [user, settings, notifications] = await Promise.all([
    fetchUser(userId), // 200ms
    fetchSettings(userId), // 200ms (parallel)
    fetchNotifications(userId), // 200ms (parallel)
  ]);
  // Total: ~200ms (parallel)
  return { user, settings, notifications };
}
```

### 10.2 Avoid Cascading useEffects

```typescript
// ❌ WRONG: waterfall effects
function Dashboard() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState(null);

  useEffect(() => {
    fetchUser().then(setUser); // First fetch
  }, []);

  useEffect(() => {
    if (user) {
      fetchProjects(user.id).then(setProjects); // Second fetch (waits)
    }
  }, [user]);
}

// ✅ CORRECT: Convex handles dependencies automatically
function Dashboard() {
  const user = useQuery(api.users.current);
  // Convex will automatically fetch projects when user is available
  const projects = useQuery(
    api.projects.listByUserId,
    user ? { userId: user._id } : 'skip',
  );

  // Handle loading
  if (user === undefined) return <LoadingSpinner />;
  if (!user) return <SignInPrompt />;

  return (
    <View>
      <Text>{user.displayName}</Text>
      {projects === undefined ? (
        <LoadingSpinner />
      ) : (
        <ProjectList projects={projects} />
      )}
    </View>
  );
}
```

### 10.3 Lazy State Initialization

```typescript
// ❌ WRONG: expensive computation on every render
function Settings() {
  const [config] = useState(JSON.parse(localStorage.getItem('config') || '{}'));
}

// ✅ CORRECT: lazy initialization
function Settings() {
  const [config] = useState(() => {
    const stored = localStorage.getItem('config');
    return stored ? JSON.parse(stored) : {};
  });
}
```

### 10.4 Memoization (Use Sparingly)

```typescript
// ✅ Use memo for expensive renders with stable props
const ExpensiveList = memo(function ExpensiveList({ items }: Props) {
  return items.map((item) => <ExpensiveItem key={item.id} item={item} />)
})

// ✅ Use useMemo for expensive computations
function Report({ data }: Props) {
  const processedData = useMemo(() => {
    return data.map(expensiveTransform).filter(expensiveFilter)
  }, [data])
}

// ✅ Use useCallback for callbacks passed to memoized children
function Parent() {
  const handleClick = useCallback((id: string) => {
    // handler logic
  }, [])

  return <MemoizedChild onClick={handleClick} />
}

// ❌ DON'T memoize everything - adds overhead
// Only memoize when you've identified a performance issue
```

---

## 11. DRY Principle (Don't Repeat Yourself)

**Always look for opportunities to extract and reuse code.** Duplication leads to bugs and maintenance nightmares.

### 11.1 Extract Repeated Logic into Hooks

```typescript
// ❌ BAD: Same logic repeated in multiple components
function ClientsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data } = useClientsList({ search: debouncedSearch });
  // ...
}

function ProductsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300); // Duplicated!
  const { data } = useProductsList({ search: debouncedSearch });
  // ...
}

// ✅ GOOD: Extract into reusable hook
function useDebouncedSearch(defaultValue = '') {
  const [search, setSearch] = useState(defaultValue);
  const debouncedSearch = useDebounce(search, 300);
  return { search, setSearch, debouncedSearch };
}

function ClientsPage() {
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const { data } = useClientsList({ search: debouncedSearch });
}
```

### 11.2 Extract Repeated UI into Components

```typescript
// ❌ BAD: Same card layout repeated
function ClientCard({ client }) {
  return (
    <Card>
      <CardHeader className="flex justify-between">
        <CardTitle>{client.name}</CardTitle>
        <Badge variant={getStatusVariant(client.status)}>{client.status}</Badge>
      </CardHeader>
      <CardContent>{/* ... */}</CardContent>
    </Card>
  )
}

function ProductCard({ product }) {
  return (
    <Card>
      <CardHeader className="flex justify-between">
        <CardTitle>{product.name}</CardTitle>
        <Badge variant={getStatusVariant(product.status)}>{product.status}</Badge>
      </CardHeader>
      <CardContent>{/* ... */}</CardContent>
    </Card>
  )
}

// ✅ GOOD: Extract shared layout
interface StatusCardProps {
  title: string
  status: string
  statusVariant: BadgeVariant
  children: ReactNode
}

function StatusCard({ title, status, statusVariant, children }: StatusCardProps) {
  return (
    <Card>
      <CardHeader className="flex justify-between">
        <CardTitle>{title}</CardTitle>
        <Badge variant={statusVariant}>{status}</Badge>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
```

### 11.3 Extract Repeated Constants and Configs

```typescript
// ❌ BAD: Magic values repeated everywhere
function ClientForm() {
  const schema = z.object({
    name: z.string().min(2).max(100), // Repeated limits
    email: z.string().email(),
  });
}

function ProductForm() {
  const schema = z.object({
    name: z.string().min(2).max(100), // Same limits duplicated!
    description: z.string().max(500),
  });
}

// ✅ GOOD: Centralize validation rules
// lib/validation-rules.ts
export const VALIDATION = {
  NAME_MIN: 2,
  NAME_MAX: 100,
  DESCRIPTION_MAX: 500,
} as const;

export const commonSchemas = {
  name: z.string().min(VALIDATION.NAME_MIN).max(VALIDATION.NAME_MAX),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
};

// Usage
const clientSchema = z.object({
  name: commonSchemas.name,
  email: commonSchemas.email,
});
```

### 11.4 Extract Repeated Convex Patterns

```typescript
// ❌ BAD: Same mutation pattern repeated
function CreateUserSheet() {
  const createUser = useMutation(api.users.create);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: UserFormValues) {
    setIsSubmitting(true);
    try {
      await createUser(data);
      toast.success('User created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  }
}

function CreateProjectSheet() {
  const createProject = useMutation(api.projects.create);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: ProjectFormValues) {
    setIsSubmitting(true); // Duplicated pattern!
    try {
      await createProject(data);
      toast.success('Project created'); // Same pattern!
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed'); // Same!
    } finally {
      setIsSubmitting(false);
    }
  }
}

// ✅ GOOD: Create reusable hook
function useConvexMutation<Args extends Record<string, any>>(
  mutationFn: FunctionReference<'mutation', 'public', Args, any>,
  options: {
    successMessage: string;
    onSuccess?: () => void;
  },
) {
  const mutation = useMutation(mutationFn);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function execute(args: Args) {
    setIsSubmitting(true);
    try {
      const result = await mutation(args);
      toast.success(options.successMessage);
      options.onSuccess?.();
      return result;
    } catch (error) {
      const message = error instanceof ConvexError
        ? error.data
        : error instanceof Error
          ? error.message
          : 'Operation failed';
      toast.error(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  return { execute, isSubmitting };
}

// Usage
function CreateUserSheet() {
  const { isCreateSheetOpen, closeCreateSheet } = useUserUIStore();

  const { execute: createUser, isSubmitting } = useConvexMutation(
    api.users.create,
    {
      successMessage: 'User created',
      onSuccess: closeCreateSheet,
    },
  );

  return (
    <Sheet open={isCreateSheetOpen} onOpenChange={closeCreateSheet}>
      <UserForm onSubmit={createUser} isSubmitting={isSubmitting} />
    </Sheet>
  );
}
```

### 11.5 DRY Checklist

Before writing new code, ask:

- [ ] Does similar code exist elsewhere? → **Reuse or extract**
- [ ] Will I need this logic again? → **Extract into hook/util**
- [ ] Is this UI pattern used elsewhere? → **Create shared component**
- [ ] Are these magic values used elsewhere? → **Create constants**
- [ ] Is this the same validation? → **Use shared schema**

**Exception:** Don't over-DRY. If two pieces of code happen to look similar but serve different purposes and may evolve differently, it's okay to keep them separate. The key is identifying **true duplication** vs **coincidental similarity**.

---

## 12. Code Review Checklist

### Naming

- [ ] Files use kebab-case
- [ ] Functions use descriptive names
- [ ] No single-letter variable names (except standard conventions like `x, y` for coordinates)
- [ ] Event handlers prefixed with `handle` (e.g., `handleSubmit`)

### Structure

- [ ] Feature code stays within feature folder
- [ ] Cross-feature imports use barrel exports only
- [ ] No circular dependencies
- [ ] Types colocated with feature

### State

- [ ] Database state uses Convex hooks (`useQuery`, `useMutation`)
- [ ] UI state uses Zustand (if shared) or useState (if local)
- [ ] No duplication of Convex data in local state
- [ ] Convex functions have proper validators (`args`, `returns`)
- [ ] Internal functions use `internalQuery`/`internalMutation`

### DRY (Don't Repeat Yourself)

- [ ] No duplicated logic (extract to hooks if repeated 2+ times)
- [ ] No duplicated UI patterns (extract to components)
- [ ] Validation schemas use shared rules where applicable
- [ ] Constants centralized (no magic values repeated)

### Props Drilling

- [ ] No props passing through 2+ components that don't use them
- [ ] Shared state uses Zustand or Context instead of prop chains
- [ ] Components have reasonable prop count (≤5-6 props)

### Performance

- [ ] No cascading useEffects
- [ ] No sequential awaits that could be parallel
- [ ] Expensive computations memoized
- [ ] Large lists virtualized

### Code Quality

- [ ] No complex nested ternaries
- [ ] Object maps used for multiple conditions
- [ ] Early returns for guard clauses
- [ ] Regular functions for components/hooks, arrows for callbacks
