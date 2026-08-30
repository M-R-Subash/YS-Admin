import { z } from "zod";

export const seoQuickEditSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  
  metaTitle: z.string().max(60, "Meta Title should not exceed 60 characters").optional().nullable(),
  metaDesc: z.string().max(160, "Meta Description should not exceed 160 characters").optional().nullable(),
  focusKeyword: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  
  ogTitle: z.string().optional().nullable(),
  ogDesc: z.string().optional().nullable(),
  canonicalUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  structuredData: z.string().optional().nullable().refine((val) => {
    if (!val) return true;
    try {
      JSON.parse(val);
      return true;
    } catch (e) {
      return false;
    }
  }, "Must be valid JSON"),
  
  noIndex: z.boolean().default(false),
});

export type SeoQuickEditFormData = z.infer<typeof seoQuickEditSchema>;

export const blogQuickEditSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  allowComments: z.boolean().default(true),

  metaTitle: z.string().max(60, "Meta Title should not exceed 60 characters").optional().nullable(),
  metaDesc: z.string().max(160, "Meta Description should not exceed 160 characters").optional().nullable(),
  focusKeyword: z.string().optional().nullable(),
  canonicalUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  noIndex: z.boolean().default(false),
  
  // Author fields
  authorSelection: z.string().optional(),
  authorId: z.string().optional().nullable(),
  authorName: z.string().optional().nullable(),
  authorRole: z.string().optional().nullable(),
  authorDescription: z.string().optional().nullable(),
});

export type BlogQuickEditFormData = z.infer<typeof blogQuickEditSchema>;

// Keep backward compat alias
export const blogSeoQuickEditSchema = blogQuickEditSchema;
export type BlogSeoQuickEditFormData = BlogQuickEditFormData;
