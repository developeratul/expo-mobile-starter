import { ActivityIndicator, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
  className?: string;
}

export function LoadingSpinner({
  text = 'Loading...',
  size = 'large',
  fullScreen = false,
  className,
}: LoadingSpinnerProps) {
  const content = (
    <View className={cn('items-center justify-center gap-3', className)}>
      <ActivityIndicator size={size} />
      {text && <Text className="text-muted-foreground">{text}</Text>}
    </View>
  );

  if (fullScreen) {
    return <View className="flex-1 items-center justify-center">{content}</View>;
  }

  return content;
}
