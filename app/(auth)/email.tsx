import { GoogleSignInButton } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { Stack, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function isUserNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const err = error as { errors?: Array<{ code?: string; message?: string }> };

  return (
    Array.isArray(err.errors) &&
    err.errors.some(
      (e) =>
        e.code === 'form_identifier_not_found' ||
        (typeof e.message === 'string' && e.message.includes('not found'))
    )
  );
}

export default function EmailScreen() {
  const router = useRouter();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleContinue() {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!signIn || !signUp) {
      setError('Authentication not ready');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      let isSignUp = false;

      // Try sign-in first
      try {
        const { supportedFirstFactors } = await signIn.create({
          identifier: email,
        });

        const emailCodeFactor = supportedFirstFactors?.find(
          (factor) => factor.strategy === 'email_code'
        );

        const emailAddressId =
          emailCodeFactor && 'emailAddressId' in emailCodeFactor
            ? emailCodeFactor.emailAddressId
            : undefined;

        if (!emailAddressId) {
          throw new Error('Email code authentication not supported');
        }

        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId,
        });
      } catch (signInErr) {
        // If user doesn't exist, try sign-up
        if (isUserNotFoundError(signInErr)) {
          await signUp.create({
            emailAddress: email,
          });

          await signUp.prepareEmailAddressVerification({
            strategy: 'email_code',
          });

          isSignUp = true;
        } else {
          throw signInErr;
        }
      }

      router.push({
        pathname: '/(auth)/verify',
        params: { email, isSignUp: isSignUp ? 'true' : 'false' },
      });
    } catch (err) {
      console.error('Email authentication error:', err);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleClearEmail() {
    setEmail('');
    setError('');
  }

  function handleGoogleError(err: unknown) {
    setError('Failed to sign in with Google. Please try again.');
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerShadowVisible: false,
          headerRight: () => (
            <Button
              onPress={() => router.back()}
              size="icon"
              variant="ghost"
              className="ios:size-9 rounded-full web:mx-4">
              <Icon as={X} className="size-6" />
            </Button>
          ),
        }}
      />
      <View className="flex-1 items-center justify-center px-6 py-8">
        <View className="w-full max-w-md gap-12">
          {/* Title */}
          <View className="items-center gap-4">
            <Text className="text-center font-semibold text-2xl">Log in or sign up</Text>
          </View>

          {/* Email Form */}
          <View className="gap-4">
            <View className="relative">
              <Input
                autoCapitalize="none"
                placeholder="raul@gmail.com"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!isLoading}
                className="pr-12"
              />
              {email.length > 0 && (
                <Pressable
                  onPress={handleClearEmail}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  disabled={isLoading}>
                  <View className="rounded-full bg-muted p-1">
                    <Icon size={14} as={X} className="text-muted-foreground" />
                  </View>
                </Pressable>
              )}
            </View>
            {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
            <Button size="lg" onPress={handleContinue} isLoading={isLoading}>
              <Text>Continue</Text>
            </Button>
          </View>

          {/* Divider and Google Button */}
          <View className="gap-4">
            <View className="flex-row items-center gap-4">
              <View className="h-px flex-1 bg-border" />
              <Text className="text-sm text-muted-foreground">or</Text>
              <View className="h-px flex-1 bg-border" />
            </View>
            <GoogleSignInButton disabled={isLoading} onError={handleGoogleError} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
