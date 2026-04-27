import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useSSO } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { GoogleLogo } from './assets/google-logo';

interface GoogleSignInButtonProps {
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function GoogleSignInButton({
  size = 'lg',
  variant = 'outline',
  className,
  disabled,
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const [isLoading, setIsLoading] = useState(false);

  async function handleGoogleSignIn() {
    try {
      setIsLoading(true);

      await WebBrowser.warmUpAsync();

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: Linking.createURL('/oauth-native-callback'),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        onSuccess?.();
        router.replace('/');
      }
    } catch (err) {
      console.error('OAuth error:', err);
      onError?.(err);
    } finally {
      setIsLoading(false);
      void WebBrowser.coolDownAsync();
    }
  }

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      onPress={handleGoogleSignIn}
      isLoading={isLoading}
      disabled={disabled}>
      <GoogleLogo size={16} />
      <Text>Continue with Google</Text>
    </Button>
  );
}
