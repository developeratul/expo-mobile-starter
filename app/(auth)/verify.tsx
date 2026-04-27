import { Button } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';
import { Text } from '@/components/ui/text';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VerifyScreen() {
  const router = useRouter();
  const { email, isSignUp } = useLocalSearchParams<{
    email: string;
    isSignUp: string;
  }>();
  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isSignUpFlow = isSignUp === 'true';

  async function handleVerify() {
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      if (isSignUpFlow) {
        if (!signUp || !setActiveSignUp) {
          setError('Authentication not ready');
          return;
        }

        const result = await signUp.attemptEmailAddressVerification({
          code,
        });

        if (result.status === 'complete' && result.createdSessionId) {
          await setActiveSignUp({ session: result.createdSessionId });
          router.replace('/');
        } else {
          setError('Verification incomplete. Please try again.');
        }
      } else {
        if (!signIn || !setActiveSignIn) {
          setError('Authentication not ready');
          return;
        }

        const result = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code,
        });

        if (result.status === 'complete' && result.createdSessionId) {
          await setActiveSignIn({ session: result.createdSessionId });
          router.replace('/');
        } else {
          setError('Verification incomplete. Please try again.');
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1 items-center justify-center px-6 py-8">
        <View className="w-full max-w-md gap-8">
          {/* Title */}
          <View className="items-center gap-2">
            <Text className="text-center font-semibold text-2xl">We sent you en Email</Text>
            <Text className="text-center text-muted-foreground">
              Enter the verification code sent to your email: <Text>{email || 'your email'}</Text>
            </Text>
          </View>

          {/* Verification Form */}
          <View className="gap-4">
            <OtpInput numberOfDigits={6} onTextChange={setCode} disabled={isLoading} autoFocus />
            {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
            <Button size="lg" onPress={handleVerify} isLoading={isLoading}>
              <Text>Verify</Text>
            </Button>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
