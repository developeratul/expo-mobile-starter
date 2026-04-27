import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';

export default function OAuthNativeCallback() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(protected)');
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-muted-foreground">Completing sign in...</Text>
    </View>
  );
}
