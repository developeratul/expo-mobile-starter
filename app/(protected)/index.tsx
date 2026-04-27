import { SignOutButton } from '@/components/auth/SignOutButton';
import { LoadingState } from '@/components/shared';
import { ScreenWrapper } from '@/components/layout';
import { Text } from '@/components/ui/text';
import { useAuthState } from '@/providers';
import { View } from 'react-native';

export default function HomeScreen() {
  const { user } = useAuthState();

  if (!user) {
    return <LoadingState />;
  }

  return (
    <ScreenWrapper title="Home" headerTransparent>
      <View className="flex-1 items-center justify-center gap-4 p-4">
        <Text className="text-2xl font-semibold">Welcome, {user.displayName}!</Text>
        <Text className="text-muted-foreground">{user.email}</Text>
      </View>
      <SignOutButton />
    </ScreenWrapper>
  );
}
