import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useUser } from '@clerk/clerk-expo';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NameScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  async function handleSubmit() {
    if (!firstName.trim()) {
      setError('Please enter your first name');
      return;
    }

    if (!lastName.trim()) {
      setError('Please enter your last name');
      return;
    }

    if (!user) {
      setError('User not found');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      router.push('/(onboarding)/complete');
    } catch (err) {
      console.error('Update name error:', err);
      setError('Failed to update name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 items-center justify-center gap-6 px-4">
        <Text className="text-2xl font-bold">What should we call you?</Text>
        <View className="w-full gap-4">
          <View className="gap-2">
            <Label nativeID="firstName">First Name</Label>
            <Input
              id="firstName"
              placeholder="Enter your first name"
              value={firstName}
              onChangeText={setFirstName}
              editable={!isLoading}
              autoCapitalize="words"
            />
          </View>
          <View className="gap-2">
            <Label nativeID="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Enter your last name"
              value={lastName}
              onChangeText={setLastName}
              editable={!isLoading}
              autoCapitalize="words"
            />
          </View>
          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
          <Button size="lg" onPress={handleSubmit} isLoading={isLoading}>
            <Text>Continue</Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
