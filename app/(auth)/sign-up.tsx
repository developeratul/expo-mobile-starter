import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useSignUp } from '@clerk/clerk-expo';
import { Link, Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState('');

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace('/(protected)');
      } else {
        console.error(JSON.stringify(signUpAttempt, null, 2));
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  if (pendingVerification) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerClassName="flex-grow justify-center px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Verify Your Email</CardTitle>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="gap-2">
                <Label nativeID="code">Verification Code</Label>
                <Input
                  id="code"
                  value={code}
                  placeholder="Enter the code sent to your email"
                  onChangeText={setCode}
                  keyboardType="number-pad"
                />
              </View>

              <Button size="lg" onPress={onVerifyPress} className="mt-4">
                <Text>Verify</Text>
              </Button>
            </CardContent>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerClassName="flex-grow justify-center px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
          </CardHeader>
          <CardContent className="gap-4">
            <View className="gap-2">
              <Label nativeID="email">Email</Label>
              <Input
                id="email"
                autoCapitalize="none"
                value={emailAddress}
                placeholder="Enter your email"
                onChangeText={setEmailAddress}
                keyboardType="email-address"
              />
            </View>

            <View className="gap-2">
              <Label nativeID="password">Password</Label>
              <Input
                id="password"
                value={password}
                placeholder="Enter your password"
                secureTextEntry
                onChangeText={setPassword}
              />
            </View>

            <Button size="lg" onPress={onSignUpPress} className="mt-4">
              <Text>Sign Up</Text>
            </Button>
          </CardContent>
        </Card>

        <View className="flex-row items-center justify-center gap-2">
          <Text className="text-muted-foreground">Already have an account?</Text>
          <Link asChild href="./sign-in">
            <Button variant="ghost" className="px-0">
              <Text className="text-primary">Sign In</Text>
            </Button>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
