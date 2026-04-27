const z = require('zod');

const path = require('path');
const APP_ENV = process.env.APP_ENV ?? 'development';
const envPath = path.resolve(__dirname, `.env.${APP_ENV}`);

require('dotenv').config({
  path: envPath,
});

// Client-side environment variables (exposed to Expo app)
const client = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']),
  EXPO_PUBLIC_CONVEX_URL: z.url(),
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
});

// Build-time environment variables
const buildTime = z.object({
  CONVEX_DEPLOYMENT: z.string(),
});

// Server-side secrets (used by Convex functions, not validated here)
// These should be set in:
// 1. .env.development (for local Convex dev)
// 2. Convex Dashboard → Settings → Environment Variables (for production)
// Required: CLERK_WEBHOOK_SECRET

/**
 * @type {Record<keyof z.infer<typeof client> , string | undefined>}
 */
const _clientEnv = {
  APP_ENV,
  EXPO_PUBLIC_CONVEX_URL: process.env.EXPO_PUBLIC_CONVEX_URL,
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
};

/**
 * @type {Record<keyof z.infer<typeof buildTime> , string | undefined>}
 */
const _buildTimeEnv = {
  CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
};

const _env = {
  ..._clientEnv,
  ..._buildTimeEnv,
};

const merged = buildTime.merge(client);
const parsed = merged.safeParse(_env);

if (parsed.success === false) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors,

    `\n❌ Missing variables in .env.${APP_ENV} file, Make sure all required variables are defined in the .env.${APP_ENV} file.`,
    `\n💡 Tip: If you recently updated the .env.${APP_ENV} file and the error still persists, try restarting the server with the -cc flag to clear the cache.`
  );
  throw new Error(
    "Invalid environment variables, Check terminal for more details "
  );
}

const ClientEnv = client.parse(_clientEnv);

module.exports = {
  ClientEnv,
};
