import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { AuthStateProvider, ClerkProvider, ConvexProvider, useAuthState } from '@/providers';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  useFonts,
} from '@expo-google-fonts/geist';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect, useRef } from 'react';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

void SplashScreen.preventAutoHideAsync().catch(() => {
  // On iOS, this can throw during dev reloads / view-controller transitions.
  // Safe to ignore because the splash will still auto-hide.
});

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });

  useEffect(() => {
    // Force dark mode
    setColorScheme('dark');
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'dark']}>
      <StatusBar style="light" />
      <ClerkProvider>
        <ConvexProvider>
          <AuthStateProvider>
            <RootNavigator />
          </AuthStateProvider>
        </ConvexProvider>
      </ClerkProvider>
      <PortalHost />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { status } = useAuthState();
  const hasHiddenSplashRef = useRef(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (hasHiddenSplashRef.current) return;
    hasHiddenSplashRef.current = true;

    void SplashScreen.hideAsync().catch(() => {
      // Can throw on iOS if no splash is registered for the current view controller.
      // Ignore to avoid crashing on unhandled promise rejection.
    });
  }, [status]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="(protected)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
