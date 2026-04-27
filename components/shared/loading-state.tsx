import { ActivityIndicator, View } from 'react-native';

export function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" />
    </View>
  );
}
