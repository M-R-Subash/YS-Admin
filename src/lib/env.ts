import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXT_PUBLIC_FRONTEND_URL: z.string().url().default("http://localhost:3001"),
  NEXT_PUBLIC_APP_NAME: z.string().default("YS CMS Admin"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1, "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is required"),
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: z.string().min(1, "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is required"),
  NEXT_PUBLIC_CLOUDINARY_API_KEY: z.string().min(1, "NEXT_PUBLIC_CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
  PREVIEW_SECRET: z.string().min(1, "PREVIEW_SECRET is required"),
  NEXT_PUBLIC_PREVIEW_SECRET: z.string().min(1, "NEXT_PUBLIC_PREVIEW_SECRET is required"),
  REVALIDATION_SECRET: z.string().min(1, "REVALIDATION_SECRET is required"),
});

const _env = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  NEXT_PUBLIC_CLOUDINARY_API_KEY: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  PREVIEW_SECRET: process.env.PREVIEW_SECRET,
  NEXT_PUBLIC_PREVIEW_SECRET: process.env.NEXT_PUBLIC_PREVIEW_SECRET,
  REVALIDATION_SECRET: process.env.REVALIDATION_SECRET,
});

if (!_env.success && process.env.SKIP_ENV_VALIDATION !== "true") {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(_env.error.flatten().fieldErrors, null, 2)
  );
}

export const env = _env.success ? _env.data : (process.env as unknown as z.infer<typeof envSchema>);
