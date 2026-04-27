import { ClerkProvider as CoreClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { Env } from '@/lib/env';

export function ClerkProvider(props: AppProps) {
  const { children } = props;
  return (
    <CoreClerkProvider
      tokenCache={tokenCache}
      publishableKey={Env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      {children}
    </CoreClerkProvider>
  );
}
