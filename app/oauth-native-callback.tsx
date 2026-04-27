import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';

// Must be called at module level to signal the auth session browser to close
// and clear any pending OAuth state from previous interrupted flows.
WebBrowser.maybeCompleteAuthSession();

export default function OAuthNativeCallback() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-muted-foreground">Completing sign in...</Text>
    </View>
  );
}
