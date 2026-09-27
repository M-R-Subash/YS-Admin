import { z } from "zod";

/**
 * Client-Side Environment Schema
 *
 * ONLY variables prefixed with NEXT_PUBLIC_ (plus NODE_ENV) are permitted here.
 * These variables are safely embedded into the JavaScript browser bundle during compilation.
 * 
 * Under NO circumstances should any private credentials, database URLs,
 * or API secrets be added to this file.
 */
const clientEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_NAME: z
    .string()
    .min(1, "NEXT_PUBLIC_APP_NAME is required")
    .default("YS CMS Admin"),
  NEXT_PUBLIC_APP_DESCRIPTION: z
    .string()
    .default("Enterprise Content Management System & Headless Studio"),
  NEXT_PUBLIC_APP_VERSION: z
    .string()
    .default("1.0.0"),
  NEXT_PUBLIC_FRONTEND_URL: z
    .string()
    .url("NEXT_PUBLIC_FRONTEND_URL must be a valid URL")
    .default("http://localhost:3001"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z
    .string()
    .min(1, "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is required"),
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: z
    .string()
    .min(1, "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is required"),
  NEXT_PUBLIC_CLOUDINARY_API_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_CLOUDINARY_API_KEY is required"),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

const parsedClient = clientEnvSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  NEXT_PUBLIC_CLOUDINARY_API_KEY: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
});

if (!parsedClient.success && process.env.SKIP_ENV_VALIDATION !== "true") {
  console.error(
    "❌ [Config:Client] Invalid client-safe environment variables:",
    JSON.stringify(parsedClient.error.flatten().fieldErrors, null, 2)
  );
}

const raw = parsedClient.success
  ? parsedClient.data
  : (process.env as unknown as ClientEnv);

export const clientConfig = {
  nodeEnv: raw.NODE_ENV || "development",
  isProduction: raw.NODE_ENV === "production",
  isDevelopment: raw.NODE_ENV !== "production" && raw.NODE_ENV !== "test",
  isTest: raw.NODE_ENV === "test",
  app: {
    name: raw.NEXT_PUBLIC_APP_NAME || "YS CMS Admin",
    description: raw.NEXT_PUBLIC_APP_DESCRIPTION || "Enterprise Content Management System & Headless Studio",
    version: raw.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    frontendUrl: raw.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3001",
  },
  cloudinary: {
    cloudName: raw.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
    uploadPreset: raw.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "",
    apiKey: raw.NEXT_PUBLIC_CLOUDINARY_API_KEY || "",
  },
} as const;

export type ClientConfigType = typeof clientConfig;
