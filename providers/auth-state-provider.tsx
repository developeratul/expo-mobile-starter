import { useCurrentUser } from '@/features/users';
import { useAuth } from '@clerk/clerk-expo';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

type AuthState = {
  status: AuthStatus;
  user: ReturnType<typeof useCurrentUser>['user'];
};

const AuthStateContext = createContext<AuthState | undefined>(undefined);

export function AuthStateProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useCurrentUser();

  const status = useMemo<AuthStatus>(() => {
    if (!isLoaded) {
      return 'loading';
    } else if (!isSignedIn) {
      return 'unauthenticated';
    } else if (user === undefined || user === null) {
      return 'loading';
    } else {
      return 'authenticated';
    }
  }, [isLoaded, isSignedIn, user]);

  const authState = useMemo<AuthState>(() => ({
    status,
    user,
  }), [status, user]);

  return <AuthStateContext.Provider value={authState}>{children}</AuthStateContext.Provider>;
}

export function useAuthState() {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error('useAuthState must be used within AuthStateProvider');
  }
  return context;
}
