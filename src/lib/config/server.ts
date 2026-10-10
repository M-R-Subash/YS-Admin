import "server-only";
import { z } from "zod";
import { clientConfig } from "./client";

/**
 * Parses duration strings like "15m", "7d", "1h", "300s", or raw numbers.
 * Returns both milliseconds and seconds.
 */
export function parseDuration(
  value: string | number | undefined,
  defaultMs: number
): { ms: number; seconds: number } {
  if (value === undefined || value === null || value === "") {
    return { ms: defaultMs, seconds: Math.floor(defaultMs / 1000) };
  }
  if (typeof value === "number") {
    const ms = value < 1_000_000 ? value * 1000 : value;
    return { ms, seconds: Math.floor(ms / 1000) };
  }
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)?$/i);
  if (!match) {
    return { ms: defaultMs, seconds: Math.floor(defaultMs / 1000) };
  }
  const num = parseFloat(match[1]);
  const unit = (match[2] || "s").toLowerCase();
  let ms = num;
  switch (unit) {
    case "ms":
      ms = num;
      break;
    case "s":
      ms = num * 1000;
      break;
    case "m":
      ms = num * 60 * 1000;
      break;
    case "h":
      ms = num * 60 * 60 * 1000;
      break;
    case "d":
      ms = num * 24 * 60 * 60 * 1000;
      break;
    case "w":
      ms = num * 7 * 24 * 60 * 60 * 1000;
      break;
    default:
      ms = num * 1000;
  }
  return { ms, seconds: Math.floor(ms / 1000) };
}

/**
 * Server-Side Environment Schema
 *
 * Enforces strict backend validation for databases, secrets, auth providers,
 * rate limit thresholds, and background crons.
 *
 * Protected with "server-only" to guarantee zero secrets leak into client bundles.
 */
const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required"),
  DIRECT_URL: z
    .string()
    .optional(),

  // NextAuth & Session
  NEXTAUTH_URL: z
    .string()
    .url("NEXTAUTH_URL must be a valid URL")
    .default("http://localhost:3000"),
  NEXTAUTH_SECRET: z
    .string()
    .min(16, "NEXTAUTH_SECRET must be at least 16 characters for security"),
  NEXTAUTH_MAX_AGE: z
    .coerce
    .number()
    .default(7 * 24 * 60 * 60), // 7 days in seconds

  // Database Seed Credentials
  ADMIN_SEED_EMAIL: z
    .string()
    .email()
    .optional(),
  ADMIN_SEED_PASSWORD: z
    .string()
    .optional(),

  // JWT & Token Expiration Policies
  JWT_SECRET: z
    .string()
    .optional(),
  JWT_ACCESS_EXPIRY: z
    .string()
    .default("15m"),
  JWT_REFRESH_SECRET: z
    .string()
    .optional(),
  JWT_REFRESH_EXPIRY: z
    .string()
    .default("7d"),

  // Rate Limiting & Throttling
  THROTTLE_TTL: z
    .coerce
    .number()
    .min(1)
    .default(60), // 60 seconds
  THROTTLE_LIMIT: z
    .coerce
    .number()
    .min(1)
    .default(1000), // 1000 requests per TTL window
  RATE_LIMIT_LOGIN_WINDOW_SEC: z
    .coerce
    .number()
    .min(1)
    .default(300), // 5 minutes window
  RATE_LIMIT_LOGIN_MAX: z
    .coerce
    .number()
    .min(1)
    .default(10), // Max 10 attempts per window

  // Cloudinary Server Secret
  CLOUDINARY_API_SECRET: z
    .string()
    .min(1, "CLOUDINARY_API_SECRET is required"),

  // Security & Cryptographic Handshakes
  PREVIEW_SECRET: z
    .string()
    .min(16, "PREVIEW_SECRET must be at least 16 characters"),
  REVALIDATION_SECRET: z
    .string()
    .min(16, "REVALIDATION_SECRET must be at least 16 characters"),

  // Background Cron Publishing
  CRON_SECRET: z
    .string()
    .min(1, "CRON_SECRET is required"),
  CRON_ENABLED: z
    .preprocess((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") {
        return val.toLowerCase() === "true" || val === "1";
      }
      return true;
    }, z.boolean())
    .default(true),

  // Email & Newsletter Engine
  EMAIL_PROVIDER: z.string().min(1, "EMAIL_PROVIDER is required"),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().min(1, "EMAIL_FROM is required"),
  EMAIL_REPLY_TO: z.string().email("EMAIL_REPLY_TO must be a valid email address"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

const parsedServer = serverEnvSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_MAX_AGE: process.env.NEXTAUTH_MAX_AGE,
  ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL,
  ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY,
  THROTTLE_TTL: process.env.THROTTLE_TTL,
  THROTTLE_LIMIT: process.env.THROTTLE_LIMIT,
  RATE_LIMIT_LOGIN_WINDOW_SEC: process.env.RATE_LIMIT_LOGIN_WINDOW_SEC,
  RATE_LIMIT_LOGIN_MAX: process.env.RATE_LIMIT_LOGIN_MAX,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  PREVIEW_SECRET: process.env.PREVIEW_SECRET,
  REVALIDATION_SECRET: process.env.REVALIDATION_SECRET,
  CRON_SECRET: process.env.CRON_SECRET,
  CRON_ENABLED: process.env.CRON_ENABLED,
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
});

