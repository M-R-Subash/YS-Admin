import { z } from "zod";
import { homepageSchema } from "./homepage/homepage-validation";
import { careersSchema } from "./careers/careers-validation";
import { contactSchema } from "./contact/contact-validation";
import { servicesSchema } from "./services/services-validation";

/**
 * Normalizes a raw page slug into standard leading-slash URL path format.
 * Examples:
 *   "" -> "/"
 *   undefined -> "/"
 *   "careers" -> "/careers"
 *   "/careers/" -> "/careers"
 */
export function normalizePageSlug(rawSlug: string | undefined | null): string {
  if (!rawSlug) return "/";
  const trimmed = rawSlug.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "") return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * Registry of core static page schemas mapped to their canonical slugs.
 */
export const PAGE_SCHEMA_REGISTRY: Record<string, z.ZodTypeAny> = {
  "/": homepageSchema,
  "/careers": careersSchema,
  "/contact": contactSchema,
  "/services/digital-marketing": servicesSchema,
};

/**
 * Resolves the appropriate Zod schema for a given page slug.
 *
 * Routing rules:
 * - "/" -> homepageSchema
 * - "/careers" -> careersSchema
 * - "/contact" -> contactSchema
 * - "/services/*" or other dynamic pages -> servicesSchema (standard flexible section schema)
 */
export function getPageZodSchema(rawSlug: string | undefined | null): z.ZodTypeAny {
  const slug = normalizePageSlug(rawSlug);

  if (PAGE_SCHEMA_REGISTRY[slug]) {
    return PAGE_SCHEMA_REGISTRY[slug];
  }

  // Fallback for /services/* or any custom pages
  return servicesSchema;
}

