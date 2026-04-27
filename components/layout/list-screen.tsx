import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface ListScreenProps {
  title: string;
  headerRight?: () => ReactNode;
  headerLeft?: () => ReactNode;
  headerShown?: boolean;
  searchBar?: ReactNode;
  filters?: ReactNode;
  emptyState?: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  children: ReactNode;
  className?: string;
}

export function ListScreen({
  title,
  headerRight,
  headerLeft,
  headerShown = true,
  searchBar,
  filters,
  emptyState,
  isLoading = false,
  isEmpty = false,
  children,
  className,
}: ListScreenProps) {
  return (
    <SafeAreaView className="flex-1">
      <Stack.Screen
        options={{
          title,
          headerShown,
          headerRight,
          headerLeft,
        }}
      />
      <View className={cn('flex-1', className)}>
        {/* Search and Filters */}
        {(searchBar || filters) && (
          <View className="gap-3 border-b border-border bg-card px-4 py-3">
            {searchBar}
            {filters}
          </View>
        )}

        {/* Content Area */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-muted-foreground">Loading...</Text>
          </View>
        ) : isEmpty ? (
          <View className="flex-1 items-center justify-center px-4">
            {emptyState || (
              <Text className="text-center text-muted-foreground">No items found</Text>
            )}
          </View>
        ) : (
          children
        )}
      </View>
    </SafeAreaView>
  );
}
