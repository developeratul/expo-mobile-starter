import { LoadingState } from '@/components/shared';
import { useAuthState } from '@/providers';
import { Redirect, Stack } from 'expo-router';

export default function OnboardingLayout() {
  const { status } = useAuthState();

  if (status === 'loading') {
    return <LoadingState />;
  }

  if (status === 'unauthenticated') {
    return <Redirect href="/welcome" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    />
  );
}
