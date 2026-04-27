import { Env } from '@/lib/env';
import { useAuth } from '@clerk/clerk-expo';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import React from 'react';

const convex = new ConvexReactClient(Env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

export function ConvexProvider(props: AppProps) {
  const { children } = props;
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
