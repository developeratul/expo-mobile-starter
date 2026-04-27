import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useSignIn } from '@clerk/clerk-expo';
import { Link, Stack, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');

  const onSignInPress = async () => {
    if (!isLoaded) return;

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace('/(protected)');
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerClassName="flex-grow justify-center px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
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

            <Button size="lg" onPress={onSignInPress} className="mt-4">
              <Text>Sign In</Text>
            </Button>
          </CardContent>
        </Card>

        <View className="flex-row items-center justify-center gap-2">
          <Text className="text-muted-foreground">Don't have an account?</Text>
          <Link asChild href="./sign-up">
            <Button variant="ghost" className="px-0">
              <Text className="text-primary">Sign Up</Text>
            </Button>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
