import { z } from "zod";
import { urlZodSchema, imageSchema, buttonTextSchema, FieldSchema } from "@/lib/schemas/global-schema";

export const footerZodSchema = z.object({
  // CTA Banner Section
  cta: z.object({
    title: z.string().optional(),
    button: urlZodSchema,
    image: imageSchema,
  }).optional(),

  // Shared Social Links (CTA banner + footer bottom bar)
  socialLinks: z.array(
    urlZodSchema.unwrap() // unwrap the .optional() to get the inner object
  ).optional(),

  // Newsletter Section
  newsletter: z.object({
    title: z.string().optional(),
    highlight: z.string().optional(),
  }).optional(),

  // Link Columns (Resources, Services, etc.)
  columns: z.array(
    z.object({
      title: buttonTextSchema,
      links: z.array(
        urlZodSchema.unwrap()
      ).optional(),
    })
  ).optional(),

  // Contact Info
  contact: z.object({
    address: urlZodSchema,
    phone: urlZodSchema,
    email: urlZodSchema,
  }).optional(),

  // Background Image
  backgroundImage: imageSchema,

  // Bottom Bar
  copyright: z.string().optional(),
  policyLinks: z.array(
    urlZodSchema.unwrap()
  ).optional(),
});

// --- UI SCHEMA ---

export const footerUiSchema: FieldSchema[] = [
  {
    name: "cta",
    label: "CTA Banner",
    type: "object",
    description: "The call-to-action banner that overlaps into the footer.",
    fields: [
      { name: "title", label: "Title", type: "text", placeholder: "e.g. Let's Build Future Together." },
      { name: "button", label: "CTA Button", type: "url" },
      { name: "image", label: "Banner Image", type: "image" },
    ],
  },
  {
    name: "socialLinks",
    label: "Social Links",
    type: "footer-columns",
    description: "Shared social links displayed in both the CTA banner and footer bottom bar. Use platform name as link text (e.g. facebook, x, instagram, linkedin).",
  },
  {
    name: "newsletter",
    label: "Newsletter Section",
    type: "object",
    description: "The newsletter subscription section title.",
    fields: [
      { name: "title", label: "Title", type: "text", placeholder: "e.g. Subscribe to Our" },
      { name: "highlight", label: "Highlighted Word", type: "text", placeholder: "e.g. Newsletter" },
    ],
  },
  {
    name: "columns",
    label: "Footer Link Columns",
    type: "footer-columns",
    description: "Link columns like Resources, Services. Add or remove columns and their links.",
  },
  {
    name: "contact",
    label: "Contact Information",
    type: "object",
    description: "Contact details displayed in the footer.",
    fields: [
      { name: "address", label: "Address", type: "url" },
      { name: "phone", label: "Phone", type: "url" },
      { name: "email", label: "Email", type: "url" },
    ],
  },
  {
    name: "backgroundImage",
    label: "Footer Background Image",
    type: "image",
    description: "The background texture/image for the footer section.",
  },
  {
    name: "copyright",
    label: "Copyright Text",
    type: "text",
    placeholder: "e.g. YSInnovations © 2026. All right reserved.",
  },
  {
    name: "policyLinks",
    label: "Policy Links",
    type: "footer-columns",
    description: "Bottom bar links like Privacy & Policy, Terms & Condition.",
  },
];

// --- DEFAULT DATA ---

