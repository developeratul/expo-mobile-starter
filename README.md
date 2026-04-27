# Expo Mobile Starter

Opinionated starter for React Native apps: **Expo Router**, **NativeWind**, **React Native Reusables**, **Clerk** auth, and **Convex** backend with a minimal user profile and onboarding flow.

Derived from a production app; product-specific docs and branding were removed so you can rename and build your own app on top.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- Accounts: [Expo](https://expo.dev/), [Convex](https://convex.dev/), [Clerk](https://clerk.com/)

## First-time setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment files

Copy the example env and fill in values:

```bash
cp .env.example .env.development
```

| Variable | Where to get it |
|----------|-----------------|
| `EXPO_PUBLIC_CONVEX_URL` | Convex dashboard after `pnpm convex:dev` |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys |
| `CONVEX_DEPLOYMENT` | Shown when you run Convex dev, or project settings |
| `CLERK_WEBHOOK_SECRET` | Clerk → Webhooks → endpoint signing secret (also set in Convex dashboard for production) |
| `CLERK_FRONTEND_API_URL` | Clerk → JWT templates (Convex) → Issuer URL |

### 3. Convex + Clerk

- In Clerk, enable the **Convex** JWT template (or follow [Clerk + Convex](https://docs.convex.dev/auth/clerk)).
- Start Convex locally (pushes functions and gives you a deployment URL):

```bash
pnpm convex:dev
```

Add the printed `EXPO_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` to `.env.development` if not already set.

### 4. Run the app

```bash
pnpm dev
```

Then press `i` (iOS simulator), `a` (Android emulator), or `w` (web). [Expo Go](https://expo.dev/go) works for quick device testing.

**Note:** The `dev` script uses Unix-style env (`EXPO_NO_DOTENV=1`). On Windows, use Git Bash, WSL, or run `set EXPO_NO_DOTENV=1` then `pnpm exec expo start -c` in PowerShell.

## Customizing the app name

Search and replace (or rename manually):

| Location | What to change |
|----------|----------------|
| `package.json` | `name` |
| `app.config.ts` | `name`, `slug`, `scheme` |
| Splash / icons | `assets/images/` (`icon.png`, `splash.png`, `adaptive-icon.png`, etc.) |
| Welcome screen | `app/welcome.tsx` (title and tagline) |
| Clerk Dashboard | Allowed redirect / native URLs: include your app scheme (e.g. `expomobilestarter://`, Expo dev URLs) after you change `scheme` in `app.config.ts` |

## Project layout (short)

- `app/` — Expo Router screens (`(auth)`, `(onboarding)`, `(protected)`)
- `components/` — Shared UI (Reusables-based) and layout
- `features/` — Feature modules (e.g. `users`)
- `convex/` — Schema, HTTP routes, domain folders (`users/`, …)
- `providers/` — Clerk, Convex, auth routing
- `docs/TECH_STACK.md` — Dependencies and versions that match `package.json`

## Adding UI components

```bash
npx @react-native-reusables/cli@latest add [component-name]
```

## More documentation

- [Expo](https://docs.expo.dev/)
- [Convex](https://docs.convex.dev/)
- [Clerk Expo](https://clerk.com/docs/references/expo/overview)
- [NativeWind](https://www.nativewind.dev/)

## Optional: publish as a GitHub template

Create a new repo from this folder, then in GitHub: **Settings → General → Template repository**.
