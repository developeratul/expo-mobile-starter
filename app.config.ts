import type { ConfigContext, ExpoConfig } from "@expo/config";
import { ClientEnv } from "./env";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Expo Mobile Starter',
  slug: 'expo-mobile-starter',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'expomobilestarter',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
  },
  android: {
    edgeToEdgeEnabled: true,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: ['expo-router', 'expo-font'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    ...ClientEnv,
  },
});

