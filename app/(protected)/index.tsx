import { SignOutButton } from '@/components/auth/SignOutButton';
import { LoadingState } from '@/components/shared';
import { ScreenWrapper } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuthState } from '@/providers';
import { useRouter, type Href } from 'expo-router';
import { View } from 'react-native';

export default function HomeScreen() {
  const { user } = useAuthState();
  const router = useRouter();

  if (!user) {
    return <LoadingState />;
  }

  function handleChatPress() {
    router.push('/chat');
  }

  return (
    <ScreenWrapper title="Home" headerTransparent>
      <View className="flex-1 items-center justify-center gap-4 p-4">
        <Text className="font-semibold text-2xl">Welcome, {user.displayName}!</Text>
        <Text className="text-muted-foreground">{user.email}</Text>
        <Button onPress={handleChatPress}>
          <Text>Chat with Claire</Text>
        </Button>
      </View>
      <SignOutButton />
    </ScreenWrapper>
  );
}
