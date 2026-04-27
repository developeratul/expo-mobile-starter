import { LoadingState } from '@/components/shared';
import { useAuthState } from '@/providers';
import { Redirect, Stack } from 'expo-router';

export default function ProtectedRoutesLayout() {
  const { status, user } = useAuthState();

  if (status === 'loading') {
    return <LoadingState />;
  }

  if (status === 'unauthenticated') {
    return <Redirect href="/welcome" />;
  }

  if (user && !user.hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)/name" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
