import { useAuthState } from '@/providers';
import { LoadingState } from '@/components/shared';
import { Redirect } from 'expo-router';

export default function Index() {
  const { status, user } = useAuthState();

  if (status === 'loading') {
    return <LoadingState />;
  }

  if (status === 'authenticated') {
    if (user && !user.hasCompletedOnboarding) {
      return <Redirect href="/(onboarding)/name" />;
    }
    return <Redirect href="/(protected)" />;
  }

  return <Redirect href="/welcome" />;
}
