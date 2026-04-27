# Tech Stack

This list matches **`package.json`** dependencies. Add new sections here when you add major libraries (maps, notifications, etc.).

## Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Expo SDK | ~54 | Managed workflow, dev client |
| React Native | 0.81 | iOS + Android |
| React | 19 | UI |
| Expo Router | ~6 | File-based navigation |
| TypeScript | ~5.9 | Typing |

## Backend & data

| Technology | Purpose |
|------------|---------|
| Convex | Database, queries, mutations, HTTP, real-time |
| convex-helpers | Convex utilities |
| Svix | Verify Clerk webhooks in Convex |
| Zod | Client and server validation |

## Auth

| Technology | Purpose |
|------------|---------|
| `@clerk/clerk-expo` | Sign-in, session, OAuth on device |
| `@clerk/backend` | Server-side verification in Convex |
| expo-secure-store | Secure token storage |

## Styling & UI

| Technology | Purpose |
|------------|---------|
| NativeWind 4 | Tailwind in React Native |
| Tailwind CSS 3 | Utility classes |
| React Native Reusables / `@rn-primitives/*` | Component primitives |
| CVA | Component variants |
| clsx + tailwind-merge | Class names |
| Lucide React Native | Icons |
| `@expo-google-fonts/geist` | Geist font |
| react-native-svg | SVG support |

## Forms & state

| Technology | Purpose |
|------------|---------|
| React Hook Form + `@hookform/resolvers` | Forms |
| Zustand | Client UI state (use sparingly; server state lives in Convex) |

## Lists & native

| Technology | Purpose |
|------------|---------|
| `@shopify/flash-list` | Virtualized lists |
| react-native-mmkv | Fast local key-value storage |
| react-native-reanimated | Animations |
| react-native-gesture-handler | Gestures |
| react-native-safe-area-context | Safe areas |
| react-native-screens | Native screen containers |

## Dev tooling

| Technology | Purpose |
|------------|---------|
| Prettier + prettier-plugin-tailwindcss | Formatting |
| dotenv-cli | Load `.env.development` for Convex CLI |
| react-native-svg-transformer | Import SVG as components |
| `@expo/config` (dev) | TypeScript types for `app.config.ts` (version aligned with Expo SDK) |
