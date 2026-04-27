import { cn } from '@/lib/utils';
import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenWrapperProps extends ViewProps {
  children: ReactNode;
  title?: string;
  headerShown?: boolean;
  headerTransparent?: boolean;
  headerRight?: () => ReactNode;
  safeAreaEdges?: ('top' | 'right' | 'bottom' | 'left')[];
  withScrollView?: boolean;
}

export function ScreenWrapper({
  children,
  title,
  headerShown = false,
  headerTransparent = false,
  headerRight,
  safeAreaEdges,
  className,
  ...props
}: ScreenWrapperProps) {
  return (
    <SafeAreaView className="flex-1" edges={safeAreaEdges}>
      <Stack.Screen
        options={{
          title,
          headerShown,
          headerTransparent,
          headerRight,
        }}
      />
      <View className={cn('flex-1', className)} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}
