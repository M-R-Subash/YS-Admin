import { clientConfig } from "./client";
import { serverConfig } from "./server";

export * from "./client";
export * from "./server";

/**
 * Enterprise Application Configuration
 *
 * Grouped, strictly typed configuration object matching the hire-api architecture standard.
 *
 * @example
 * import { config } from "@/lib/config";
 *
 * const dbUrl = config.database.url;
 * const loginLimit = config.rateLimit.loginMax;
 * const appTitle = config.app.name;
 */
export const config = serverConfig;
export default config;

/**
 * Backward compatibility alias for legacy code importing `env`
 */
export const env = {
  // Database
  DATABASE_URL: serverConfig.database.url,
  DIRECT_URL: serverConfig.database.directUrl,

  // Auth & Session
  NEXTAUTH_URL: serverConfig.auth.nextAuthUrl,
  NEXTAUTH_SECRET: serverConfig.auth.nextAuthSecret,
  NEXTAUTH_MAX_AGE: serverConfig.auth.maxAge,
  ADMIN_SEED_EMAIL: serverConfig.auth.adminSeedEmail,
  ADMIN_SEED_PASSWORD: serverConfig.auth.adminSeedPassword,

  // JWT Tokens
  JWT_SECRET: serverConfig.auth.jwt.secret,
  JWT_ACCESS_EXPIRY: serverConfig.auth.jwt.accessExpiry,
  JWT_REFRESH_SECRET: serverConfig.auth.jwt.refreshSecret,
  JWT_REFRESH_EXPIRY: serverConfig.auth.jwt.refreshExpiry,

  // Rate Limiting
  THROTTLE_TTL: serverConfig.rateLimit.throttleTtl,
  THROTTLE_LIMIT: serverConfig.rateLimit.throttleLimit,
  RATE_LIMIT_LOGIN_WINDOW_SEC: serverConfig.rateLimit.loginWindowSec,
  RATE_LIMIT_LOGIN_MAX: serverConfig.rateLimit.loginMax,

  // App Metadata
  NODE_ENV: clientConfig.nodeEnv,
  NEXT_PUBLIC_APP_NAME: clientConfig.app.name,
  NEXT_PUBLIC_APP_DESCRIPTION: clientConfig.app.description,
  NEXT_PUBLIC_APP_VERSION: clientConfig.app.version,
  NEXT_PUBLIC_FRONTEND_URL: clientConfig.app.frontendUrl,

  // Media (Cloudinary)
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: clientConfig.cloudinary.cloudName,
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: clientConfig.cloudinary.uploadPreset,
  NEXT_PUBLIC_CLOUDINARY_API_KEY: clientConfig.cloudinary.apiKey,
  CLOUDINARY_API_SECRET: serverConfig.cloudinary.apiSecret,

  // Security Handshakes
  PREVIEW_SECRET: serverConfig.security.previewSecret,
  REVALIDATION_SECRET: serverConfig.security.revalidationSecret,

  // Cron Publishing
  CRON_SECRET: serverConfig.cron.secret,
  CRON_ENABLED: serverConfig.cron.enabled,
} as const;