if (!parsedServer.success && process.env.SKIP_ENV_VALIDATION !== "true") {
  console.error(
    "\n=======================================================\n" +
    "❌ [Config:Server] CRITICAL: Invalid or missing server environment variables:\n" +
    JSON.stringify(parsedServer.error.flatten().fieldErrors, null, 2) +
    "\n=======================================================\n"
  );
}

const rawServer = parsedServer.success
  ? parsedServer.data
  : (process.env as unknown as ServerEnv);

// Resolve JWT configurations with fallbacks to NEXTAUTH_SECRET
const jwtSecret = rawServer.JWT_SECRET || rawServer.NEXTAUTH_SECRET || "";
const jwtRefreshSecret = rawServer.JWT_REFRESH_SECRET || rawServer.NEXTAUTH_SECRET || "";

const accessExpiryParsed = parseDuration(rawServer.JWT_ACCESS_EXPIRY, 15 * 60 * 1000);
const refreshExpiryParsed = parseDuration(rawServer.JWT_REFRESH_EXPIRY, 7 * 24 * 60 * 60 * 1000);

export const serverConfig = {
  ...clientConfig,
  database: {
    url: rawServer.DATABASE_URL,
    directUrl: rawServer.DIRECT_URL || rawServer.DATABASE_URL,
  },
  auth: {
    nextAuthUrl: rawServer.NEXTAUTH_URL,
    nextAuthSecret: rawServer.NEXTAUTH_SECRET,
    maxAge: Number(rawServer.NEXTAUTH_MAX_AGE),
    adminSeedEmail: rawServer.ADMIN_SEED_EMAIL,
    adminSeedPassword: rawServer.ADMIN_SEED_PASSWORD,
    jwt: {
      secret: jwtSecret,
      accessExpiry: rawServer.JWT_ACCESS_EXPIRY,
      accessExpirySeconds: accessExpiryParsed.seconds,
      accessExpiryMs: accessExpiryParsed.ms,
      refreshSecret: jwtRefreshSecret,
      refreshExpiry: rawServer.JWT_REFRESH_EXPIRY,
      refreshExpirySeconds: refreshExpiryParsed.seconds,
      refreshExpiryMs: refreshExpiryParsed.ms,
    },
  },
  rateLimit: {
    throttleTtl: Number(rawServer.THROTTLE_TTL),
    throttleLimit: Number(rawServer.THROTTLE_LIMIT),
    loginWindowSec: Number(rawServer.RATE_LIMIT_LOGIN_WINDOW_SEC),
    loginWindowMs: Number(rawServer.RATE_LIMIT_LOGIN_WINDOW_SEC) * 1000,
    loginMax: Number(rawServer.RATE_LIMIT_LOGIN_MAX),
  },
  cloudinary: {
    ...clientConfig.cloudinary,
    apiSecret: rawServer.CLOUDINARY_API_SECRET,
  },
  security: {
    previewSecret: rawServer.PREVIEW_SECRET,
    revalidationSecret: rawServer.REVALIDATION_SECRET,
  },
  cron: {
    secret: rawServer.CRON_SECRET,
    enabled: rawServer.CRON_ENABLED,
  },
  email: {
    provider: rawServer.EMAIL_PROVIDER,
    resendApiKey: rawServer.RESEND_API_KEY,
    from: rawServer.EMAIL_FROM,
    replyTo: rawServer.EMAIL_REPLY_TO,
    smtp: {
      host: rawServer.SMTP_HOST || "",
      port: Number(rawServer.SMTP_PORT) || 465,
      user: rawServer.SMTP_USER || "",
      pass: rawServer.SMTP_PASS || "",
    },
  },
} as const;

export type ServerConfigType = typeof serverConfig;
