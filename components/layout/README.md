# Layout Components

Reusable layout components for consistent screen structures across the app.

## Components

### ScreenWrapper

Basic screen wrapper with SafeAreaView and Stack.Screen configuration.

**Usage:**
```tsx
import { ScreenWrapper } from '@/components/layout';

export default function MyScreen() {
  return (
    <ScreenWrapper
      title="My Screen"
      headerShown={true}
      headerTransparent={false}
      headerRight={() => <Button>Save</Button>}
    >
      {/* Your content */}
    </ScreenWrapper>
  );
}
```

**Props:**
- `children: ReactNode` - Screen content
- `title?: string` - Screen title
- `headerShown?: boolean` - Show/hide header (default: true)
- `headerTransparent?: boolean` - Transparent header (default: false)
- `headerRight?: () => ReactNode` - Right header component
- `safeAreaEdges?: Array` - Custom safe area edges
- `className?: string` - Additional Tailwind classes

---

### ListScreen

Layout for list-based screens with search, filters, loading, and empty states.

**Usage:**
```tsx
import { ListScreen } from '@/components/layout';
import { Input } from '@/components/ui/input';
import { FlashList } from '@shopify/flash-list';

export default function UsersScreen() {
  const [search, setSearch] = useState('');
  const users = useQuery(api.users.queries.list, { search });

  return (
    <ListScreen
      title="Users"
      headerRight={() => <Button>Add User</Button>}
      searchBar={
        <Input
          placeholder="Search users..."
          value={search}
          onChangeText={setSearch}
        />
      }
      isLoading={users === undefined}
      isEmpty={users?.length === 0}
      emptyState={
        <EmptyState
          title="No users found"
          description="Get started by adding your first user"
          action={{ label: "Add User", onPress: handleAddUser }}
        />
      }
    >
      <FlashList
        data={users}
        renderItem={({ item }) => <UserCard user={item} />}
        estimatedItemSize={80}
      />
    </ListScreen>
  );
}
```

**Props:**
- `children: ReactNode` - List content (typically FlashList)
- `title: string` - Screen title
- `headerRight?: () => ReactNode` - Right header component
- `headerLeft?: () => ReactNode` - Left header component
- `searchBar?: ReactNode` - Search input component
- `filters?: ReactNode` - Filter components
- `isLoading?: boolean` - Show loading state
- `isEmpty?: boolean` - Show empty state
- `emptyState?: ReactNode` - Custom empty state component
- `className?: string` - Additional Tailwind classes

---

### DetailScreen

Layout for detail/single-item screens with loading, not found, and action states.

**Usage:**
```tsx
import { DetailScreen } from '@/components/layout';
import { Button } from '@/components/ui/button';

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams();
  const user = useQuery(api.users.queries.get, { id });
  const deleteUser = useMutation(api.users.mutations.delete);

  return (
    <DetailScreen
      title={user?.displayName}
      headerRight={() => <Button>Edit</Button>}
      isLoading={user === undefined}
      notFound={user === null}
      notFoundMessage="User not found"
      scrollable={true}
      actions={
        <>
          <Button variant="outline">Share</Button>
          <Button
            variant="destructive"
            onPress={() => deleteUser({ id })}
          >
            Delete
          </Button>
        </>
      }
    >
      {/* Detail content */}
      <View>
        <Text>{user.email}</Text>
        <Text>{user.displayName}</Text>
      </View>
    </DetailScreen>
  );
}
```

**Props:**
- `children: ReactNode` - Detail content
- `title?: string` - Screen title
- `headerRight?: () => ReactNode` - Right header component
- `headerLeft?: () => ReactNode` - Left header component
- `isLoading?: boolean` - Show loading state
- `notFound?: boolean` - Show not found state
- `notFoundMessage?: string` - Custom not found message
- `scrollable?: boolean` - Enable scrolling (default: true)
- `actions?: ReactNode` - Bottom action buttons
- `className?: string` - Additional Tailwind classes
- `contentClassName?: string` - Content area classes

---

## Shared Components

### LoadingSpinner

Consistent loading indicator with optional text.

**Usage:**
```tsx
import { LoadingSpinner } from '@/components/shared';

// Full screen
<LoadingSpinner fullScreen text="Loading users..." />

// Inline
<LoadingSpinner size="small" text="Saving..." />
```

### EmptyState

Consistent empty state with icon, title, description, and action.

**Usage:**
```tsx
import { EmptyState } from '@/components/shared';
import { UserIcon } from 'lucide-react-native';

<EmptyState
  icon={UserIcon}
  title="No users found"
  description="Get started by adding your first user"
  action={{
    label: "Add User",
    onPress: handleAddUser
  }}
/>
```

---

## Best Practices

1. **Use the right layout for your use case:**
   - `ScreenWrapper` - Generic screens
   - `ListScreen` - List/grid of items
   - `DetailScreen` - Single item details

2. **Keep screens thin:**
   - Layout components handle structure
   - Feature components handle logic
   - Screens just compose them together

3. **Consistent patterns:**
   - All layouts include loading states
   - All layouts support custom header actions
   - All layouts use SafeAreaView

4. **Example screen structure:**
```tsx
export default function MyScreen() {
  const data = useQuery(api.myDomain.queries.list);
  
  return (
    <ListScreen
      title="My Items"
      isLoading={data === undefined}
      isEmpty={data?.length === 0}
    >
      <FlashList data={data} ... />
    </ListScreen>
  );
}
```
