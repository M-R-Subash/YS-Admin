import { z } from "zod";

export type FieldType = "text" | "textarea" | "url" | "array" | "object" | "accordion" | "image" | "tags" | "menu-builder" | "footer-columns";

export interface FieldSchema {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  fields?: FieldSchema[]; // For 'array' and 'object' types
}

export const linkSchema = z.string().optional().refine(val => {
  if (!val || val.trim() === "") return true;
  return val.startsWith("#") || 
         val.startsWith("https://") || 
         val.startsWith("http://") || 
         val.startsWith("/") ||
         val.startsWith("mailto:") ||
         val.startsWith("tel:");
}, {
  message: "Link must start with https://, http://, /, #, mailto:, or tel:",
}).transform(val => {
  if (!val || val.trim() === "") return "#";
  return val;
});

export const imageSchema = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      return { url: val };
    }
    return val;
  },
  z.object({
    url: z.string().url().or(z.literal("")),
    alt: z.string().optional(),
    title: z.string().optional()
  }).optional()
);

export const buttonTextSchema = z.string().optional().refine(val => {
  if (!val || val.trim() === "") return true; // Allow empty
  return val.trim().length >= 2;
}, {
  message: "Button text must be at least 2 characters",
});

export const urlZodSchema = z.object({
  text: buttonTextSchema,
  url: linkSchema,
  newTab: z.boolean().default(false),
  noFollow: z.boolean().default(false)
}).optional();

// --- UI SCHEMAS ---

export const urlUiSchema = [
  { name: "text", label: "Link Text", type: "text" as const, placeholder: "e.g. Learn More" },
  { name: "url", label: "Link URL", type: "text" as const, placeholder: "https://..." },
  { name: "newTab", label: "Open in new tab", type: "checkbox" as const },
  { name: "noFollow", label: "No Follow", type: "checkbox" as const }
];
