import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  children,
  className,
}: EmptyStateProps) {
  return (
    <View className={cn('items-center justify-center gap-4 px-6 py-12', className)}>
      {icon && (
        <View className="rounded-full bg-muted p-4">
          <Icon as={icon} className="size-8 text-muted-foreground" />
        </View>
      )}
      <View className="items-center gap-2">
        <Text className="text-center text-lg font-semibold">{title}</Text>
        {description && (
          <Text className="text-center text-sm text-muted-foreground">{description}</Text>
        )}
      </View>
      {action && (
        <Button onPress={action.onPress} className="mt-2">
          <Text>{action.label}</Text>
        </Button>
      )}
      {children}
    </View>
  );
}
