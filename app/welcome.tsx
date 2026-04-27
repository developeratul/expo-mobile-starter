import { ScreenWrapper } from '@/components/layout';
import { GoogleSignInButton } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { Image, View } from 'react-native';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper className="justify-between gap-y-12 px-6 py-12">
      <View className="flex-1 justify-center gap-y-12">
        <View className="gap-y-6">
          <Image
            source={require('@/assets/images/icon.png')}
            style={{ width: 64, height: 64 }}
            resizeMode="contain"
          />
          <View className="gap-y-2">
            <Text className="font-semibold text-3xl">Expo Mobile Starter</Text>
            <Text className="font-medium text-lg text-muted-foreground">
              Clerk, Convex, and UI components ready to customize.
            </Text>
          </View>
        </View>
      </View>

      <View className="gap-3">
        <GoogleSignInButton className="w-full" />
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onPress={() => router.push('/(auth)/email')}>
          <Icon size={18} as={Mail} />
          <Text>Continue with Email</Text>
        </Button>
      </View>
    </ScreenWrapper>
  );
}
