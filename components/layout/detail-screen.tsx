import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface DetailScreenProps {
  title?: string;
  headerShown?: boolean;
  headerTransparent?: boolean;
  headerRight?: () => ReactNode;
  headerLeft?: () => ReactNode;
  isLoading?: boolean;
  notFound?: boolean;
  notFoundMessage?: string;
  actions?: ReactNode;
  scrollable?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DetailScreen({
  title,
  headerShown = true,
  headerTransparent = false,
  headerRight,
  headerLeft,
  isLoading = false,
  notFound = false,
  notFoundMessage = 'Item not found',
  actions,
  scrollable = true,
  children,
  className,
  contentClassName,
}: DetailScreenProps) {
  return (
    <SafeAreaView className="flex-1">
      <Stack.Screen
        options={{
          title,
          headerShown,
          headerTransparent,
          headerRight,
          headerLeft,
        }}
      />
      <View className={cn('flex-1', className)}>
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-muted-foreground">Loading...</Text>
          </View>
        ) : notFound ? (
          <View className="flex-1 items-center justify-center px-4">
            <Text className="text-center text-muted-foreground">{notFoundMessage}</Text>
          </View>
        ) : (
          <>
            {scrollable ? (
              <ScrollView
                className={cn('flex-1', contentClassName)}
                contentContainerClassName="gap-6 p-4"
                contentInsetAdjustmentBehavior="automatic">
                {children}
              </ScrollView>
            ) : (
              <View className={cn('flex-1 gap-6 p-4', contentClassName)}>{children}</View>
            )}

            {/* Action Buttons (Fixed at Bottom) */}
            {actions && (
              <View className="gap-3 border-t border-border bg-card p-4">{actions}</View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
