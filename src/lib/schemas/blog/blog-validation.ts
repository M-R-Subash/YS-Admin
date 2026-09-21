import { z } from "zod";

export const blogFaqItemSchema = z.object({
  id: z.string().optional(),
  question: z.string(),
  answer: z.string(),
});

export type BlogFaqItem = z.infer<typeof blogFaqItemSchema>;

// Helper to verify if TipTap or HTML content has actual content
export function hasTipTapContent(val: any): boolean {
  if (!val) return false;
  if (typeof val === "string") {
    return val.replace(/<[^>]+>/g, "").trim().length > 0;
  }
  if (typeof val !== "object") return false;

  function traverse(node: any): boolean {
    if (!node) return false;
    if (typeof node.text === "string" && node.text.trim().length > 0) return true;
    if (node.type === "image" || node.type === "youtube") return true;
    if (Array.isArray(node.content)) {
      return node.content.some(traverse);
    }
    return false;
  }

  return traverse(val);
}

// 1. Permissive Draft Schema (allows saving incomplete work at any time)
export const blogDraftSchema = z.object({
  title: z.string().min(1, "Title is required to save a draft"),
  slug: z.string().min(1, "Slug is required"),
  featuredImage: z.string().nullable().optional(),
  allowComments: z.boolean().default(true),
  status: z.enum(["draft", "published"]).default("draft"),
  content: z.any().optional(),
  excerpt: z.string().max(400, "Excerpt should not exceed 400 characters").optional().default(""),
  readingTime: z.number().optional(),
  tags: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  metaTitle: z.string().max(70, "Meta Title should not exceed 70 characters").optional().default(""),
  metaDesc: z.string().max(170, "Meta Description should not exceed 170 characters").optional().default(""),
  focusKeyword: z.string().optional().default(""),
  ogImage: z.string().optional().default(""),
  ogTitle: z.string().max(70, "OG Title should not exceed 70 characters").optional().default(""),
  ogDesc: z.string().max(200, "OG Description should not exceed 200 characters").optional().default(""),
  canonicalUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  noIndex: z.boolean().default(false),
  faqs: z.array(blogFaqItemSchema).default([]),
  action: z.enum(["save-draft", "publish", "discard-draft"]).optional(),
});

export type BlogDraftFormData = z.infer<typeof blogDraftSchema>;

// 2. Strict Publish Schema (enforces all requirements before live publication)
export const blogPublishSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(150, "Title cannot exceed 150 characters"),
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(120, "Slug cannot exceed 120 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must only contain lowercase alphanumeric characters and hyphens without leading or trailing dashes"
    ),
  featuredImage: z
    .string()
    .trim()
    .min(1, "A featured cover image is required to publish live"),
  allowComments: z.boolean().default(true),
  status: z.literal("published").default("published"),
  content: z
    .any()
    .refine(hasTipTapContent, "Article content cannot be empty before publishing"),
  excerpt: z.string().max(400, "Excerpt cannot exceed 400 characters").optional().default(""),
  readingTime: z.number().optional(),
  tags: z.array(z.string()).default([]),
  categories: z
    .array(z.string())
    .min(1, "Please select or add at least one category before publishing"),
  metaTitle: z.string().max(70, "Meta Title should not exceed 70 characters").optional().default(""),
  metaDesc: z.string().max(170, "Meta Description should not exceed 170 characters").optional().default(""),
  focusKeyword: z.string().optional().default(""),
  ogImage: z.string().optional().default(""),
  ogTitle: z.string().max(70, "OG Title should not exceed 70 characters").optional().default(""),
  ogDesc: z.string().max(200, "OG Description should not exceed 200 characters").optional().default(""),
  canonicalUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  noIndex: z.boolean().default(false),
  faqs: z
    .array(
      blogFaqItemSchema.refine(
        (f) => {
          const hasQ = f.question.trim().length > 0;
          const hasA = f.answer.trim().length > 0;
          return (hasQ && hasA) || (!hasQ && !hasA);
        },
        { message: "Both Question and Answer are required for each FAQ item" }
      )
    )
    .default([]),
  action: z.enum(["save-draft", "publish", "discard-draft"]).optional(),
});

export type BlogPublishFormData = z.infer<typeof blogPublishSchema>;

// Unified Form Data type (used by React Hook Form)
export interface BlogFormData {
  title: string;
  slug: string;
  featuredImage: string | null;
  allowComments: boolean;
  status: "draft" | "published";
  content: any;
  excerpt: string;
  readingTime?: number;
  tags: string[];
  categories: string[];
  metaTitle: string;
  metaDesc: string;
  focusKeyword: string;
  ogImage: string;
  ogTitle: string;
  ogDesc: string;
  canonicalUrl: string;
  noIndex: boolean;
  faqs: BlogFaqItem[];
}
