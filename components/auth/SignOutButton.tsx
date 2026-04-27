import { Button } from '@/components/ui/button';
import { useClerk } from '@clerk/clerk-expo';
import { Text } from 'react-native';

export function SignOutButton() {
  const { signOut } = useClerk();

  async function handleSignOut() {
    try {
      // Navigation is handled by route guards reacting to auth state.
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }

  return (
    <Button onPress={handleSignOut}>
      <Text>Sign out</Text>
    </Button>
  );
}
