import { z } from "zod";

// Base Canonical SEO Metadata Schema (Validates the SEO object stored in Prisma SeoMeta)
export const seoMetadataSchema = z.object({
  id: z.string().optional(),
  metaTitle: z
    .string()
    .max(70, "Meta Title should ideally not exceed 70 characters")
    .optional()
    .nullable(),
  metaDesc: z
    .string()
    .max(170, "Meta Description should ideally not exceed 170 characters")
    .optional()
    .nullable(),
  focusKeyword: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  ogTitle: z.string().optional().nullable(),
  ogDesc: z.string().optional().nullable(),
  canonicalUrl: z
    .string()
    .url("Must be a valid absolute URL (e.g. https://example.com/page)")
    .optional()
    .nullable()
    .or(z.literal("")),
  structuredData: z
    .any()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      if (typeof val === "object") return true;
      if (typeof val === "string") {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }, "Must be valid JSON"),
  noIndex: z.boolean().default(false),
  authorName: z.string().optional().nullable(),
  authorRole: z.string().optional().nullable(),
  authorDescription: z.string().optional().nullable(),

  // Audit results for future Python Semrush integration
  auditScore: z.number().int().min(0).max(100).optional().nullable(),
  auditReport: z.any().optional().nullable(),
  lastAuditedAt: z.string().optional().nullable(),
});

export type SeoMetadataSchemaType = z.infer<typeof seoMetadataSchema>;

// Universal Form Schema for Pages & Blogs Quick Edit & In-Editor Suite
export const universalSeoFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "URL Slug is required")
    .regex(/^[a-z0-9-\/_]+$/, "Slug can only contain lowercase letters, numbers, hyphens, and slashes"),
  
  metaTitle: z.string().max(70, "Meta Title should not exceed 70 characters").optional().nullable(),
  metaDesc: z.string().max(170, "Meta Description should not exceed 170 characters").optional().nullable(),
  focusKeyword: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  ogTitle: z.string().optional().nullable(),
  ogDesc: z.string().optional().nullable(),
  canonicalUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  structuredData: z
    .any()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      if (typeof val === "object") return true;
      if (typeof val === "string") {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }, "Must be valid JSON"),
  noIndex: z.boolean().default(false),

  // Entity specific optional fields
  allowComments: z.boolean().optional(),
  authorSelection: z.string().optional(),
  authorId: z.string().optional().nullable(),
  authorName: z.string().optional().nullable(),
  authorRole: z.string().optional().nullable(),
  authorDescription: z.string().optional().nullable(),
});

export type UniversalSeoFormData = z.infer<typeof universalSeoFormSchema>;
