import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/convex/_generated/api';
import { useMutation } from 'convex/react';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CompleteScreen() {
  const router = useRouter();
  const completeOnboarding = useMutation(api.users.mutations.completeOnboarding);
  const [isLoading, setIsLoading] = useState(false);

  async function handleGoToDashboard() {
    try {
      setIsLoading(true);
      await completeOnboarding();
      router.replace('/(protected)');
    } catch (err) {
      console.error('Complete onboarding error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 items-center justify-center gap-6 px-4">
        <Text className="text-2xl font-bold">You're All Set</Text>
        <Text className="text-center text-muted-foreground">
          You&apos;re all set. Continue to the app when you&apos;re ready.
        </Text>
        <Button size="lg" onPress={handleGoToDashboard} isLoading={isLoading}>
          <Text>Go to Dashboard</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
